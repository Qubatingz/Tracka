// Places in Rwanda (district towns + common old names and Kigali areas) → [longitude, latitude].
const P: Record<string, [number, number]> = {
  kigali: [30.06, -1.95], nyarugenge: [30.06, -1.95], gasabo: [30.11, -1.9], kicukiro: [30.1, -1.99], remera: [30.11, -1.96],
  kimironko: [30.13, -1.93], nyamirambo: [30.04, -1.98], kacyiru: [30.09, -1.94], kimihurura: [30.09, -1.95], kanombe: [30.14, -1.97],
  gisozi: [30.06, -1.92], kibagabaga: [30.12, -1.92], gikondo: [30.08, -1.98], nyabugogo: [30.05, -1.94], kinyinya: [30.1, -1.91],
  musanze: [29.63, -1.5], ruhengeri: [29.63, -1.5], rubavu: [29.26, -1.69], gisenyi: [29.26, -1.69], huye: [29.74, -2.6], butare: [29.74, -2.6],
  rusizi: [28.91, -2.48], cyangugu: [28.91, -2.48], kamembe: [28.91, -2.48], nyagatare: [30.33, -1.3], muhanga: [29.76, -2.08], gitarama: [29.76, -2.08],
  rwamagana: [30.43, -1.95], karongi: [29.35, -2.06], kibuye: [29.35, -2.06], nyamagabe: [29.57, -2.48], gikongoro: [29.57, -2.48],
  nyanza: [29.75, -2.35], kayonza: [30.51, -1.9], kirehe: [30.71, -2.27], ngoma: [30.54, -2.16], kibungo: [30.54, -2.16],
  bugesera: [30.09, -2.15], nyamata: [30.09, -2.15], gicumbi: [30.07, -1.58], byumba: [30.07, -1.58], rulindo: [29.99, -1.73],
  gakenke: [29.78, -1.69], burera: [29.85, -1.47], gatsibo: [30.43, -1.59], kamonyi: [29.9, -2.01], ruhango: [29.78, -2.23],
  nyabihu: [29.51, -1.65], ngororero: [29.62, -1.87], rutsiro: [29.32, -1.93], nyamasheke: [29.1, -2.33], nyaruguru: [29.53, -2.65],
  gisagara: [29.84, -2.59], kabarore: [30.38, -1.6], rubengera: [29.39, -2.05],
};

const KIGALI = ['kigali', 'nyarugenge', 'gasabo', 'kicukiro', 'remera', 'kimironko', 'nyamirambo', 'kacyiru', 'kimihurura', 'kanombe', 'gisozi', 'kibagabaga', 'gikondo', 'nyabugogo', 'kinyinya'];

// name = what the promoter wrote (e.g. Remera); group = the dot on the map (e.g. Kigali)
export type Place = { name: string; group: string; lon: number; lat: number };

export function placeOf(location: string | null | undefined): Place | null {
  const t = String(location || '').toLowerCase();
  if (!t.trim()) return null;
  // the longest name that appears wins ("Kicukiro, Kigali" → Kicukiro)
  let best = '';
  for (const k of Object.keys(P)) if (k.length > best.length && new RegExp(`\\b${k}\\b`).test(t)) best = k;
  if (!best) return null;
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
  const g = KIGALI.includes(best) ? 'kigali' : best;
  return { name: cap(best), group: cap(g), lon: P[g][0], lat: P[g][1] };
}

// Promoters who work online have no place on the map.
export const ONLINE = ['tiktok', 'youtube', 'blog', 'influencer'];

// A simple outline of Rwanda (longitude, latitude), clockwise from Lake Kivu.
export const OUTLINE: [number, number][] = [
  [29.26, -1.68], [29.37, -1.52], [29.46, -1.46], [29.6, -1.38], [29.74, -1.34], [29.88, -1.39], [30.02, -1.43], [30.16, -1.3],
  [30.32, -1.12], [30.47, -1.06], [30.6, -1.24], [30.74, -1.44], [30.82, -1.7], [30.84, -1.95], [30.8, -2.15], [30.86, -2.32],
  [30.79, -2.39], [30.6, -2.4], [30.45, -2.35], [30.28, -2.38], [30.1, -2.43], [29.96, -2.48], [29.9, -2.64], [29.8, -2.77],
  [29.62, -2.82], [29.4, -2.8], [29.2, -2.66], [29.03, -2.73], [28.98, -2.62], [28.9, -2.5], [28.95, -2.35], [29.05, -2.2],
  [29.15, -2.05], [29.25, -1.95], [29.3, -1.84], [29.27, -1.75],
];
export const BOX = { w0: 28.8, w1: 30.95, n: -0.98, s: -2.9 };
