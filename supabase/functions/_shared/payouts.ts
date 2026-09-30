import type Stripe from "https://esm.sh/stripe@17.7.0?target=denonext";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildPeriods, splitFee } from "./payout-math.ts";
import { DEFAULT_COMMISSION_RATE, toCents } from "./stripe.ts";

type Admin = SupabaseClient;

// ---------------------------------------------------------------------------
// Emails (send-notification-email) — llamadas internas con service role
// ---------------------------------------------------------------------------
export async function sendEmail(
  type: string,
  userId: string | null | undefined,
  entityId: string,
  data: Record<string, string | number | boolean>,
  emailOverride?: string,
) {
  if (!userId && !emailOverride) return;
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ type, recipientName: "", userId, email: emailOverride ?? "", entityId, data }),
    });
  } catch (e) {
    console.error(`sendEmail(${type}) failed:`, e);
  }
}

export async function notifyAdmins(type: string, entityId: string, data: Record<string, string | number | boolean>) {
  const email = Deno.env.get("ADMIN_NOTIFY_EMAIL");
  if (email) await sendEmail(type, null, entityId, data, email);
}

// ---------------------------------------------------------------------------
// Calendario de pagos al propietario
// ---------------------------------------------------------------------------

/** Se llama cuando el cobro se confirma. Idempotente. */
export async function schedulePayouts(admin: Admin, bookingId: string) {
  const { count } = await admin.from("booking_payouts").select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId);
  if ((count ?? 0) > 0) return;

  const { data: booking } = await admin.from("bookings")
    .select("start_date, end_date, total_price").eq("id", bookingId).single();
  const { data: commission } = await admin.from("platform_commissions")
    .select("commission_rate").eq("booking_id", bookingId).single();
  if (!booking) return;

  const rate = Number(commission?.commission_rate ?? DEFAULT_COMMISSION_RATE);
  const periods = buildPeriods(booking.start_date, booking.end_date, toCents(booking.total_price));
  const now = Date.now();

  const rows = periods.map((p) => {
    const { fee, net } = splitFee(p.grossCents, rate);
    // Tramo 0: espera confirmación de instalación (release_at NULL).
    // Siguientes: al inicio de su periodo (00:00 México), o ya si ese momento pasó.
    let releaseAt: string | null = null;
    if (p.seq > 0) {
      const at = Date.parse(`${p.start}T06:00:00Z`);
      releaseAt = new Date(Math.max(at, now)).toISOString();
    }
    return {
      booking_id: bookingId, seq: p.seq, kind: "installment", period_start: p.start, period_end: p.end,
      gross_cents: p.grossCents, fee_cents: fee, net_cents: net, release_at: releaseAt,
    };
  });
  const { error } = await admin.from("booking_payouts").insert(rows);
  if (error) throw error;
}

/**
 * Cancela todos los tramos pendientes, reembolsa `refundCents` al anunciante y deja lo retenido
 * como un único tramo "settlement" para el propietario (liberable ya, o retenido si `hold`).
 */
export async function settleBooking(
  admin: Admin,
  stripe: Stripe,
  bookingId: string,
  refundCents: number,
  opts: { hold?: boolean; reason?: string } = {},
): Promise<{ refundedCents: number; retainedCents: number }> {
  const { data: scheduled } = await admin.from("booking_payouts").select("id, seq, gross_cents")
    .eq("booking_id", bookingId).eq("status", "scheduled");
  const { data: commission } = await admin.from("platform_commissions")
    .select("commission_rate, stripe_payment_intent_id").eq("booking_id", bookingId).single();

  const rows = scheduled ?? [];
  const pending = rows.reduce((s, r) => s + r.gross_cents, 0);
  const refund = Math.min(Math.max(Math.round(refundCents), 0), pending);
  const retained = pending - refund;

  if (refund > 0) {
    if (!commission?.stripe_payment_intent_id) throw new Error("La reserva no tiene un pago de Stripe asociado");
    await stripe.refunds.create({
      payment_intent: commission.stripe_payment_intent_id,
      amount: refund,
      metadata: { booking_id: bookingId, reason: opts.reason ?? "" },
    }, { idempotencyKey: `refund-${bookingId}-${pending}-${refund}-${opts.reason ?? ""}` });
  }

  if (rows.length) {
    await admin.from("booking_payouts").update({ status: "cancelled" })
      .eq("booking_id", bookingId).eq("status", "scheduled");
  }

  if (retained > 0) {
    const { data: last } = await admin.from("booking_payouts").select("seq")
      .eq("booking_id", bookingId).order("seq", { ascending: false }).limit(1).single();
    const { fee, net } = splitFee(retained, Number(commission?.commission_rate ?? DEFAULT_COMMISSION_RATE));
    const { error } = await admin.from("booking_payouts").insert({
      booking_id: bookingId, seq: (last?.seq ?? 0) + 1, kind: "settlement",
      gross_cents: retained, fee_cents: fee, net_cents: net,
      release_at: opts.hold ? null : new Date().toISOString(),
    });
    if (error) throw error;
  }
  return { refundedCents: refund, retainedCents: retained };
}

/** Libera las fechas bloqueadas por una reserva aprobada. */
export async function freeBlockedDates(admin: Admin, bookingId: string, billboardId: string) {
  await admin.from("blocked_dates").delete()
    .eq("billboard_id", billboardId)
    .eq("reason", `Campaña aprobada #${bookingId.slice(0, 8)}`);
}

// ---------------------------------------------------------------------------
// Transferencias al propietario
// ---------------------------------------------------------------------------
export async function releaseDuePayouts(admin: Admin, stripe: Stripe): Promise<{ released: number; failed: number }> {
  const { data: due } = await admin.from("booking_payouts")
    .select("id, booking_id, net_cents, seq")
    .eq("status", "scheduled").not("release_at", "is", null).lte("release_at", new Date().toISOString())
    .limit(100);

  let released = 0, failed = 0;
  for (const p of due ?? []) {
    try {
      const { data: b } = await admin.from("bookings")
        .select("id, billboard_id, installation_status, status, start_date, end_date").eq("id", p.booking_id).single();
      if (!b || b.installation_status === "disputed") continue; // congelado
      const { data: c } = await admin.from("platform_commissions")
        .select("payment_status, stripe_charge_id").eq("booking_id", p.booking_id).single();
      if (c?.payment_status !== "paid") continue;
      const { data: bb } = await admin.from("billboards").select("owner_id, title").eq("id", b.billboard_id).single();
      const { data: acct } = await admin.from("stripe_accounts")
        .select("stripe_account_id, payouts_enabled").eq("user_id", bb!.owner_id).maybeSingle();
      if (!acct?.payouts_enabled) {
        await admin.from("booking_payouts").update({ last_error: "El propietario no tiene cuenta de cobro activa" }).eq("id", p.id);
        continue; // se reintenta en el siguiente ciclo
      }

      if (p.net_cents > 0) {
        const transfer = await stripe.transfers.create({
          amount: p.net_cents,
          currency: "mxn",
          destination: acct.stripe_account_id,
          transfer_group: p.booking_id,
          ...(c.stripe_charge_id ? { source_transaction: c.stripe_charge_id } : {}),
          metadata: { booking_id: p.booking_id, payout_id: p.id },
        }, { idempotencyKey: `payout-${p.id}` });
        await admin.from("booking_payouts").update({
          status: "released", released_at: new Date().toISOString(), stripe_transfer_id: transfer.id, last_error: null,
        }).eq("id", p.id);
      } else {
        await admin.from("booking_payouts").update({ status: "released", released_at: new Date().toISOString() }).eq("id", p.id);
      }
      released++;
      await sendEmail("payout_released", bb!.owner_id, p.booking_id, {
        billboardTitle: bb!.title, amount: (p.net_cents / 100).toFixed(2), bookingId: p.booking_id,
      });
    } catch (e) {
      failed++;
      console.error(`Payout ${p.id} falló:`, e);
      await admin.from("booking_payouts").update({ last_error: String((e as Error).message).slice(0, 300) }).eq("id", p.id);
    }
  }
  return { released, failed };
}
