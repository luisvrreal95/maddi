import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, json, getStripe, adminClient, requireUser } from "../_shared/stripe.ts";

// Liberación del pago al propietario con evidencia de instalación.
//  submit   (propietario)  sube fotos del anuncio instalado → en revisión 48 h
//  confirm  (anunciante)   confirma que sí está puesto → se paga al propietario
//  dispute  (anunciante)   reporta un problema → se detiene el pago
//  release_due (cron)      paga las evidencias sin disputa tras 48 h  [header x-cron-secret]
//  admin_release / admin_refund (administrador) resuelven disputas
const REVIEW_HOURS = 48;

type Db = ReturnType<typeof adminClient>;

async function notify(db: Db, userId: string, title: string, message: string, type: string, booking: any) {
  try {
    await db.from("notifications").insert({
      user_id: userId, title, message, type,
      related_booking_id: booking.id, related_billboard_id: booking.billboard_id,
    });
  } catch (e) { console.error("notify", e); }
}

async function ownerOf(db: Db, billboardId: string) {
  const { data } = await db.from("billboards").select("owner_id, title").eq("id", billboardId).maybeSingle();
  return data as { owner_id: string; title: string } | null;
}

/** Transfiere al propietario su parte (total − comisión). */
async function release(db: Db, booking: any) {
  if (booking.payment_model !== "separate") throw new Error("Esta reserva ya se pagó con el modelo anterior");
  if (booking.payment_status !== "captured") throw new Error("El cobro no está capturado");
  if (booking.payout_status === "released" || booking.payout_status === "refunded") return;
  const bb = await ownerOf(db, booking.billboard_id);
  if (!bb) throw new Error("Espectacular no encontrado");
  const { data: prof } = await db.from("profiles").select("stripe_account_id").eq("user_id", bb.owner_id).maybeSingle();
  if (!prof?.stripe_account_id) throw new Error("El propietario no tiene cuenta de cobros conectada");

  const stripe = getStripe();
  const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
  const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
  const transfer = await stripe.transfers.create({
    amount: Math.round(Number(booking.owner_payout) * 100),
    currency: "mxn",
    destination: prof.stripe_account_id,
    ...(chargeId ? { source_transaction: chargeId } : {}),
    transfer_group: booking.id,
    description: `Pago Maddi: ${bb.title}`,
    metadata: { booking_id: booking.id },
  }, { idempotencyKey: `transfer-${booking.id}` });

  await db.from("bookings").update({
    payout_status: "released", stripe_transfer_id: transfer.id, payout_released_at: new Date().toISOString(),
  }).eq("id", booking.id);
  await notify(db, bb.owner_id, "Pago liberado", `Se transfirió tu pago de "${bb.title}" a tu cuenta de cobros.`, "payout_released", booking);
}

/** Reembolso completo al anunciante (revierte la transferencia si ya se había pagado). */
async function refund(db: Db, booking: any) {
  const stripe = getStripe();
  if (booking.stripe_transfer_id) await stripe.transfers.createReversal(booking.stripe_transfer_id);
  await stripe.refunds.create({ payment_intent: booking.stripe_payment_intent_id });
  await db.from("bookings").update({ status: "cancelled", payment_status: "refunded", payout_status: "refunded" }).eq("id", booking.id);
  await db.from("blocked_dates").delete().eq("billboard_id", booking.billboard_id).eq("reason", `Campaña aprobada #${String(booking.id).slice(0, 8)}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const db = adminClient();

    // --- tarea programada ---
    if (action === "release_due") {
      const secret = Deno.env.get("CRON_SECRET");
      if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "No autorizado" }, 401);
      const { data: due } = await db.from("bookings").select("*")
        .eq("payout_status", "in_review").lte("review_deadline", new Date().toISOString());
      let released = 0; const errors: string[] = [];
      for (const b of due || []) {
        try { await release(db, b); released++; } catch (e) { errors.push(`${b.id}: ${(e as Error).message}`); }
      }
      return json({ released, errors });
    }

    const user = await requireUser(req);
    if (!user) return json({ error: "No autenticado" }, 401);
    const { booking_id } = body;
    if (!booking_id) return json({ error: "booking_id requerido" }, 400);
    const { data: booking } = await db.from("bookings").select("*").eq("id", booking_id).maybeSingle();
    if (!booking) return json({ error: "Reserva no encontrada" }, 404);
    const bb = await ownerOf(db, booking.billboard_id);

    // --- propietario sube evidencia ---
    if (action === "submit") {
      if (bb?.owner_id !== user.id) return json({ error: "No autorizado" }, 403);
      if (booking.status !== "approved" || booking.payment_model !== "separate") return json({ error: "Esta reserva no requiere evidencia" }, 409);
      if (!["awaiting_evidence", "disputed"].includes(booking.payout_status)) return json({ error: "La evidencia ya fue enviada" }, 409);
      const paths: string[] = Array.isArray(body.paths) ? body.paths : [];
      if (paths.length < 1 || paths.length > 6) return json({ error: "Sube de 1 a 6 fotos" }, 400);
      if (!paths.every((p) => typeof p === "string" && p.startsWith(`${user.id}/${booking.id}/`))) return json({ error: "Archivos inválidos" }, 400);
      await db.from("bookings").update({
        payout_status: "in_review",
        evidence_paths: paths,
        evidence_note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
        evidence_submitted_at: new Date().toISOString(),
        review_deadline: new Date(Date.now() + REVIEW_HOURS * 3600 * 1000).toISOString(),
        dispute_reason: null, disputed_at: null,
      }).eq("id", booking.id);
      await notify(db, booking.business_id, "Confirma tu anuncio", `El propietario subió fotos de "${bb?.title}". Confirma que está instalado o repórtanos un problema en 48 horas.`, "evidence_submitted", booking);
      return json({ ok: true });
    }

    // --- anunciante confirma / disputa ---
    if (action === "confirm" || action === "dispute") {
      if (booking.business_id !== user.id) return json({ error: "No autorizado" }, 403);
      if (booking.payout_status !== "in_review") return json({ error: "No hay evidencia pendiente de revisar" }, 409);
      if (action === "confirm") {
        await db.from("bookings").update({ advertiser_confirmed_at: new Date().toISOString() }).eq("id", booking.id);
        await release(db, { ...booking });
        return json({ ok: true });
      }
      const reason = String(body.reason || "").trim().slice(0, 600);
      if (reason.length < 10) return json({ error: "Cuéntanos qué pasa (mínimo 10 caracteres)" }, 400);
      await db.from("bookings").update({ payout_status: "disputed", dispute_reason: reason, disputed_at: new Date().toISOString() }).eq("id", booking.id);
      if (bb) await notify(db, bb.owner_id, "El anunciante reportó un problema", `Sobre "${bb.title}": ${reason}. Maddi revisará el caso.`, "evidence_disputed", booking);
      return json({ ok: true });
    }

    // --- administrador resuelve ---
    if (action === "admin_release" || action === "admin_refund") {
      const { data: adm } = await db.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
      if (!adm) return json({ error: "No autorizado" }, 403);
      if (booking.payment_status !== "captured") return json({ error: "El cobro no está capturado" }, 409);
      if (action === "admin_release") await release(db, booking); else await refund(db, booking);
      return json({ ok: true });
    }

    return json({ error: "Acción inválida" }, 400);
  } catch (e) {
    console.error("stripe-booking-evidence", e);
    return json({ error: (e as Error).message }, 500);
  }
});
