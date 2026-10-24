import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, json, getStripe, adminClient, requireUser, siteUrl } from "../_shared/stripe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "No autenticado" }, 401);

    const db = adminClient();
    const stripe = getStripe();
    const { data: profile } = await db.from("profiles").select("full_name, company_name, stripe_account_id").eq("user_id", user.id).maybeSingle();

    let accountId = profile?.stripe_account_id as string | null | undefined;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "MX",
        email: user.email ?? undefined,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { name: profile?.company_name || profile?.full_name || undefined },
        metadata: { user_id: user.id },
      });
      accountId = account.id;
      await db.from("profiles").update({ stripe_account_id: accountId }).eq("user_id", user.id);
    }

    const base = siteUrl(req);
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${base}/owner?tab=propiedades&stripe=refresh`,
      return_url: `${base}/owner?tab=propiedades&stripe=return`,
    });
    return json({ url: link.url });
  } catch (e) {
    console.error("stripe-connect-onboard", e);
    return json({ error: (e as Error).message }, 500);
  }
});
