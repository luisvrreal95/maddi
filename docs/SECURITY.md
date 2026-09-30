# Seguridad de las Edge Functions

Utilidades comunes en `supabase/functions/_shared/http.ts` (CORS, auth, rate limit, validación).

## Niveles de acceso

| Nivel | Funciones | Control |
|---|---|---|
| **Interna** (service role o `x-cron-secret`) | `release-payouts`, `campaign-lifecycle-notifications`, `owner-activation-reminder`, `stripe-onboarding-reminder` | `CRON_SECRET`; se ejecutan con pg_cron |
| **Usuario con sesión** | `stripe-connect`, `create-checkout-session`, `cancel-booking`, `booking-event`, `delete-user-account` | JWT + verificación de pertenencia |
| **Admin** | `resolve-dispute`, `get-admin-user-details`, `send-admin-invite` (super admin) | JWT + `admin_users` |
| **Pública con límite por IP** | `search-poi`, `get-mapbox-token`, `get-tomtom-*`, `get-traffic-estimate`, `analyze-nearby-poi`, `ai-search`, `get-traffic-data`, `get-poi-overview`, `analyze-inegi-data`, `validate-admin-invite`, `accept-admin-invite` | rate limit (tabla `rate_limits`), validación de entrada |
| **Webhooks / hooks** | `stripe-webhook` (firma Stripe), `auth-email-hook` (firma del hook), `process-email-queue` (JWT) | firma |
| **Correo** | `send-notification-email` | ver abajo |

### `send-notification-email`
- **Sin sesión:** solo `support_contact`, `valuation_result` y `valuation_admin_notification`; destinatario fijado por el servidor
  (`SUPPORT_EMAIL` / `ADMIN_NOTIFY_EMAIL`) o el correo del propio visitante (máx. 3/día por correo, 10/h por IP).
- **Con sesión:** solo tipos de usuario, y únicamente hacia usuarios con conversación/reserva en común (`users_related`) o hacia sí mismo.
  El cliente ya no elige el correo destino ni la base de los enlaces.
- **Admin:** además verificación y pausa/reactivación de propiedades.
- **Interno:** todos los tipos.
- Todo texto recibido en `data` se escapa antes de insertarse en el HTML.

### Datos por espectáculo (`get-traffic-data`, `get-poi-overview`, `analyze-inegi-data`)
Usan siempre las coordenadas guardadas del espectacular (no las del cliente) y solo el propietario o un admin pueden forzar
recálculo (`force_refresh`). Antes cualquiera podía sobrescribir `daily_impressions` de cualquier espectacular.

### Invitaciones de admin
`accept-admin-invite` exige que la cuenta tenga el mismo email que la invitación y consume la invitación de forma atómica.

### Eliminado
`send-verification-email` (sin uso; permitía enviar correos de "verificación" con un enlace arbitrario → phishing).

## Variables
```
CRON_SECRET=<aleatorio largo>          # también en Vault como cron_secret
SUPPORT_EMAIL=soporte@maddi.com.mx     # destino de support_contact
ADMIN_NOTIFY_EMAIL=...                 # destino de avisos al equipo
ALLOWED_ORIGINS=https://preview.ej.com # orígenes extra para CORS (por defecto: maddi.com.mx y localhost)
```

## Acciones manuales recomendadas
- **Mapbox:** el token público se entrega al navegador por diseño; restringe su uso por URL (`maddi.com.mx`) en el panel de Mapbox.
- **TomTom:** `get-tomtom-tile-url` devuelve URLs de tiles con la API key (el navegador las necesita). Restringe la key por dominio
  en TomTom y fija cuotas de gasto; usa una key distinta para el servidor (`TOMTOM_API_KEY`) y para tiles (`MADDI_TOMTOM_API_KEY`).
- Si haces pruebas desde otro dominio (p. ej. previews de Vercel), agrégalo a `ALLOWED_ORIGINS` o el navegador bloqueará las llamadas.
- Ajusta los límites (`gate(...)`) si el tráfico legítimo los alcanza.
