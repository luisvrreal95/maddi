import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, json, getStripe, adminClient, requireUser } from "../_shared/stripe.ts";

// approve / reject: el propietario captura el cobro o libera la retención.
// cancel: el anunciante cancela una solicitud pendiente (se libera la tarjeta, sin cobro).
// refund: el propietario cancela una campaña ya cobrada y se reembolsa todo al anunciante.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "No autenticado" }, 401);
    const { booking_id, action } = await req.json();
    if (!booking_id || !["approve", "reject", "cancel", "refund"].includes(action)) return json({ error: "Parámetros inválidos" }, 400);

    const db = adminClient();
    const { data: booking } = await db.from("bookings").select("*").eq("id", booking_id).maybeSingle();
    if (!booking) return json({ error: "Reserva no encontrada" }, 404);
    const { data: billboard } = await db.from("billboards").select("owner_id").eq("id", booking.billboard_id).maybeSingle();
    const stripe = getStripe();
    const piId = booking.stripe_payment_intent_id as string | null;

    if (action === "cancel") {
      if (booking.business_id !== user.id) return json({ error: "No autorizado" }, 403);
      if (booking.status !== "pending") return json({ error: "Solo se pueden cancelar solicitudes pendientes. Escribe al propietario." }, 409);
      if (piId && booking.payment_status === "authorized") { try { await stripe.paymentIntents.cancel(piId); } catch (e) { console.error(e); } }
      await db.from("bookings").update({ status: "cancelled", payment_status: piId ? "canceled" : booking.payment_status }).eq("id", booking.id);
      return json({ ok: true });
    }

    if (billboard?.owner_id !== user.id) return json({ error: "No autorizado" }, 403);

    if (action === "refund") {
      if (booking.status !== "approved") return json({ error: "Solo se puede reembolsar una campaña aprobada" }, 409);
      if (!piId || booking.payment_status !== "captured") return json({ error: "Esta reserva no tiene un cobro en Maddi para reembolsar" }, 409);
      try {
        if (booking.payment_model === "separate") {
          // si ya se le pagó al propietario, primero se revierte esa transferencia
          if (booking.stripe_transfer_id) await stripe.transfers.createReversal(booking.stripe_transfer_id);
          await stripe.refunds.create({ payment_intent: piId });
        } else {
          // modelo anterior: se revierte la transferencia al propietario y la comisión de Maddi
          await stripe.refunds.create({ payment_intent: piId, reverse_transfer: true, refund_application_fee: true });
        }
      } catch (e) {
        return json({ error: "No se pudo reembolsar: " + (e as Error).message }, 402);
      }
      await db.from("bookings").update({ status: "cancelled", payment_status: "refunded", payout_status: "refunded" }).eq("id", booking.id);
      // libera el calendario
      await db.from("blocked_dates").delete().eq("billboard_id", booking.billboard_id).eq("reason", `Campaña aprobada #${String(booking.id).slice(0, 8)}`);
      return json({ ok: true });
    }

    if (booking.status !== "pending") return json({ error: "La reserva ya fue respondida" }, 409);

    if (action === "reject") {
      if (piId && booking.payment_status !== "none") { try { await stripe.paymentIntents.cancel(piId); } catch (e) { console.error(e); } }
      await db.from("bookings").update({ status: "rejected", payment_status: piId ? "canceled" : booking.payment_status }).eq("id", booking.id);
      return json({ ok: true });
    }

    // approve
    if (piId && booking.payment_status !== "authorized") return json({ error: "El pago aún no está autorizado" }, 409);
    if (piId && booking.payment_expires_at && new Date(booking.payment_expires_at) < new Date()) {
      return json({ error: "La retención del pago expiró. Pide al anunciante que vuelva a solicitar." }, 410);
    }

    // 1) aprobar (el trigger de la base de datos rechaza empalmes)
    const { error: upErr } = await db.from("bookings").update({ status: "approved" }).eq("id", booking.id);
    if (upErr) return json({ error: upErr.message }, 409);

    // 2) capturar el cobro; si falla, revertir la aprobación
    if (piId) {
      try {
        await stripe.paymentIntents.capture(piId);
        await db.from("bookings").update({
          payment_status: "captured",
          // con el modelo nuevo el dinero queda en Maddi hasta validar la instalación
          payout_status: booking.payment_model === "separate" ? "awaiting_evidence" : "released",
        }).eq("id", booking.id);
      } catch (e) {
        await db.from("bookings").update({ status: "pending" }).eq("id", booking.id);
        return json({ error: "No se pudo cobrar la tarjeta: " + (e as Error).message }, 402);
      }
    }
    return json({ ok: true });
  } catch (e) {
    console.error("stripe-booking-action", e);
    return json({ error: (e as Error).message }, 500);
  }
});
