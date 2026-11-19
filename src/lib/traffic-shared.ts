/** Formatting and geometry shared by the traffic comparison's build-time layout and its script. */

/** A whole percentage, as the page prints it. */
export const percent = (share: number): string => `${Math.round(share * 100)}%`;

export const count = (n: number): string => Math.round(n).toLocaleString("en-US");

export const dollars = (n: number): string =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The flow's coordinate box: the panel draws it in a 1000 × 600 viewBox. */
export const box = { width: 1000, height: 600, x0: 210, x1: 600, top: 60, span: 480, gap: 44 };

/**
 * Where a dot is along its band at progress `t` (0 to 1), `u` of the way across the band's
 * thickness: it eases across horizontally and bends between the band's two ends.
 */
export function dotPoint(
  from: readonly [number, number],
  to: readonly [number, number],
  u: number,
  t: number,
): [x: number, y: number] {
  const ys = from[0] + (from[1] - from[0]) * u;
  const ye = to[0] + (to[1] - to[0]) * u;
  const x = box.x0 + (box.x1 - box.x0) * (1.5 * t - 1.5 * t * t + t * t * t);
  return [x, ys + (ye - ys) * (3 * t * t - 2 * t * t * t)];
}
