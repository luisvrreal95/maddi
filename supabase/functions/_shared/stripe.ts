import Stripe from "https://esm.sh/stripe@17.7.0?target=denonext";
import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://maddi.com.mx").replace(/\/$/, "");

export const DEFAULT_COMMISSION_RATE = 0.15;

export function getStripe(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY no está configurada");
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// --- CORS: solo orígenes propios (más los extra de ALLOWED_ORIGINS) ----------

const ALLOWED_ORIGINS = new Set([
  SITE_URL,
  "https://www.maddi.com.mx",
  "http://localhost:8080",
  "http://localhost:5173",
  ...(Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
]);

export function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : SITE_URL,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), "Content-Type": "application/json" },
  });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(req: Request, admin: SupabaseClient): Promise<User> {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) throw new HttpError(401, "No autenticado");
  const { data, error } = await admin.auth.getUser(header.slice(7));
  if (error || !data.user) throw new HttpError(401, "Sesión inválida");
  return data.user;
}

/** Monto en centavos de MXN a partir del total decimal de la reserva. */
export function toCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}
