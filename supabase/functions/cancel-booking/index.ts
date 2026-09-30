// Cancela una reserva aprobada (anunciante o propietario) y aplica la política de reembolso.
//  - Sin pago: solo se cancela y se liberan las fechas.
//  - Anunciante (pagada): antes del inicio >14 d 100 %, 3–14 d 50 %, <3 d 0 %; ya iniciada: periodos futuros.
//  - Propietario (pagada): reembolso total de lo no liberado.
// body: { bookingId: string, reason?: string }
import { corsFor, getServiceClient, getStripe, HttpError, json, requireUser } from "../_shared/stripe.ts";
import { freeBlockedDates, sendEmail, settleBooking } from "../_shared/payouts.ts";
import { advertiserRefundCents, todayMx } from "../_shared/payout-math.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsFor(req) });
  try {
    const admin = getServiceClient();
    const stripe = getStripe();
    const user = await requireUser(req, admin);
    const { bookingId, reason } = await req.json().catch(() => ({}));
    if (!bookingId || typeof bookingId !== "string") throw new HttpError(400, "bookingId requerido");

    const { data: b } = await admin.from("bookings")
      .select("id, business_id, billboard_id, start_date, end_date, status, total_price").eq("id", bookingId).maybeSingle();
    if (!b) throw new HttpError(404, "Reserva no encontrada");
    const { data: bb } = await admin.from("billboards").select("owner_id, title").eq("id", b.billboard_id).single();

    const role = b.business_id === user.id ? "advertiser" : bb?.owner_id === user.id ? "owner" : null;
    if (!role) throw new HttpError(404, "Reserva no encontrada");
    if (b.status !== "approved") throw new HttpError(409, "Solo se pueden cancelar reservas aprobadas desde aquí");

    const today = todayMx();
    if (b.end_date < today) throw new HttpError(409, "La campaña ya terminó");

    const { data: c } = await admin.from("platform_commissions")
      .select("payment_status, stripe_checkout_session_id").eq("booking_id", b.id).maybeSingle();
    const paid = c?.payment_status === "paid";

    let refundedCents = 0;
    let retainedCents = 0;
    if (paid) {
      const { data: scheduled } = await admin.from("booking_payouts")
        .select("gross_cents, period_start").eq("booking_id", b.id).eq("status", "scheduled");
      const sched = (scheduled ?? []).map((p) => ({ grossCents: p.gross_cents, periodStart: p.period_start }));
      const total = sched.reduce((s, p) => s + p.grossCents, 0);
      const refund = role === "owner" ? total : advertiserRefundCents(sched, b.start_date, today).refundCents;
      ({ refundedCents, retainedCents } = await settleBooking(admin, stripe, b.id, refund, { reason: `${role}_cancelled` }));
    } else if (c?.stripe_checkout_session_id) {
      await stripe.checkout.sessions.expire(c.stripe_checkout_session_id).catch(() => {});
    }

    const { error } = await admin.from("bookings").update({
      status: "cancelled",
      cancel_reason: `${role}_cancelled${reason ? `: ${String(reason).slice(0, 300)}` : ""}`,
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
    }).eq("id", b.id);
    if (error) throw error;
    await freeBlockedDates(admin, b.id, b.billboard_id);

    const base = { billboardTitle: bb?.title ?? "Espectacular", startDate: b.start_date, endDate: b.end_date, bookingId: b.id };
    const other = role === "advertiser" ? bb?.owner_id : b.business_id;
    await sendEmail("booking_cancelled", other, b.id, {
      ...base, recipientRole: role === "advertiser" ? "owner" : "business",
      cancelledBy: role === "advertiser" ? "el anunciante" : "el propietario",
      reason: reason ? String(reason).slice(0, 300) : "",
    });
    if (refundedCents > 0) {
      await sendEmail("booking_refunded", b.business_id, b.id, { ...base, amount: (refundedCents / 100).toFixed(2) });
    }

    return json(req, { ok: true, refunded: refundedCents / 100, retained: retainedCents / 100 });
  } catch (err) {
    if (err instanceof HttpError) return json(req, { error: err.message }, err.status);
    console.error("cancel-booking error:", err);
    return json(req, { error: "No se pudo cancelar la reserva" }, 500);
  }
});
