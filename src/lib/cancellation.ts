// Copia cliente de supabase/functions/_shared/payout-math.ts (solo la parte de reembolso).
// Es una ESTIMACIÓN para mostrar al usuario; el servidor recalcula al cancelar.

const DAY_MS = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const todayMx = () => toDate(Date.now() - 6 * 3_600_000);
const diffDays = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY_MS);

export function estimateAdvertiserRefund(
  totalPrice: number,
  startDate: string,
  endDate: string,
  today = todayMx(),
): { refund: number; percent: number | null } {
  const totalCents = Math.round(totalPrice * 100);
  if (today < startDate) {
    const d = diffDays(today, startDate);
    const percent = d > 14 ? 1 : d >= 3 ? 0.5 : 0;
    return { refund: Math.round(totalCents * percent) / 100, percent };
  }
  // Campaña iniciada: periodos de 30 días que aún no comienzan.
  const totalDays = diffDays(startDate, endDate) + 1;
  const n = Math.max(1, Math.ceil(totalDays / 30));
  let allocated = 0;
  let future = 0;
  for (let k = 0; k < n; k++) {
    const pStart = toDate(toMs(startDate) + k * 30 * DAY_MS);
    const pEnd = Math.min(toMs(pStart) + 29 * DAY_MS, toMs(endDate));
    const days = Math.round((pEnd - toMs(pStart)) / DAY_MS) + 1;
    const gross = k === n - 1 ? totalCents - allocated : Math.round((totalCents * days) / totalDays);
    allocated += gross;
    if (pStart > today) future += gross;
  }
  return { refund: future / 100, percent: null };
}
