/** Derives a field `key` from its label so the user is never asked to type
 * one - e.g. "Date de réception" -> "date_de_reception". */
export function slugifyKey(label: string): string {
  const normalized = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  const key = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return key || "champ";
}

/** Appends _2, _3, ... until the key isn't already in `used`. */
export function uniqueKey(base: string, used: string[]): string {
  if (!used.includes(base)) return base;
  let suffix = 2;
  while (used.includes(`${base}_${suffix}`)) suffix++;
  return `${base}_${suffix}`;
}
