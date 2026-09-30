// Utilidades comunes de seguridad/HTTP para las edge functions (sin dependencias pesadas).
import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://maddi.com.mx").replace(/\/$/, "");

export function getServiceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// --- CORS: solo orígenes propios (más los extra de ALLOWED_ORIGINS, separados por coma) ---------
// CORS no protege contra clientes que no son navegador: la protección real es auth + rate limit.

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
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// --- Autenticación -------------------------------------------------------------------------------

/** Usuario autenticado o null (un Bearer con la anon key NO cuenta como usuario). */
export async function optionalUser(req: Request, admin: SupabaseClient): Promise<User | null> {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const { data, error } = await admin.auth.getUser(header.slice(7));
  return error || !data.user ? null : data.user;
}

export async function requireUser(req: Request, admin: SupabaseClient): Promise<User> {
  const user = await optionalUser(req, admin);
  if (!user) throw new HttpError(401, "Inicia sesión para continuar");
  return user;
}

export async function isAdminUser(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin.from("admin_users").select("id").eq("user_id", userId).maybeSingle();
  return !!data;
}

/** Llamadas internas: service role (Bearer) o x-cron-secret (CRON_SECRET). */
export function isInternal(req: Request): boolean {
  const cron = Deno.env.get("CRON_SECRET");
  if (cron && req.headers.get("x-cron-secret") === cron) return true;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return !!svc && req.headers.get("Authorization") === `Bearer ${svc}`;
}

// --- Rate limiting (ventana fija, en Postgres) --------------------------------------------------

export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** true = permitido. Si la BD falla, permite (no tumbamos el sitio por el limitador). */
export async function rateLimit(
  admin: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc("check_rate_limit", {
    _key: key, _limit: limit, _window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rateLimit error:", error.message);
    return true;
  }
  return data === true;
}

/** Lanza 429 si se excede. */
export async function enforceRateLimit(
  admin: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
) {
  if (!(await rateLimit(admin, key, limit, windowSeconds))) {
    throw new HttpError(429, "Demasiadas solicitudes. Intenta de nuevo en unos minutos.");
  }
}

// --- Validación de entrada ------------------------------------------------------------------------

export function validCoords(lat: unknown, lon: unknown): { lat: number; lon: number } {
  const la = Number(lat), lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
    throw new HttpError(400, "Coordenadas inválidas");
  }
  return { lat: la, lon: lo };
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Escapa recursivamente todos los strings de un objeto (para insertarlos en HTML de correos). */
export function escapeDeep<T>(v: T): T {
  if (typeof v === "string") return escapeHtml(v) as unknown as T;
  if (Array.isArray(v)) return v.map(escapeDeep) as unknown as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, escapeDeep(x)])) as unknown as T;
  }
  return v;
}

// --- Guardia rápida para funciones existentes ----------------------------------------------------

export interface GateOptions {
  name: string;
  /** Solo service role / CRON_SECRET. */
  internalOnly?: boolean;
  /** [máximo de llamadas, ventana en segundos] por IP. */
  ip?: [number, number];
}

/** Devuelve una Response de rechazo (401/429) o null si la petición puede continuar. */
export async function gate(req: Request, opts: GateOptions): Promise<Response | null> {
  if (opts.internalOnly && !isInternal(req)) return json(req, { error: "No autorizado" }, 401);
  if (opts.ip && !opts.internalOnly) {
    const ok = await rateLimit(getServiceClient(), `${opts.name}:ip:${clientIp(req)}`, opts.ip[0], opts.ip[1]);
    if (!ok) return json(req, { error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." }, 429);
  }
  return null;
}

export const badCoords = (lat: unknown, lon: unknown) => {
  const la = Number(lat), lo = Number(lon);
  return !Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BillboardAccess =
  | { ok: true; lat: number; lon: number; canRefresh: boolean }
  | { ok: false; response: Response };

/**
 * Para funciones que calculan/cachean datos de un espectacular: usa SIEMPRE las coordenadas guardadas
 * (no las del cliente) y solo el dueño o un admin pueden forzar recálculo (consume APIs de pago).
 */
export async function authorizeBillboardRequest(req: Request, billboardId: unknown): Promise<BillboardAccess> {
  if (typeof billboardId !== "string" || !UUID_RE.test(billboardId)) {
    return { ok: false, response: json(req, { error: "billboard_id inválido" }, 400) };
  }
  const admin = getServiceClient();
  const { data: bb } = await admin.from("billboards")
    .select("owner_id, latitude, longitude").eq("id", billboardId).maybeSingle();
  if (!bb) return { ok: false, response: json(req, { error: "Espectacular no encontrado" }, 404) };

  const user = await optionalUser(req, admin);
  const canRefresh = !!user && (user.id === bb.owner_id || (await isAdminUser(admin, user.id)));
  return { ok: true, lat: Number(bb.latitude), lon: Number(bb.longitude), canRefresh };
}
