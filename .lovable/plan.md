

## Plan: Fix Email CTAs + Add Animated Booking Success Screen

### Problem 1: Broken Email Links (404s)
The email templates in `send-notification-email` Edge Function use old route paths that don't exist in the app router:

| Email Type | Current (broken) | Correct |
|---|---|---|
| `booking_request` | `/owner-dashboard?tab=reservas` | `/owner?tab=reservas&booking={bookingId}` |
| `booking_request_confirmation` | `/business-dashboard` | `/business?booking={bookingId}` |
| `booking_confirmed` | `/business-dashboard` | `/business?booking={bookingId}` |
| `booking_cancelled` (business) | `/business-dashboard` | `/business` |
| `booking_cancelled` (owner) | `/owner-dashboard` | `/owner?tab=reservas` |
| `property_paused` | `/owner-dashboard` | `/owner` |
| `welcome` (owner) | `/owner-dashboard` | `/owner` |

The `entityId` (booking ID) is already passed to the Edge Function but not used in the URLs. We will add deep linking with `?booking={bookingId}` where applicable.

**File:** `supabase/functions/send-notification-email/index.ts` — Update all CTA URLs in the `getEmailContent` switch.

### Problem 2: Animated Booking Success Screen
Currently, after submitting a booking request, the dialog closes and shows a `toast.success`. The user wants a celebratory animated screen.

**Approach:**
1. Create a new component `src/components/booking/BookingSuccessScreen.tsx` — A full-screen or dialog overlay with:
   - Animated checkmark (CSS animation, no dependencies)
   - Confetti-like subtle particle animation (CSS keyframes)
   - Billboard title and dates summary
   - Message: "El propietario revisará tu solicitud y se pondrá en contacto contigo para coordinar detalles y pago."
   - CTA button: "Ver mis campañas" → navigates to `/business`
   - Secondary: "Seguir buscando" → closes and stays on current page

2. Modify `src/components/booking/BookingDialog.tsx`:
   - After successful booking submission, instead of closing the dialog + toast, show the success screen inside the dialog
   - Add state `bookingSuccess` with the booking data
   - When `bookingSuccess` is set, render `BookingSuccessScreen` instead of the form

**Design:** Dark theme consistent with the app (bg `#1A1A1A`, accent `#9BFF43`), with a scale-in animation for the checkmark and a fade-in for the text content.

### Summary of Changes
| File | Change |
|---|---|
| `supabase/functions/send-notification-email/index.ts` | Fix all CTA URLs to match actual routes, add deep linking with booking IDs |
| `src/components/booking/BookingSuccessScreen.tsx` | New animated success screen component |
| `src/components/booking/BookingDialog.tsx` | Show success screen after booking instead of toast+close |

