import type { Network } from "./networks";

/**
 * The invented network drawn as atmosphere behind the home page's closing panel. It makes judgment
 * calls a fixed rule can't (intent, credibility) from more than one source, and leaves exact work
 * such as amounts to code.
 */

/** Support: a refund request, with a what-if on the customer's order history. */
export const refundReview: Network = {
  label: "Support",
  session: "refund-review",
  steps: [
    {
      kind: "fact",
      id: "ticket",
      source: "Support email",
      text: "“Box came crushed and the lamp base is cracked. Honestly I just want my money back.”",
    },
    {
      kind: "fact",
      id: "carrier",
      source: "Carrier",
      text: "Delivered Tue 2:14 pm · left at door",
    },
    { kind: "fact", id: "orders", source: "Order history", text: "$84 lamp · 1 return in 2 years" },
    {
      kind: "choice",
      id: "intent",
      prompt: "What does the customer want?",
      options: [
        ["Refund", 0.81],
        ["Replacement", 0.12],
        ["Store credit", 0.05],
        ["Just venting", 0.02],
      ],
      from: ["ticket"],
    },
    {
      kind: "choice",
      id: "arrival",
      prompt: "How did the order arrive?",
      options: [
        ["Damaged", 0.84],
        ["Never arrived", 0.03],
        ["Fine", 0.13],
      ],
      from: ["ticket", "carrier"],
    },
    {
      kind: "yes/no",
      id: "abuse",
      prompt: "Does this look like refund abuse?",
      options: [
        ["No", 0.93],
        ["Yes", 0.07],
      ],
      from: ["ticket", "orders"],
    },
    {
      kind: "choice",
      id: "resolve",
      prompt: "How should we resolve it?",
      options: [
        ["Refund now", 0.78],
        ["Send replacement", 0.14],
        ["Escalate", 0.08],
      ],
      from: ["intent", "arrival", "abuse"],
    },
    {
      kind: "computed",
      id: "action",
      name: "Action",
      value: "Refund $84 to card · reply drafted",
      from: ["resolve", "orders"],
    },
  ],
  branch: [
    {
      kind: "fact",
      id: "orders-what-if",
      source: "What if",
      text: "4 damage claims in 90 days",
    },
    {
      kind: "yes/no",
      id: "abuse-what-if",
      prompt: "Does this look like refund abuse?",
      options: [
        ["No", 0.31],
        ["Yes", 0.69],
      ],
      from: ["ticket", "orders-what-if"],
    },
    {
      kind: "choice",
      id: "resolve-what-if",
      prompt: "How should we resolve it?",
      options: [
        ["Refund now", 0.12],
        ["Send replacement", 0.2],
        ["Escalate", 0.68],
      ],
      from: ["intent", "arrival", "abuse-what-if"],
    },
    {
      kind: "computed",
      id: "action-what-if",
      name: "Action",
      value: "Hold refund · send to fraud review",
      from: ["resolve-what-if"],
    },
  ],
};
