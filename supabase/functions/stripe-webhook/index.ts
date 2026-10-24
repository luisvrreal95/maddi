import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, json, getStripe, adminClient } from "../_shared/stripe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (e) {
    console.error("firma inválida", e);
    return json({ error: "Firma inválida" }, 400);
  }

  const db = adminClient();
  try {
    switch (event.type) {
      case "payment_intent.amount_capturable_updated": {
        const pi = event.data.object;
        await db.from("bookings").update({ payment_status: "authorized" }).eq("stripe_payment_intent_id", pi.id).in("payment_status", ["requires_payment"]);
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        await db.from("bookings").update({ payment_status: "captured" }).eq("stripe_payment_intent_id", pi.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        await db.from("bookings").update({ payment_status: "failed" }).eq("stripe_payment_intent_id", pi.id).eq("payment_status", "requires_payment");
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object;
        await db.from("bookings").update({ payment_status: "canceled" }).eq("stripe_payment_intent_id", pi.id).neq("payment_status", "captured");
        break;
      }
      case "account.updated": {
        const acc = event.data.object;
        await db.from("profiles").update({ stripe_charges_enabled: !!acc.charges_enabled, stripe_payouts_enabled: !!acc.payouts_enabled }).eq("stripe_account_id", acc.id);
        break;
      }
    }
  } catch (e) {
    console.error("webhook handler", e);
    return json({ error: "Error procesando evento" }, 500);
  }
  return json({ received: true });
});
