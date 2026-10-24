import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, json, getStripe, adminClient, requireUser } from "../_shared/stripe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "No autenticado" }, 401);
    const db = adminClient();
    const { data: profile } = await db.from("profiles").select("stripe_account_id").eq("user_id", user.id).maybeSingle();
    if (!profile?.stripe_account_id) return json({ connected: false, chargesEnabled: false, payoutsEnabled: false });

    const account = await getStripe().accounts.retrieve(profile.stripe_account_id);
    const chargesEnabled = !!account.charges_enabled;
    const payoutsEnabled = !!account.payouts_enabled;
    await db.from("profiles").update({ stripe_charges_enabled: chargesEnabled, stripe_payouts_enabled: payoutsEnabled }).eq("user_id", user.id);
    return json({ connected: true, chargesEnabled, payoutsEnabled, detailsSubmitted: !!account.details_submitted });
  } catch (e) {
    console.error("stripe-connect-status", e);
    return json({ error: (e as Error).message }, 500);
  }
});
