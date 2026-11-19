import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://api.github.com/**", (route) =>
    route.fulfill({ json: { tag_name: "v9.8.7" } }),
  );
});

test("the latest release is resolved at view time", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-latest-release]")).toHaveText("v9.8.7");
});

test("a failed release lookup retains the working generic link", async ({ page }) => {
  await page.route("https://api.github.com/**", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("/");
  await expect(page.locator("[data-latest-release]")).toHaveText("latest release");
  await expect(page.locator("[data-latest-release]")).toHaveAttribute(
    "href",
    /\/releases\/latest$/u,
  );
});

test("the home page reads fully without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Right-sized intelligence for AI agents.",
    );
    const map = page.getByRole("group", { name: /support agent's steps/u });
    for (const target of [
      "Your LLM",
      "Smaller LLM",
      "Decision network",
      "Fine-tuned network",
      "Code",
    ])
      // eslint-disable-next-line no-await-in-loop -- Each target is checked on the same page.
      await expect(map).toContainText(target);
    await expect(page.locator("#how video")).toHaveAttribute("controls", "");
    await expect(page.locator(".install code").first()).toHaveText(
      "brew install nouli-ai/tap/nouli",
    );
    await expect(page.locator(".install code").last()).toHaveText(
      "irm https://nouli.ai/install.ps1 | iex",
    );
  } finally {
    await context.close();
  }
});

test("every contact button opens an email to the team", async ({ page }) => {
  await page.goto("/");
  const links = page.getByRole("link", { name: /Run Nouli on your traffic|Talk to us/u });
  await expect(links).toHaveCount(3);
  for (const link of await links.all())
    // eslint-disable-next-line no-await-in-loop -- Each link is checked on the same page.
    await expect(link).toHaveAttribute("href", /^mailto:nouli@aravindn\.com\?subject=/u);
});

test("the prototype video plays on screen and respects a visitor's pause", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("#how video");
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(false);
  await video.evaluate((el: HTMLVideoElement) => {
    el.pause();
  });
  await page.evaluate(() => {
    scrollTo(0, 0);
  });
  await video.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  expect(await video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
});

test("the prototype video pauses offscreen and resumes on return", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("#how video");
  const paused = (): Promise<boolean> => video.evaluate((el: HTMLVideoElement) => el.paused);
  await video.scrollIntoViewIfNeeded();
  await expect.poll(paused).toBe(false);
  await page.evaluate(() => {
    scrollTo(0, 0);
  });
  await expect.poll(paused).toBe(true);
  await video.scrollIntoViewIfNeeded();
  await expect.poll(paused).toBe(false);
});

test("phones wait for a tap before playing the prototype video", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const video = page.locator("#how video");
  await video.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  expect(await video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
});

test("the prototype video stays still under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const video = page.locator("#how video");
  await video.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  expect(await video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
});

test("the Windows install command copies with the keyboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#install");
  await page.locator('label[for="install-os-windows"]').click();
  const copy = page.getByRole("button", { name: "Copy the PowerShell install command" });
  await copy.focus();
  await page.keyboard.press("Enter");
  await expect(copy.locator("..").getByRole("status")).toHaveText("Copied to the clipboard");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "irm https://nouli.ai/install.ps1 | iex",
  );
});

test("Windows guide paths wrap inside a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/guide/#install");
  const path = page.locator("p code").filter({
    hasText: "%LOCALAPPDATA%\\Programs\\Nouli\\bin\\nouli.exe",
  });
  await expect(path).toHaveCount(1);
  const rectangles = await path.evaluate((element) =>
    Array.from(element.getClientRects(), (rect) => ({ left: rect.left, right: rect.right })),
  );
  for (const rect of rectangles) {
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(390);
  }
});

for (const [platform, expected] of [
  ["MacIntel", "macos"],
  ["Linux x86_64", "linux"],
  ["Win32", "windows"],
] as const) {
  test(`installation defaults to ${platform}`, async ({ page }) => {
    await page.addInitScript((value) => {
      Object.defineProperty(navigator, "platform", { value });
    }, platform);
    await page.goto("/");
    await expect(page.locator(`#install-os-${expected}`)).toBeChecked();
    await expect(page.locator(".install .panel:visible")).toHaveCount(1);
  });
}

test("installation choices support keyboard, sharing, and history", async ({ page }) => {
  await page.goto("/?os=macos#install");
  await page.locator("#install-os-macos").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#install-os-linux")).toBeChecked();
  await expect(page).toHaveURL(/os=linux/u);
  await page.locator('label[for="install-os-windows"]').click();
  await expect(page.locator("#install-os-windows")).toBeChecked();
  await expect(page.locator('.panel[data-platform="windows"]')).toBeVisible();
  await page.goBack();
  await expect(page.locator("#install-os-linux")).toBeChecked();
  await page.goForward();
  await expect(page.locator("#install-os-windows")).toBeChecked();
  await page.reload();
  await expect(page.locator("#install-os-windows")).toBeChecked();
});

test("native installation choices work without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("/#install");
    for (const os of ["macos", "linux", "windows"]) {
      // eslint-disable-next-line no-await-in-loop -- Native choices on one page must be exercised sequentially.
      await page.locator(`label[for="install-os-${os}"]`).click();
      // eslint-disable-next-line no-await-in-loop -- Observe each choice before changing it.
      await expect(page.locator(`.panel[data-platform="${os}"]`)).toBeVisible();
    }
  } finally {
    await context.close();
  }
});
