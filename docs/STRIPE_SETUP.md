# Configuración de Stripe (Connect)

Modelo: **Stripe Connect Express** con *separate charges and transfers* y **pago protegido** (tipo Airbnb).
El anunciante paga a la cuenta de Maddi con Stripe Checkout; el dinero queda retenido y se transfiere al
propietario por etapas, descontando la comisión (`platform_commissions.commission_rate`, 15 % por defecto).

## Flujo
1. Propietario: Configuración → **Cobros** → conecta su cuenta (onboarding de Stripe).
2. Anunciante solicita → propietario aprueba (requiere cuenta de cobro activa). Desde ese momento el
   anunciante tiene **48 h para pagar**; si no, la reserva se cancela y las fechas se liberan.
3. Anunciante paga (`create-checkout-session`). El webhook confirma el cobro y programa los pagos
   (`booking_payouts`, un tramo por cada periodo de 30 días).
4. Propietario sube **fotos de la instalación**. El anunciante tiene **48 h** para confirmar o reportar un
   problema; si no responde, se confirma solo.
5. **Liberación:** tramo 1 al confirmarse la instalación (nunca antes del inicio de la campaña); tramos
   siguientes al inicio de cada periodo de 30 días. Las transferencias las hace `release-payouts` (cron, 15 min).
6. **Disputa:** el anunciante reporta → se congelan los pagos → un admin resuelve en Admin → Disputas
   (liberar / reembolso parcial / reembolso total y cancelar) vía `resolve-dispute`.
7. **Cancelación** (`cancel-booking`): anunciante antes del inicio → >14 días 100 %, 3–14 días 50 %, <3 días 0 %;
   ya iniciada → se reembolsan los periodos futuros. Propietario → reembolso total. Sin pago → sin cargos.
8. Si pasan 3 días del inicio sin evidencia, la instalación se marca *atrasada* y se avisa al propietario y al admin.

El estado de pago solo lo cambia el webhook; el dinero solo se mueve desde edge functions con service role.

## Secretos de Supabase (Edge Functions)
```
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...           # endpoint de tu cuenta
supabase secrets set STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...   # endpoint de cuentas conectadas
supabase secrets set SITE_URL=https://maddi.com.mx      # opcional, es el default
supabase secrets set CRON_SECRET=<cadena aleatoria larga>
supabase secrets set ADMIN_NOTIFY_EMAIL=soporte@maddi.com.mx   # avisos de disputas para el equipo
supabase secrets set ALLOWED_ORIGINS=https://preview.ejemplo.com   # opcional
```

## Despliegue
```
supabase db push
supabase functions deploy stripe-connect create-checkout-session stripe-webhook send-notification-email \
  release-payouts cancel-booking resolve-dispute booking-event
```

## Aviso y recordatorio de onboarding del propietario
- Banner en el panel del propietario (inicio, propiedades, reservas) y aviso al publicar el primer espectacular.
- `stripe-onboarding-reminder` (cron diario 09:00 CDMX): correo a propietarios con espectaculares que aún no pueden cobrar.
  Recordatorios a las 24 h, +3 días y +6 días; si hay solicitudes pendientes que no podrían aprobar, aviso urgente cada 24 h
  (máx. 5). Respeta la preferencia de correo del usuario. Se desactiva solo cuando la cuenta queda activa.

## Cron (una sola vez)
La migración `20260501000002` programa `release-payouts` cada 15 min con pg_cron + pg_net. Necesita dos
secretos en Vault (SQL editor):
```
select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select vault.create_secret('<mismo valor que CRON_SECRET>', 'cron_secret');
```
Sin esto los pagos **no se liberan** y las reservas sin pagar no expiran. Verifica con
`select * from cron.job_run_details order by start_time desc limit 5;`

## Dashboard de Stripe
1. **Connect** → activar Express para México.
2. **Developers → Webhooks**: crear endpoint `https://<project>.supabase.co/functions/v1/stripe-webhook`
   con los eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
3. Crear **otro** endpoint del mismo URL con *"Escuchar eventos en cuentas conectadas"* y el evento
   `account.updated` (si da un secreto distinto, ver nota abajo).
4. Métodos de pago (tarjeta, OXXO, SPEI) se configuran en Settings → Payment methods; el código usa
   métodos dinámicos y ya maneja los pagos asíncronos.

> `stripe-webhook` acepta ambos secretos (`STRIPE_WEBHOOK_SECRET` y `STRIPE_CONNECT_WEBHOOK_SECRET`).

## Pruebas (modo test)
- Tarjeta `4242 4242 4242 4242`. Onboarding de prueba: usar los datos de prueba de Stripe para Express.
- `stripe listen --forward-to <url>/functions/v1/stripe-webhook` para desarrollo local.

## Notas y pendientes
- Reembolsos: Stripe **no devuelve** sus comisiones de procesamiento en pagos reembolsados; ese costo lo absorbe
  Maddi salvo que se descuente al propietario/anunciante.
- Lo ya liberado al propietario no se recupera automáticamente si luego hay una disputa (se revertiría manualmente
  con una *transfer reversal* desde Stripe).
- Propietarios Fundadores (sin comisión): `commission_rate = 0` en su `platform_commissions` (los tramos usan esa tasa).
- Los plazos (48 h, 30 días, tabla de reembolsos) están en `supabase/functions/_shared/payout-math.ts`,
  `src/lib/cancellation.ts` y la migración; cámbialos en los tres sitios.
- Actualizar Términos y Condiciones con la política de cancelación, retención y disputas (revisión legal).
- Facturación/CFDI no está incluida.
