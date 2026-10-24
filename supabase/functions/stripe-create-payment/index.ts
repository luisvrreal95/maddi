import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, json, getStripe, adminClient, requireUser, platformFeePercent } from "../_shared/stripe.ts";

// Crea la retención (PaymentIntent con captura manual) de una solicitud de reserva.
// La tarjeta se autoriza al solicitar; el cobro se captura cuando el propietario aprueba.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "No autenticado" }, 401);
    const { booking_id } = await req.json();
    if (!booking_id) return json({ error: "booking_id requerido" }, 400);

    const db = adminClient();
    const { data: booking } = await db.from("bookings").select("*").eq("id", booking_id).maybeSingle();
    if (!booking || booking.business_id !== user.id) return json({ error: "Reserva no encontrada" }, 404);
    if (booking.status !== "pending") return json({ error: "La reserva ya no está pendiente" }, 409);
    if (!["none", "requires_payment"].includes(booking.payment_status)) return json({ error: "La reserva ya tiene un pago en proceso" }, 409);

    const { data: billboard } = await db.from("billboards").select("owner_id, title").eq("id", booking.billboard_id).maybeSingle();
    const { data: owner } = await db.from("profiles").select("stripe_account_id, stripe_charges_enabled").eq("user_id", billboard?.owner_id).maybeSingle();
    if (!owner?.stripe_account_id || !owner.stripe_charges_enabled) return json({ error: "El propietario aún no puede recibir pagos en Maddi" }, 409);

    const amount = Math.round(Number(booking.total_price) * 100); // centavos MXN
    if (!(amount >= 1000)) return json({ error: "Monto inválido" }, 400);
    const fee = Math.round(amount * platformFeePercent() / 100);

    const stripe = getStripe();
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: "mxn",
      capture_method: "manual",
      automatic_payment_methods: { enabled: true },
      application_fee_amount: fee,
      transfer_data: { destination: owner.stripe_account_id },
      description: `Reserva Maddi: ${billboard?.title ?? booking.billboard_id}`,
      metadata: { booking_id: booking.id, billboard_id: booking.billboard_id },
    }, { idempotencyKey: `pi-${booking.id}` });

    await db.from("bookings").update({
      payment_status: "requires_payment",
      stripe_payment_intent_id: pi.id,
      platform_fee: fee / 100,
      owner_payout: (amount - fee) / 100,
      // las retenciones de tarjeta caducan a los 7 días
      payment_expires_at: new Date(Date.now() + 6.5 * 86400000).toISOString(),
    }).eq("id", booking.id);

    return json({ client_secret: pi.client_secret, publishable_key: Deno.env.get("STRIPE_PUBLISHABLE_KEY") });
  } catch (e) {
    console.error("stripe-create-payment", e);
    return json({ error: (e as Error).message }, 500);
  }
});
