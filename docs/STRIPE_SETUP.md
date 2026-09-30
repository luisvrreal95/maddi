# Configuración de Stripe (Connect)

Modelo: **Stripe Connect Express** con *destination charges*. El anunciante paga con Stripe Checkout;
Stripe deposita el monto al propietario y retiene la comisión de Maddi (`platform_commissions.commission_rate`,
15% por defecto) como `application_fee_amount`.

## Flujo
1. Propietario: Configuración → **Cobros** → conecta su cuenta (onboarding de Stripe).
2. Anunciante solicita reserva → propietario aprueba (requiere cuenta de cobro activa).
3. Anunciante ve **Pagar campaña** en su panel → Stripe Checkout (`create-checkout-session`).
4. `stripe-webhook` marca `platform_commissions.payment_status = 'paid'` y envía correos a ambas partes.

El estado de pago **solo** lo cambia el webhook (o un admin manualmente desde el panel).

## Secretos de Supabase (Edge Functions)
```
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SITE_URL=https://maddi.com.mx      # opcional, es el default
supabase secrets set ALLOWED_ORIGINS=https://preview.ejemplo.com   # opcional
```

## Despliegue
```
supabase db push
supabase functions deploy stripe-connect create-checkout-session stripe-webhook send-notification-email
```

## Dashboard de Stripe
1. **Connect** → activar Express para México.
2. **Developers → Webhooks**: crear endpoint `https://<project>.supabase.co/functions/v1/stripe-webhook`
   con los eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
3. Crear **otro** endpoint del mismo URL con *"Escuchar eventos en cuentas conectadas"* y el evento
   `account.updated` (si da un secreto distinto, ver nota abajo).
4. Métodos de pago (tarjeta, OXXO, SPEI) se configuran en Settings → Payment methods; el código usa
   métodos dinámicos y ya maneja los pagos asíncronos.

> Nota: si Stripe da dos secretos distintos (cuenta vs. Connect), `stripe-webhook` hoy valida con uno solo
> (`STRIPE_WEBHOOK_SECRET`). Usa un único endpoint con ambos tipos de eventos o amplía la función.

## Pruebas (modo test)
- Tarjeta `4242 4242 4242 4242`. Onboarding de prueba: usar los datos de prueba de Stripe para Express.
- `stripe listen --forward-to <url>/functions/v1/stripe-webhook` para desarrollo local.

## Pendiente / decisiones de negocio
- Los fondos se transfieren al propietario al momento del cobro (no hay retención hasta que inicie la campaña).
  Para retener, cambiar a *separate charges and transfers* y liberar al iniciar la campaña.
- Reembolsos: se hacen desde el dashboard de Stripe; el webhook marca la comisión como `refunded`.
- Propietarios Fundadores (sin comisión): poner `commission_rate = 0` en su `platform_commissions`
  (el código omite el application fee cuando es 0).
- Facturación/CFDI no está incluida.
