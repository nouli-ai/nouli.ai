import raw from "../data/traffic/wildchat.json";
import { traffic } from "./schemas/traffic";
import type { Traffic, TrafficRoute } from "./schemas/traffic";
import { box } from "./traffic-shared";

export { box, count, dollars, percent } from "./traffic-shared";

/** The WildChat replay: real ChatGPT calls priced on a frontier model and routed through Nouli. */
export const wildchat: Traffic = traffic.parse(raw);

export interface Band extends TrafficRoute {
  readonly share: number;
  /** Where the band leaves the incoming calls, top and bottom. */
  readonly from: readonly [number, number];
  /** Where the band arrives, top and bottom. */
  readonly to: readonly [number, number];
  /** The band's outline. */
  readonly path: string;
  /** The vertical center of its label card. */
  readonly labelY: number;
}

const f = (n: number): string => n.toFixed(1);

/** One band's outline between its two vertical spans. */
function bandPath(from: readonly [number, number], to: readonly [number, number]): string {
  const { x0, x1 } = box;
  const mid = (x0 + x1) / 2;
  return (
    `M${f(x0)} ${f(from[0])}C${f(mid)} ${f(from[0])} ${f(mid)} ${f(to[0])} ${f(x1)} ${f(to[0])}` +
    `L${f(x1)} ${f(to[1])}C${f(mid)} ${f(to[1])} ${f(mid)} ${f(from[1])} ${f(x0)} ${f(from[1])}Z`
  );
}

/**
 * Lay routes out as bands from one incoming block to separate destinations. Each band leaves the
 * block in proportion to its share and keeps a visible minimum thickness where it arrives; the
 * arriving ends are centered in the box.
 */
export function flowBands(routes: readonly TrafficRoute[], total: number): Band[] {
  if (routes.length === 0) throw new Error("A flow needs at least one route");
  const { top, span, gap } = box;
  const inner = span - gap * (routes.length - 1);
  // Arriving ends are thinner than where they leave, so the split fans out visibly.
  const thickness = routes.map((route) => Math.max((route.calls / total) * inner * 0.8, 8));
  const used = thickness.reduce((sum, t) => sum + t, 0) + gap * (routes.length - 1);
  let fromY = top;
  let toY = top + (span - used) / 2;
  const bands = routes.map((route, i) => {
    const share = route.calls / total;
    const from = [fromY, fromY + share * span] as const;
    const to = [toY, toY + (thickness[i] ?? 0)] as const;
    fromY = from[1];
    toY = to[1] + gap;
    return { ...route, share, from, to, path: bandPath(from, to), labelY: (to[0] + to[1]) / 2 };
  });
  return spreadLabels(bands);
}

/** Push label centers apart so cards of `height` never overlap, and keep them inside the box. */
export function spreadLabels(bands: Band[], height = 44, gap = 10): Band[] {
  const ys = bands.map((band) => band.labelY);
  for (let i = 1; i < ys.length; i += 1)
    ys[i] = Math.max(ys[i] ?? 0, (ys[i - 1] ?? 0) + height + gap);
  const over = (ys.at(-1) ?? 0) + height / 2 - (box.height - 8);
  if (over > 0) for (let i = 0; i < ys.length; i += 1) ys[i] = (ys[i] ?? 0) - over;
  for (let i = ys.length - 2; i >= 0; i -= 1)
    ys[i] = Math.min(ys[i] ?? 0, (ys[i + 1] ?? 0) - height - gap);
  return bands.map((band, i) => ({ ...band, labelY: ys[i] ?? band.labelY }));
}

/** The left panel: every call on the frontier model. */
export function frontierOnly(data: Traffic): TrafficRoute[] {
  return [
    {
      key: "frontier",
      name: "Frontier model",
      calls: data.totalCalls,
      cost: data.frontierOnlyCost,
    },
  ];
}

/** A coordinate in the flow's box as a CSS percentage of the box. */
export const boxPercent = (n: number, of: number): string => `${((n / of) * 100).toFixed(2)}%`;

export interface TrafficSide {
  readonly id: "frontier" | "nouli";
  readonly caption: string;
  readonly bands: Band[];
  readonly cost: number;
}

/** The two panels: every call on the frontier model, and the same calls routed through Nouli. */
export function trafficSides(data: Traffic): TrafficSide[] {
  return [
    {
      id: "frontier",
      caption: "Every call on a frontier model",
      bands: flowBands(frontierOnly(data), data.totalCalls),
      cost: data.frontierOnlyCost,
    },
    {
      id: "nouli",
      caption: "Through Nouli",
      bands: flowBands(data.routes, data.totalCalls),
      cost: data.routedCost,
    },
  ];
}
