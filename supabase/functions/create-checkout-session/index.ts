// Crea una sesión de Stripe Checkout para pagar una reserva aprobada.
// El monto se calcula SIEMPRE en el servidor a partir de la reserva.
// El cobro queda retenido en Maddi; ver release-payouts para la liberación al propietario.
// body: { bookingId: string }
import {
  corsFor, DEFAULT_COMMISSION_RATE, getServiceClient, getStripe, HttpError, json,
  requireUser, SITE_URL, toCents,
} from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsFor(req) });

  try {
    const admin = getServiceClient();
    const stripe = getStripe();
    const user = await requireUser(req, admin);

    const { bookingId } = await req.json().catch(() => ({}));
    if (!bookingId || typeof bookingId !== "string") throw new HttpError(400, "bookingId requerido");

    const { data: booking } = await admin
      .from("bookings")
      .select("id, business_id, billboard_id, start_date, end_date, total_price, status, payment_due_at")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking || booking.business_id !== user.id) throw new HttpError(404, "Reserva no encontrada");
    if (booking.status !== "approved") throw new HttpError(409, "La reserva aún no ha sido aprobada por el propietario");

    if (booking.payment_due_at && new Date(booking.payment_due_at) <= new Date()) {
      throw new HttpError(409, "El plazo para pagar esta reserva venció");
    }

    const { data: billboard } = await admin
      .from("billboards")
      .select("title, owner_id")
      .eq("id", booking.billboard_id)
      .single();

    const { data: connected } = await admin
      .from("stripe_accounts")
      .select("charges_enabled, payouts_enabled")
      .eq("user_id", billboard!.owner_id)
      .maybeSingle();

    if (!connected?.charges_enabled || !connected.payouts_enabled) {
      throw new HttpError(409, "El propietario aún no puede recibir pagos. Te avisaremos cuando esté listo.");
    }

    // La comisión la crea el trigger al aprobar; se asegura por si faltara.
    let { data: commission } = await admin
      .from("platform_commissions")
      .select("id, commission_rate, payment_status, stripe_checkout_session_id")
      .eq("booking_id", booking.id)
      .maybeSingle();

    if (!commission) {
      const total = Number(booking.total_price);
      const { data: created, error } = await admin.from("platform_commissions").insert({
        booking_id: booking.id,
        total_amount: total,
        commission_rate: DEFAULT_COMMISSION_RATE,
        commission_amount: total * DEFAULT_COMMISSION_RATE,
        owner_payout: total * (1 - DEFAULT_COMMISSION_RATE),
        payment_status: "pending",
      }).select("id, commission_rate, payment_status, stripe_checkout_session_id").single();
      if (error) throw error;
      commission = created;
    }

    if (commission.payment_status === "paid") throw new HttpError(409, "Esta reserva ya fue pagada");

    // Reutiliza la sesión abierta si sigue vigente (evita dobles cobros por doble clic).
    if (commission.stripe_checkout_session_id) {
      const prev = await stripe.checkout.sessions.retrieve(commission.stripe_checkout_session_id);
      if (prev.status === "open" && prev.url) return json(req, { url: prev.url });
    }

    const amount = toCents(booking.total_price);
    if (amount < 1000) throw new HttpError(400, "El monto mínimo de cobro es de $10 MXN");

    // Cobro a la cuenta de Maddi (retención): el dinero se transfiere al propietario por etapas
    // desde release-payouts. La comisión se calcula al programar los tramos.
    const expiresAt = Math.floor(Math.min(
      booking.payment_due_at ? new Date(booking.payment_due_at).getTime() : Infinity,
      Date.now() + 24 * 3600 * 1000,
    ) / 1000);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: booking.id,
      customer_email: user.email ?? undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "mxn",
          unit_amount: amount,
          product_data: {
            name: `Campaña en ${billboard!.title}`,
            description: `${booking.start_date} al ${booking.end_date}`,
          },
        },
      }],
      expires_at: Math.max(expiresAt, Math.floor(Date.now() / 1000) + 1800),
      payment_intent_data: {
        transfer_group: booking.id,
        metadata: { booking_id: booking.id },
      },
      metadata: { booking_id: booking.id },
      success_url: `${SITE_URL}/business?payment=success&booking=${booking.id}`,
      cancel_url: `${SITE_URL}/business?payment=cancelled&booking=${booking.id}`,
    }, { idempotencyKey: `checkout-${booking.id}-${Date.now() - (Date.now() % 60000)}` });

    await admin.from("platform_commissions").update({
      stripe_checkout_session_id: session.id,
      payment_status: "pending",
    }).eq("id", commission.id);

    return json(req, { url: session.url });
  } catch (err) {
    if (err instanceof HttpError) return json(req, { error: err.message }, err.status);
    console.error("create-checkout-session error:", err);
    return json(req, { error: "No se pudo iniciar el pago" }, 500);
  }
});
