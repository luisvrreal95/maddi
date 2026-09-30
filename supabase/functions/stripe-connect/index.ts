// Onboarding y estado de la cuenta Stripe Connect (Express) del propietario.
// body: { action: "onboard" | "status" | "dashboard" }
import {
  corsFor, getServiceClient, getStripe, HttpError, json, requireUser, SITE_URL,
} from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsFor(req) });

  try {
    const admin = getServiceClient();
    const stripe = getStripe();
    const user = await requireUser(req, admin);

    const { action } = await req.json().catch(() => ({ action: "status" }));

    const { data: isOwner } = await admin.rpc("has_role", { _user_id: user.id, _role: "owner" });
    if (!isOwner) throw new HttpError(403, "Solo los propietarios pueden conectar una cuenta de cobro");

    const { data: existing } = await admin
      .from("stripe_accounts")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (action === "status") {
      if (!existing) {
        return json(req, { connected: false, charges_enabled: false, payouts_enabled: false, details_submitted: false });
      }
      const acct = await stripe.accounts.retrieve(existing.stripe_account_id);
      await admin.from("stripe_accounts").update({
        charges_enabled: acct.charges_enabled,
        payouts_enabled: acct.payouts_enabled,
        details_submitted: acct.details_submitted,
      }).eq("user_id", user.id);
      return json(req, {
        connected: true,
        charges_enabled: acct.charges_enabled,
        payouts_enabled: acct.payouts_enabled,
        details_submitted: acct.details_submitted,
      });
    }

    if (action === "onboard") {
      let accountId = existing?.stripe_account_id;
      if (!accountId) {
        const acct = await stripe.accounts.create({
          type: "express",
          country: "MX",
          email: user.email ?? undefined,
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
          metadata: { user_id: user.id },
        });
        accountId = acct.id;
        const { error } = await admin.from("stripe_accounts").insert({
          user_id: user.id,
          stripe_account_id: accountId,
        });
        if (error) throw error;
      }
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: "account_onboarding",
        refresh_url: `${SITE_URL}/settings?stripe=refresh`,
        return_url: `${SITE_URL}/settings?stripe=return`,
      });
      return json(req, { url: link.url });
    }

    if (action === "dashboard") {
      if (!existing) throw new HttpError(400, "Aún no has conectado tu cuenta de cobro");
      const link = await stripe.accounts.createLoginLink(existing.stripe_account_id);
      return json(req, { url: link.url });
    }

    throw new HttpError(400, "Acción inválida");
  } catch (err) {
    if (err instanceof HttpError) return json(req, { error: err.message }, err.status);
    console.error("stripe-connect error:", err);
    return json(req, { error: "No se pudo completar la operación con Stripe" }, 500);
  }
});
