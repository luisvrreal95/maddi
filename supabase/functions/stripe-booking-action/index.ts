import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, json, getStripe, adminClient, requireUser } from "../_shared/stripe.ts";

// El propietario aprueba (captura el cobro) o rechaza (libera la retención) una reserva con pago en Maddi.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "No autenticado" }, 401);
    const { booking_id, action } = await req.json();
    if (!booking_id || !["approve", "reject"].includes(action)) return json({ error: "Parámetros inválidos" }, 400);

    const db = adminClient();
    const { data: booking } = await db.from("bookings").select("*").eq("id", booking_id).maybeSingle();
    if (!booking) return json({ error: "Reserva no encontrada" }, 404);
    const { data: billboard } = await db.from("billboards").select("owner_id").eq("id", booking.billboard_id).maybeSingle();
    if (billboard?.owner_id !== user.id) return json({ error: "No autorizado" }, 403);
    if (booking.status !== "pending") return json({ error: "La reserva ya fue respondida" }, 409);

    const stripe = getStripe();
    const piId = booking.stripe_payment_intent_id as string | null;

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
        await db.from("bookings").update({ payment_status: "captured" }).eq("id", booking.id);
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
