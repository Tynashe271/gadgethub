export function normalizePhone(phone: string) {
  const compact = phone.trim().replace(/[\s()-]/g, '');
  if (/^0\d{9}$/.test(compact)) return `+263${compact.slice(1)}`;
  if (/^263\d{9}$/.test(compact)) return `+${compact}`;
  return compact;
}
