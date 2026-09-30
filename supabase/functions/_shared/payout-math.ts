// Lógica pura (sin dependencias) del calendario de pagos y la política de reembolsos.
// Hay una copia para el cliente en src/lib/cancellation.ts: mantener ambas iguales.

export const PERIOD_DAYS = 30;

export interface Period {
  seq: number;
  start: string; // YYYY-MM-DD
  end: string;
  grossCents: number;
}

const DAY_MS = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Fecha "de hoy" en México (UTC-6, sin horario de verano desde 2022). */
export function todayMx(now = new Date()): string {
  return toDate(now.getTime() - 6 * 3_600_000);
}

export function diffDays(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / DAY_MS);
}

/** Divide la campaña (fechas inclusivas) en periodos de 30 días, repartiendo el total por días. */
export function buildPeriods(startDate: string, endDate: string, totalCents: number): Period[] {
  const totalDays = diffDays(startDate, endDate) + 1;
  const n = Math.max(1, Math.ceil(totalDays / PERIOD_DAYS));
  const periods: Period[] = [];
  let allocated = 0;
  for (let k = 0; k < n; k++) {
    const startMs = toMs(startDate) + k * PERIOD_DAYS * DAY_MS;
    const endMs = Math.min(startMs + (PERIOD_DAYS - 1) * DAY_MS, toMs(endDate));
    const days = Math.round((endMs - startMs) / DAY_MS) + 1;
    const gross = k === n - 1 ? totalCents - allocated : Math.round((totalCents * days) / totalDays);
    allocated += gross;
    periods.push({ seq: k, start: toDate(startMs), end: toDate(endMs), grossCents: gross });
  }
  return periods;
}

export function splitFee(grossCents: number, rate: number) {
  const fee = Math.round(grossCents * rate);
  return { fee, net: grossCents - fee };
}

/**
 * Reembolso al anunciante que cancela una campaña pagada.
 *  - Antes del inicio: >14 días 100 %, 3–14 días 50 %, <3 días 0 %.
 *  - Ya iniciada: se reembolsan los periodos futuros (aún no liberados); el periodo en curso no.
 * `scheduled` son los tramos aún no liberados.
 */
export function advertiserRefundCents(
  scheduled: { grossCents: number; periodStart: string | null }[],
  startDate: string,
  today: string,
): { refundCents: number; percent: number | null } {
  const total = scheduled.reduce((s, p) => s + p.grossCents, 0);
  if (today < startDate) {
    const d = diffDays(today, startDate);
    const percent = d > 14 ? 1 : d >= 3 ? 0.5 : 0;
    return { refundCents: Math.round(total * percent), percent };
  }
  const future = scheduled
    .filter((p) => p.periodStart !== null && p.periodStart > today)
    .reduce((s, p) => s + p.grossCents, 0);
  return { refundCents: future, percent: null };
}
