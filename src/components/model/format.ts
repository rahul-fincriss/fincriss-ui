export function formatGovDate(d?: Date): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatPct(v: number | null | undefined, digits = 0): string {
  return v === null || v === undefined ? '—' : `${(v * 100).toFixed(digits)}%`;
}

export function formatAuc(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : v.toFixed(2);
}
