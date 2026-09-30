import Stripe from "https://esm.sh/stripe@17.7.0?target=denonext";

export { SITE_URL, corsFor, json, HttpError, requireUser, getServiceClient } from "./http.ts";

export const DEFAULT_COMMISSION_RATE = 0.15;

export function getStripe(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY no está configurada");
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}

/** Monto en centavos de MXN a partir del total decimal de la reserva. */
export function toCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}
