import Stripe from "https://esm.sh/stripe@17.7.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export const getStripe = () =>
  new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-12-18.acacia", httpClient: Stripe.createFetchHttpClient() });

export const adminClient = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

/** Usuario autenticado a partir del JWT del encabezado Authorization */
export async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/** Comisión de Maddi en % (se descuenta al propietario). Configurable con PLATFORM_FEE_PERCENT. */
export const platformFeePercent = () => {
  const n = Number(Deno.env.get("PLATFORM_FEE_PERCENT") ?? "10");
  return isFinite(n) && n >= 0 && n < 100 ? n : 10;
};

export const siteUrl = (req: Request) =>
  Deno.env.get("SITE_URL") || req.headers.get("origin") || "https://maddi.com.mx";
