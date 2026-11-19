import { install } from "./site";

export const installationPlatforms = [
  {
    id: "macos",
    os: "macOS",
    code: install.homebrew,
    label: "Copy the Homebrew install command",
  },
  {
    id: "linux",
    os: "Linux",
    code: install.script,
    label: "Copy the download installer command",
  },
  {
    id: "windows",
    os: "Windows",
    code: install.windows,
    label: "Copy the PowerShell install command",
  },
] as const;
