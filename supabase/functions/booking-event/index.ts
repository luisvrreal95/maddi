// Envía correos de eventos del flujo de instalación, validando el evento contra el estado real
// en la base de datos (el cliente no controla el contenido).
// body: { bookingId, event: "proof_submitted" | "issue_reported" }
import { corsFor, getServiceClient, HttpError, json, requireUser } from "../_shared/stripe.ts";
import { notifyAdmins, sendEmail } from "../_shared/payouts.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsFor(req) });
  try {
    const admin = getServiceClient();
    const user = await requireUser(req, admin);
    const { bookingId, event } = await req.json().catch(() => ({}));

    const { data: b } = await admin.from("bookings")
      .select("id, business_id, billboard_id, start_date, end_date, installation_status, dispute_reason, installation_submitted_at, disputed_at")
      .eq("id", bookingId).maybeSingle();
    if (!b) throw new HttpError(404, "Reserva no encontrada");
    const { data: bb } = await admin.from("billboards").select("owner_id, title").eq("id", b.billboard_id).single();

    const base = { billboardTitle: bb?.title ?? "Espectacular", startDate: b.start_date, endDate: b.end_date, bookingId: b.id };
    const recent = (iso: string | null) => !!iso && Date.now() - new Date(iso).getTime() < 10 * 60_000;

    if (event === "proof_submitted") {
      if (bb?.owner_id !== user.id || b.installation_status !== "submitted" || !recent(b.installation_submitted_at)) {
        throw new HttpError(409, "Evento no válido");
      }
      await sendEmail("installation_proof_submitted", b.business_id, b.id, base);
    } else if (event === "issue_reported") {
      if (b.business_id !== user.id || b.installation_status !== "disputed" || !recent(b.disputed_at)) {
        throw new HttpError(409, "Evento no válido");
      }
      const data = { ...base, reason: b.dispute_reason ?? "" };
      await sendEmail("issue_reported", bb?.owner_id, b.id, data);
      await notifyAdmins("issue_reported", b.id, data);
    } else {
      throw new HttpError(400, "Evento inválido");
    }
    return json(req, { ok: true });
  } catch (err) {
    if (err instanceof HttpError) return json(req, { error: err.message }, err.status);
    console.error("booking-event error:", err);
    return json(req, { error: "No se pudo enviar la notificación" }, 500);
  }
});
