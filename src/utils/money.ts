export const toCents = (v: number) => Math.round(v * 100);
export const fromCents = (v: number) => Number((v / 100).toFixed(2));
export const add = (a: number, b: number) => fromCents(toCents(a) + toCents(b));
export const sub = (a: number, b: number) => fromCents(toCents(a) - toCents(b));
