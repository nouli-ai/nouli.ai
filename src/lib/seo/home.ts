import { contact, huggingFace, repository, siteOrigin } from "../site";
export const homeTitle = "Nouli · right-sized intelligence for AI agents";
export const homeDescription =
  "Nouli runs each step of your AI agent on the cheapest option that gives the same answer: a smaller LLM, a decision network, a fine-tuned model or code.";
/** Structured data for the company, its open-source engine and its models. */
export const homeApplication = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${siteOrigin}/#organization`,
  name: "Nouli",
  url: `${siteOrigin}/`,
  description: homeDescription,
  logo: `${siteOrigin}/brand/bee.svg`,
  email: contact.email,
  sameAs: [repository, huggingFace],
};
