import { z } from "astro/zod";

const money = z.number().nonnegative();
const share = z.number().min(0).max(1);

/** Where a replayed call ended up, with how many calls went there and what they cost. */
export const trafficRoute = z.object({
  key: z.enum(["cache", "code", "decision", "frontier"]),
  name: z.string(),
  calls: z.number().nonnegative(),
  cost: money,
});
export type TrafficRoute = z.infer<typeof trafficRoute>;

/** A replay of real LLM traffic, priced with every call on a frontier model and routed. */
export const traffic = z
  .object({
    version: z.literal(1),
    source: z.object({
      name: z.string(),
      license: z.string(),
      url: z.url(),
      replayed: z.string(),
      jobs: z.number().int().positive(),
    }),
    frontier: z.object({ model: z.string() }),
    totalCalls: z.number().positive(),
    frontierOnlyCost: money,
    routedCost: money,
    routes: z.array(trafficRoute).min(1),
    savings: z.object({ both: share }),
  })
  .refine((t) => Math.abs(t.routes.reduce((sum, r) => sum + r.calls, 0) - t.totalCalls) < 1, {
    message: "Routed calls must add up to the total",
  })
  .refine((t) => Math.abs(t.routes.reduce((sum, r) => sum + r.cost, 0) - t.routedCost) < 0.01, {
    message: "Route costs must add up to the routed cost",
  })
  .refine((t) => Math.abs(1 - t.routedCost / t.frontierOnlyCost - t.savings.both) < 0.001, {
    message: "The combined saving must match the two costs",
  });
export type Traffic = z.infer<typeof traffic>;
