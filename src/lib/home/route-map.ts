import { edgePath } from "./layout";
import type { Point } from "./layout";

/**
 * The home hero's illustrative routing map: one agent's steps, each shown on what it runs on.
 * Positions are fractions of the map's box, computed here at build time.
 */

export interface RouteTarget {
  readonly id: string;
  /** What the step runs on. */
  readonly runsOn: string;
  /** An invented step of a support agent that fits it. */
  readonly step: string;
}

export const routeTargets: readonly RouteTarget[] = [
  { id: "llm", runsOn: "Your LLM", step: "Write the reply to the customer" },
  { id: "small", runsOn: "Smaller LLM", step: "Summarize the ticket" },
  { id: "network", runsOn: "Decision network", step: "Is this a refund request?" },
  { id: "tuned", runsOn: "Fine-tuned network", step: "Which team gets this ticket?" },
  { id: "code", runsOn: "Code", step: "Is the order past 30 days?" },
];

export interface PlacedTarget extends RouteTarget {
  readonly at: Point;
  /** The edge from Nouli to this target, in the map's 1000-unit viewBox. */
  readonly path: string;
}

export interface RouteLayout {
  readonly agent: Point;
  readonly nouli: Point;
  /** The edge from the agent to Nouli. */
  readonly feed: string;
  readonly targets: readonly PlacedTarget[];
}

/** Agent on the left, Nouli in the middle, and the targets spread evenly down the right. */
export function routeLayout(targets: readonly RouteTarget[] = routeTargets): RouteLayout {
  if (targets.length === 0) throw new Error("The route map needs at least one target");
  const agent = { x: 0.115, y: 0.5 };
  const nouli = { x: 0.385, y: 0.5 };
  const span = 0.8;
  const step = targets.length > 1 ? span / (targets.length - 1) : 0;
  return {
    agent,
    nouli,
    feed: edgePath(agent, nouli, "wide"),
    targets: targets.map((target, index) => {
      const at = { x: 0.79, y: targets.length > 1 ? 0.1 + index * step : 0.5 };
      return { ...target, at, path: edgePath(nouli, at, "wide") };
    }),
  };
}
