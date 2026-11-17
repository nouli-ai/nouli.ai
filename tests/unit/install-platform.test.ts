import { expect, test } from "vitest";
import { detectInstallPlatform, isInstallPlatform } from "../../src/lib/install-platform";

test.each([
  ["MacIntel", "Mozilla Macintosh", 0, "macos"],
  ["Win32", "Mozilla Windows NT 10.0", 0, "windows"],
  ["Linux aarch64", "Mozilla Linux", 0, "linux"],
  ["MacIntel", "Mozilla Macintosh", 5, undefined],
  ["Linux armv8l", "Mozilla Android", 5, undefined],
  ["iPhone", "Mozilla iPhone", 5, undefined],
  ["", "unknown", 0, undefined],
] as const)(
  "detects %s without treating a mobile device as a supported desktop",
  (platform, agent, touches, expected) => {
    expect(detectInstallPlatform(platform, agent, touches)).toBe(expected);
  },
);

test("only recognizes the three supported URL choices", () => {
  for (const value of ["macos", "linux", "windows"]) expect(isInstallPlatform(value)).toBe(true);
  for (const value of [null, "", "android", "WINDOWS"])
    expect(isInstallPlatform(value)).toBe(false);
});
