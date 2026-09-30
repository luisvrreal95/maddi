// Un admin resuelve una disputa de instalación.
// body: { bookingId, resolution: "release" | "refund" | "split", refundAmount?: number (MXN, para "split") }
//   release → se libera el pago al propietario.
//   refund  → se reembolsa al anunciante todo lo no liberado y se cancela la reserva.
//   split   → se reembolsa refundAmount; el resto se libera al propietario.
import { corsFor, getServiceClient, getStripe, HttpError, json, requireUser, toCents } from "../_shared/stripe.ts";
import { freeBlockedDates, sendEmail, settleBooking } from "../_shared/payouts.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsFor(req) });
  try {
    const admin = getServiceClient();
    const stripe = getStripe();
    const user = await requireUser(req, admin);

    const { data: isAdmin } = await admin.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
    if (!isAdmin) throw new HttpError(403, "Solo administradores");

    const { bookingId, resolution, refundAmount } = await req.json().catch(() => ({}));
    if (!["release", "refund", "split"].includes(resolution)) throw new HttpError(400, "Resolución inválida");

    const { data: b } = await admin.from("bookings")
      .select("id, business_id, billboard_id, start_date, end_date, installation_status")
      .eq("id", bookingId).maybeSingle();
    if (!b) throw new HttpError(404, "Reserva no encontrada");
    if (b.installation_status !== "disputed") throw new HttpError(409, "La reserva no tiene una disputa abierta");

    const { data: bb } = await admin.from("billboards").select("owner_id, title").eq("id", b.billboard_id).single();
    const { data: scheduled } = await admin.from("booking_payouts").select("gross_cents")
      .eq("booking_id", b.id).eq("status", "scheduled");
    const pending = (scheduled ?? []).reduce((s, p) => s + p.gross_cents, 0);

    const base = { billboardTitle: bb?.title ?? "Espectacular", startDate: b.start_date, endDate: b.end_date, bookingId: b.id };
    let refundedCents = 0;

    if (resolution === "release") {
      await admin.rpc("confirm_installation_internal", { _booking_id: b.id, _by: "admin" });
    } else {
      let refund = pending;
      if (resolution === "split") {
        refund = toCents(Number(refundAmount));
        if (!Number.isFinite(refund) || refund <= 0 || refund >= pending) {
          throw new HttpError(400, `El reembolso parcial debe ser mayor a 0 y menor a $${(pending / 100).toFixed(2)} MXN`);
        }
      }
      ({ refundedCents } = await settleBooking(admin, stripe, b.id, refund, { reason: `dispute_${resolution}` }));
      if (resolution === "refund") {
        await admin.from("bookings").update({
          status: "cancelled", cancel_reason: "dispute_refund", cancelled_at: new Date().toISOString(), cancelled_by: user.id,
        }).eq("id", b.id);
        await freeBlockedDates(admin, b.id, b.billboard_id);
      } else {
        await admin.rpc("confirm_installation_internal", { _booking_id: b.id, _by: "admin" });
      }
    }

    await admin.from("bookings").update({
      dispute_resolution: resolution === "split" ? `split:${refundedCents / 100}` : resolution,
    }).eq("id", b.id);

    const outcome = resolution === "release" ? "a favor del propietario"
      : resolution === "refund" ? "con reembolso total" : `con reembolso parcial de $${(refundedCents / 100).toFixed(2)} MXN`;
    await sendEmail("dispute_resolved", b.business_id, b.id, { ...base, outcome });
    await sendEmail("dispute_resolved", bb?.owner_id, b.id, { ...base, outcome });

    return json(req, { ok: true, refunded: refundedCents / 100 });
  } catch (err) {
    if (err instanceof HttpError) return json(req, { error: err.message }, err.status);
    console.error("resolve-dispute error:", err);
    return json(req, { error: "No se pudo resolver la disputa" }, 500);
  }
});
