

## Plan: Ajustes de reservas digitales, admin info y banner promocional

### Resumen

Tres cambios independientes: (1) soporte para reservas simultáneas en pantallas digitales y opción "digital" para otros tipos, (2) mostrar email y último inicio de sesión en admin, (3) banner promocional en la página principal.

---

### 1. Soporte para reservas simultáneas en pantallas digitales

**Problema:** Actualmente todas las propiedades bloquean fechas cuando tienen una reserva aprobada. Las pantallas digitales deberían permitir múltiples campañas simultáneas.

**Cambios necesarios:**

#### 1a. Base de datos — Nueva columna `is_digital`
- Migración SQL: `ALTER TABLE billboards ADD COLUMN is_digital boolean NOT NULL DEFAULT false;`
- Para `billboard_type = 'pantalla_digital'`, se seteará `is_digital = true` por defecto en el formulario.
- Para otros tipos, el usuario podrá elegir si es digital o no.

#### 1b. Formulario de registro (`AddProperty.tsx`)
- En Step 4, después de seleccionar el tipo de espacio:
  - Si `billboard_type === 'pantalla_digital'`: auto-set `isDigital = true`, no mostrar opción.
  - Para los demás tipos: mostrar una pregunta "¿Es formato digital?" con botones Sí/No (mismo estilo que iluminación).
- Al enviar, incluir `is_digital` en el insert.

#### 1c. Trigger de overlapping (`check_booking_overlap`)
- Modificar para que **no valide solapamiento** si el billboard tiene `is_digital = true`.
- SQL: Agregar condición al inicio del trigger que consulte `billboards.is_digital` y si es `true`, retornar `NEW` sin validar.

#### 1d. Calendario de disponibilidad (`AvailabilityCalendar.tsx`)
- Recibir prop `isDigital: boolean`.
- Si `isDigital = true`: no deshabilitar fechas por bookings aprobados, no mostrar indicadores de "Reservado/Pendiente".
- Mostrar leyenda simplificada.

#### 1e. Diálogo de reserva (`BookingDialog.tsx`)
- Acceder a `is_digital` del billboard.
- Si `isDigital = true`: no buscar bookings existentes, no validar conflictos de fechas, no deshabilitar fechas ocupadas.

#### 1f. Página de detalle (`BillboardDetail.tsx`)
- Pasar `isDigital` al `AvailabilityCalendar` y al `BookingDialog`.

---

### 2. Admin: email y último inicio de sesión

**Problema:** El admin no puede ver el email real ni cuándo fue el último login. Los emails se obtienen de `email_notifications` como workaround, lo cual es poco confiable.

**Cambios en `UserManagement.tsx`:**

- **Email**: Crear un edge function `get-user-emails` que use `supabase.auth.admin.listUsers()` con el service role key para obtener emails reales. La edge function recibe una lista de user_ids y retorna un map de `{user_id: email, last_sign_in_at}`.
- **Último inicio de sesión**: La misma edge function retorna `last_sign_in_at` de `auth.users`.
- En la tabla, agregar columna "Último acceso" mostrando la fecha formateada.
- En el detalle del usuario, mostrar también esta información.

**Edge function `get-admin-user-details/index.ts`:**
- Verificar que el caller sea admin (consultar `admin_users`).
- Usar `supabase.auth.admin.listUsers()` para obtener emails y `last_sign_in_at`.
- Retornar mapeo por user_id.

---

### 3. Banner promocional en la página principal

**Referencia:** Banner estilo FTMO con fondo oscuro/gradiente, texto centrado con badge "Nuevo".

**Cambios:**

#### 3a. Nuevo componente `PromoBanner.tsx`
- Banner sticky en la parte superior de la landing.
- Fondo con gradiente oscuro sutil (verde muy sutil para coincidir con la marca).
- Contenido: Badge "Nuevo" (verde) + texto "Lanzamiento 2026 — Sin comisión para Propietarios Fundadores" + "Conocer más →".
- Link a `https://maddi.com.mx/auth?role=owner`.
- Botón de cerrar (X) que oculta el banner usando localStorage para recordar la preferencia.
- Responsive: texto más pequeño en móvil.

#### 3b. `Index.tsx`
- Importar y renderizar `PromoBanner` como primer elemento antes de `HeroSection`.

---

### Detalle técnico

```text
Archivos a crear:
├── src/components/PromoBanner.tsx          (banner promocional)
├── supabase/functions/get-admin-user-details/index.ts  (edge function)
├── supabase/migrations/XXXX_add_is_digital.sql

Archivos a modificar:
├── src/pages/Index.tsx                     (agregar PromoBanner)
├── src/pages/AddProperty.tsx               (opción digital, guardar is_digital)
├── src/components/booking/BookingDialog.tsx (skip overlap para digitales)
├── src/components/booking/AvailabilityCalendar.tsx (skip blocking para digitales)
├── src/pages/BillboardDetail.tsx           (pasar isDigital)
├── src/components/admin/UserManagement.tsx  (email real + último acceso)
├── supabase: migration para is_digital + modificar trigger
```

