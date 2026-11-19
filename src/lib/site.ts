/** Site-wide facts: where Nouli lives, how to install it, and the shared navigation. */

export const siteOrigin = "https://nouli.ai";
export const repository = "https://github.com/nouli-ai/nouli";
export const huggingFace = "https://huggingface.co/nouli-ai";
export const latestRelease = `${repository}/releases/latest`;

export const install = {
  homebrew: "brew install nouli-ai/tap/nouli",
  script: `curl -fsSL ${siteOrigin}/install.sh | sh`,
  windows: `irm ${siteOrigin}/install.ps1 | iex`,
} as const;

export interface Link {
  href: string;
  label: string;
}

/** Where "Run Nouli on your traffic" and "Talk to us" lead while the hosted platform is in early access. */
const contactEmail = "nouli@aravindn.com";
export const contact = {
  email: contactEmail,
  href: `mailto:${contactEmail}?subject=${encodeURIComponent("Run Nouli on our traffic")}`,
} as const;

/** The section of the site a page belongs to, marked as current in the navigation. */
export type Section = "models" | "guide" | "examples";

/** The main navigation. Pages without a section, such as the home page's anchors, are never current. */
export const hiveNavigation: readonly (Link & { section?: Section })[] = [
  { href: "/#how", label: "How it works" },
  { href: "/examples/", label: "Examples", section: "examples" },
  { href: "/models/", label: "Models", section: "models" },
  { href: "/guide/", label: "Open source", section: "guide" },
];
