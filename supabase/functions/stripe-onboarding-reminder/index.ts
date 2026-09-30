// Tarea programada (diaria). Recuerda por correo a los propietarios con espectaculares publicados
// que aún no terminan de conectar su cuenta de cobro de Stripe. Solo interna (CRON_SECRET / service role).
//   - Recordatorio 1: >= 24 h después de publicar su primer espectacular.
//   - Recordatorios 2 y 3: con 3 y 6 días de separación.
//   - Si tiene solicitudes pendientes que no podría aprobar: aviso urgente (cada 24 h, máx. 5 en total).
import { getServiceClient, gate, corsFor } from "../_shared/http.ts";
import { sendEmail } from "../_shared/payouts.ts";

const TYPE = "stripe_onboarding_reminder";
const DAY = 86_400_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsFor(req) });
  const denied = await gate(req, { name: "stripe-onboarding-reminder", internalOnly: true });
  if (denied) return denied;

  const admin = getServiceClient();
  const now = Date.now();

  // Propietarios con al menos un espectacular publicado hace 24 h o más
  const { data: boards } = await admin.from("billboards")
    .select("id, owner_id, created_at").lte("created_at", new Date(now - DAY).toISOString());
  const boardsByOwner = new Map<string, string[]>();
  for (const b of boards ?? []) boardsByOwner.set(b.owner_id, [...(boardsByOwner.get(b.owner_id) ?? []), b.id]);
  const ownerIds = [...boardsByOwner.keys()];
  if (!ownerIds.length) return Response.json({ sent: 0 });

  // Quién ya está listo para cobrar (o a medio registro)
  const { data: accounts } = await admin.from("stripe_accounts")
    .select("user_id, charges_enabled, payouts_enabled, details_submitted").in("user_id", ownerIds);
  const acct = new Map((accounts ?? []).map((a) => [a.user_id, a]));

  // Recordatorios previos
  const { data: prior } = await admin.from("email_notifications")
    .select("user_id, created_at").eq("type", TYPE).in("user_id", ownerIds);
  const priorBy = new Map<string, { count: number; last: number }>();
  for (const p of prior ?? []) {
    const cur = priorBy.get(p.user_id) ?? { count: 0, last: 0 };
    priorBy.set(p.user_id, { count: cur.count + 1, last: Math.max(cur.last, new Date(p.created_at).getTime()) });
  }

  // Solicitudes pendientes por propietario (urgencia)
  const allBoardIds = [...boardsByOwner.values()].flat();
  const { data: pending } = await admin.from("bookings")
    .select("billboard_id").eq("status", "pending").in("billboard_id", allBoardIds);
  const ownerOfBoard = new Map<string, string>();
  for (const [owner, ids] of boardsByOwner) ids.forEach((id) => ownerOfBoard.set(id, owner));
  const pendingBy = new Map<string, number>();
  for (const p of pending ?? []) {
    const o = ownerOfBoard.get(p.billboard_id);
    if (o) pendingBy.set(o, (pendingBy.get(o) ?? 0) + 1);
  }

  // Preferencias de correo
  const { data: profiles } = await admin.from("profiles")
    .select("user_id, full_name, notification_preferences").in("user_id", ownerIds);
  const profile = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  let sent = 0;
  for (const owner of ownerIds) {
    const a = acct.get(owner);
    if (a?.charges_enabled && a?.payouts_enabled) continue;

    const prefs = profile.get(owner)?.notification_preferences as { email?: boolean } | null;
    if (prefs && prefs.email === false) continue;

    const { count, last } = priorBy.get(owner) ?? { count: 0, last: 0 };
    const urgent = (pendingBy.get(owner) ?? 0) > 0;
    const gapDays = count === 0 ? 0 : count === 1 ? 3 : 6;

    const regularDue = count < 3 && now - last >= gapDays * DAY;
    const urgentDue = urgent && count < 5 && now - last >= DAY;
    if (!regularDue && !urgentDue) continue;

    await sendEmail(TYPE, owner, owner, {
      started: !!a,                                  // ya inició el registro en Stripe
      pendingRequests: pendingBy.get(owner) ?? 0,
    });
    sent++;
  }

  return Response.json({ sent });
});
