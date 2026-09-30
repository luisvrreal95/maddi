// Tarea programada (pg_cron cada 15 min). Auth: header x-cron-secret (CRON_SECRET) o service role.
//  1. Expira reservas aprobadas sin pago a las 48 h.
//  2. Autoconfirma instalaciones sin objeción tras 48 h de subida la evidencia.
//  3. Marca instalaciones atrasadas (3 días después del inicio sin evidencia).
//  4. Transfiere al propietario los tramos que ya tocan.
import { getServiceClient, getStripe } from "../_shared/stripe.ts";
import { freeBlockedDates, notifyAdmins, releaseDuePayouts, sendEmail } from "../_shared/payouts.ts";
import { diffDays, todayMx } from "../_shared/payout-math.ts";

function authorized(req: Request): boolean {
  const cron = Deno.env.get("CRON_SECRET");
  if (cron && req.headers.get("x-cron-secret") === cron) return true;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return !!svc && req.headers.get("Authorization") === `Bearer ${svc}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });

  const admin = getServiceClient();
  const stripe = getStripe();
  const summary = { expired: 0, autoConfirmed: 0, overdue: 0, released: 0, failed: 0 };
  const nowIso = new Date().toISOString();

  // 1. Reservas sin pagar a tiempo
  const { data: unpaid } = await admin.from("bookings")
    .select("id, business_id, billboard_id, start_date, end_date")
    .eq("status", "approved").lt("payment_due_at", nowIso);
  for (const b of unpaid ?? []) {
    try {
      const { data: c } = await admin.from("platform_commissions")
        .select("payment_status, stripe_checkout_session_id").eq("booking_id", b.id).maybeSingle();
      if (c?.payment_status === "paid") continue;
      if (c?.stripe_checkout_session_id) {
        await stripe.checkout.sessions.expire(c.stripe_checkout_session_id).catch(() => {});
      }
      await admin.from("bookings").update({
        status: "cancelled", cancel_reason: "payment_expired", cancelled_at: nowIso,
      }).eq("id", b.id);
      await freeBlockedDates(admin, b.id, b.billboard_id);
      const { data: bb } = await admin.from("billboards").select("owner_id, title").eq("id", b.billboard_id).single();
      const data = { billboardTitle: bb?.title ?? "Espectacular", startDate: b.start_date, endDate: b.end_date, bookingId: b.id };
      await sendEmail("payment_expired", b.business_id, b.id, { ...data, recipientRole: "business" });
      await sendEmail("payment_expired", bb?.owner_id, b.id, { ...data, recipientRole: "owner" });
      summary.expired++;
    } catch (e) {
      console.error("expire booking failed", b.id, e);
    }
  }

  // 2. Autoconfirmación de instalaciones
  const { data: toConfirm } = await admin.from("bookings")
    .select("id, billboard_id, start_date")
    .eq("status", "approved").eq("installation_status", "submitted").lte("installation_deadline", nowIso);
  for (const b of toConfirm ?? []) {
    const { error } = await admin.rpc("confirm_installation_internal", { _booking_id: b.id, _by: "auto" });
    if (error) { console.error("auto-confirm failed", b.id, error); continue; }
    const { data: bb } = await admin.from("billboards").select("owner_id, title").eq("id", b.billboard_id).single();
    await sendEmail("installation_confirmed", bb?.owner_id, b.id, {
      billboardTitle: bb?.title ?? "Espectacular", startDate: b.start_date, bookingId: b.id, auto: true,
    });
    summary.autoConfirmed++;
  }

  // 3. Instalaciones atrasadas (pagadas, sin evidencia, 3+ días después del inicio)
  const today = todayMx();
  const { data: candidates } = await admin.from("bookings")
    .select("id, billboard_id, start_date")
    .eq("status", "approved").eq("installation_status", "pending").lte("start_date", today);
  for (const b of candidates ?? []) {
    if (diffDays(b.start_date, today) < 3) continue;
    const { data: c } = await admin.from("platform_commissions").select("payment_status").eq("booking_id", b.id).maybeSingle();
    if (c?.payment_status !== "paid") continue;
    await admin.from("bookings").update({ installation_status: "overdue" }).eq("id", b.id);
    const { data: bb } = await admin.from("billboards").select("owner_id, title").eq("id", b.billboard_id).single();
    await sendEmail("installation_overdue", bb?.owner_id, b.id, { billboardTitle: bb?.title ?? "Espectacular", bookingId: b.id });
    await notifyAdmins("installation_overdue", b.id, { billboardTitle: bb?.title ?? "Espectacular", bookingId: b.id });
    summary.overdue++;
  }

  // 4. Liberación de pagos
  const r = await releaseDuePayouts(admin, stripe);
  summary.released = r.released;
  summary.failed = r.failed;

  return new Response(JSON.stringify(summary), { headers: { "Content-Type": "application/json" } });
});
