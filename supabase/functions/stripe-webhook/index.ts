// Webhook de Stripe. Es la ÚNICA fuente de verdad del estado de pago.
// Al confirmarse el cobro programa los pagos al propietario (booking_payouts).
// Configurar en Stripe (endpoint de "Tu cuenta" y de "Cuentas conectadas"):
//   checkout.session.completed, checkout.session.async_payment_succeeded,
//   checkout.session.async_payment_failed, checkout.session.expired,
//   charge.refunded, account.updated
import Stripe from "https://esm.sh/stripe@17.7.0?target=denonext";
import { getServiceClient, getStripe } from "../_shared/stripe.ts";
import { schedulePayouts } from "../_shared/payouts.ts";

const admin = getServiceClient();

async function markPaid(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id ?? session.client_reference_id;
  if (!bookingId) return;
  const paymentIntent = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;

  let chargeId: string | null = null;
  if (paymentIntent) {
    const pi = await getStripe().paymentIntents.retrieve(paymentIntent);
    chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id ?? null;
  }

  const { data: updated } = await admin.from("platform_commissions").update({
    payment_status: "paid",
    payment_date: new Date().toISOString().split("T")[0],
    paid_at: new Date().toISOString(),
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntent,
    stripe_charge_id: chargeId,
  }).eq("booking_id", bookingId).neq("payment_status", "paid").select("id");

  // Solo la primera vez (Stripe reintenta webhooks).
  if (!updated?.length) return;

  // Carrera: el pago llegó cuando la reserva ya no estaba aprobada (expiró/cancelada) → reembolso total.
  const { data: b } = await admin.from("bookings").select("status, billboard_id").eq("id", bookingId).single();
  if (b?.status !== "approved" && paymentIntent) {
    await getStripe().refunds.create({ payment_intent: paymentIntent, metadata: { booking_id: bookingId, reason: "late_payment" } },
      { idempotencyKey: `late-refund-${bookingId}` });
    return;
  }

  await schedulePayouts(admin, bookingId);
  await notifyPaid(bookingId);
}

async function notifyPaid(bookingId: string) {
  try {
    const { data: b } = await admin.from("bookings")
      .select("id, business_id, billboard_id, start_date, end_date, total_price")
      .eq("id", bookingId).single();
    if (!b) return;
    const { data: bb } = await admin.from("billboards").select("title, owner_id").eq("id", b.billboard_id).single();
    const common = {
      billboardTitle: bb?.title ?? "Espectacular",
      startDate: b.start_date,
      endDate: b.end_date,
      totalPrice: b.total_price,
      bookingId: b.id,
    };
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    };
    await Promise.allSettled([
      fetch(url, { method: "POST", headers, body: JSON.stringify({
        type: "payment_received_business", recipientName: "", userId: b.business_id, entityId: b.id, data: common,
      }) }),
      fetch(url, { method: "POST", headers, body: JSON.stringify({
        type: "payment_received_owner", recipientName: "", userId: bb?.owner_id, entityId: b.id, data: common,
      }) }),
    ]);
  } catch (e) {
    console.error("notifyPaid failed:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Stripe da un secreto distinto para el endpoint de cuenta y el de cuentas conectadas.
  const secrets = [Deno.env.get("STRIPE_WEBHOOK_SECRET"), Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET")]
    .filter((s): s is string => !!s);
  const signature = req.headers.get("stripe-signature");
  if (!secrets.length || !signature) return new Response("Missing signature", { status: 400 });

  const stripe = getStripe();
  const payload = await req.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
      break;
    } catch { /* prueba el siguiente secreto */ }
  }
  if (!event) {
    console.error("Firma de webhook inválida");
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.payment_status === "paid") await markPaid(s); // OXXO/SPEI llegan como "unpaid" hasta el evento async
        break;
      }
      case "checkout.session.async_payment_succeeded":
        await markPaid(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_failed": {
        const s = event.data.object as Stripe.Checkout.Session;
        await admin.from("platform_commissions").update({ payment_status: "failed" })
          .eq("stripe_checkout_session_id", s.id).neq("payment_status", "paid");
        break;
      }
      case "checkout.session.expired": {
        const s = event.data.object as Stripe.Checkout.Session;
        await admin.from("platform_commissions").update({ stripe_checkout_session_id: null })
          .eq("stripe_checkout_session_id", s.id).neq("payment_status", "paid");
        break;
      }
      case "charge.refunded": {
        const c = event.data.object as Stripe.Charge;
        const pi = typeof c.payment_intent === "string" ? c.payment_intent : c.payment_intent?.id;
        if (pi) {
          await admin.from("platform_commissions").update({
            refunded_amount: c.amount_refunded / 100,
            ...(c.refunded ? { payment_status: "refunded", refunded_at: new Date().toISOString() } : {}),
          }).eq("stripe_payment_intent_id", pi);
        }
        break;
      }
      case "account.updated": {
        const a = event.data.object as Stripe.Account;
        await admin.from("stripe_accounts").update({
          charges_enabled: a.charges_enabled,
          payouts_enabled: a.payouts_enabled,
          details_submitted: a.details_submitted,
        }).eq("stripe_account_id", a.id);
        break;
      }
    }
  } catch (err) {
    console.error(`Error procesando ${event.type}:`, err);
    return new Response("Handler error", { status: 500 }); // Stripe reintentará
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
