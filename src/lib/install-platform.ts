/** The desktop installation choices; detection is a convenience and selection stays explicit. */
export type InstallPlatform = "macos" | "linux" | "windows";

export function isInstallPlatform(value: string | null): value is InstallPlatform {
  return value === "macos" || value === "linux" || value === "windows";
}

export function detectInstallPlatform(
  platform: string,
  userAgent: string,
  maxTouchPoints: number,
): InstallPlatform | undefined {
  if (/android|iphone|ipad|ipod/iu.test(userAgent)) return undefined;
  if (/win/iu.test(platform)) return "windows";
  if (/mac/iu.test(platform)) return maxTouchPoints > 1 ? undefined : "macos";
  if (/linux/iu.test(platform)) return "linux";
  return undefined;
}
