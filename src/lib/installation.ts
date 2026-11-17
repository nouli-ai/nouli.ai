import { install } from "./site";

export const installationPlatforms = [
  {
    id: "macos",
    os: "macOS",
    code: install.homebrew,
    label: "Copy the Homebrew install command",
    detail: "Apple silicon · Homebrew",
  },
  {
    id: "linux",
    os: "Linux",
    code: install.script,
    label: "Copy the download installer command",
    detail: "ARM64 and x86_64 · Ubuntu 24.04 or compatible GNU/Linux",
  },
  {
    id: "windows",
    os: "Windows",
    code: install.windows,
    label: "Copy the PowerShell install command",
    detail: "Windows 11 · ARM64 and x64 · PowerShell",
  },
] as const;
