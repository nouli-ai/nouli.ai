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

test("the replay pauses, restarts, and settles when reduced motion changes", async ({ page }) => {
  const terminal = page.locator("cli-replay");
  const screen = terminal.locator("pre");
  await test.step("Load and reveal the recording", async () => {
    await page.clock.install();
    await page.goto("/");
    await expect(terminal).toHaveAttribute("data-columns", "160");
    await screen.scrollIntoViewIfNeeded();
  });
  await test.step("Advance playback", async () => {
    await page.clock.runFor(3000);
    await expect(terminal).toHaveAttribute("data-playing", "true");
  });
  await test.step("Pause and preserve the screen", async () => {
    await terminal.getByRole("button", { name: "Pause" }).click();
    await expect(terminal).toHaveAttribute("data-playing", "false");
    const paused = await screen.textContent();
    await page.clock.runFor(3000);
    expect(await screen.textContent()).toBe(paused);
  });
  await test.step("Restart playback", async () => {
    await terminal.getByRole("button", { name: "Restart" }).click();
    await page.clock.runFor(1000);
    await expect(terminal).toHaveAttribute("data-playing", "true");
  });
  await test.step("Honor live reduced motion", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(terminal).toHaveAttribute("data-playing", "false");
    await expect(screen).toContainText("How ready is the workshop?");
  });
});

test("small screens load only the narrow recording", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const recordings: string[] = [];
  page.on("request", (request) => {
    if (/\/(wide|narrow)\./u.test(request.url())) recordings.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator("cli-replay")).toHaveAttribute("data-columns", "64");
  expect(recordings.some((url) => url.includes("narrow."))).toBe(true);
  expect(recordings.some((url) => url.includes("wide."))).toBe(false);
});

test("the home page offers commands and the recorded screen without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "The platform for decision networks.",
    );
    await expect(page.locator("decision-net").first()).toContainText("Fight or accept?");
    await expect(page.locator(".cli-replay-screen")).toContainText("How ready is the workshop?");
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

test("operation cards switch the build network's mode", async ({ page }) => {
  await page.goto("/");
  const modes = page.locator("net-modes");
  await modes.getByRole("button", { name: /Branch/u }).click();
  await expect(modes.locator("decision-net")).toHaveAttribute("mode", "branch");
  await expect(modes.locator("[data-mode-label]")).toHaveText("branch");
  await expect(modes.locator('.node[data-id="resolve-what-if"]')).toBeVisible();
});

test("team tabs show one network at a time", async ({ page }) => {
  await page.goto("/");
  const tabs = page.locator("net-tabs");
  await tabs.getByRole("button", { name: "Sales" }).click();
  await expect(tabs.locator('[data-team-frame="Sales"]')).toBeVisible();
  await expect(tabs.locator('[data-team-frame="Support"]')).toBeHidden();
  await expect(tabs.locator("[data-team-caption]")).toHaveText("lead-routing · illustrative");
});

test("clicking a step opens what it saw, and Escape returns focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const inspector = page.locator("net-inspector");
  const step = inspector.locator('.node[data-id="verdict"]');
  await step.click();
  const panel = inspector.locator("[data-inspector]");
  await expect(panel.locator("h3")).toHaveText("Who is right?");
  await expect(panel.locator("[data-saw]")).toContainText("What is the vendor disputing?");
  await expect(panel.locator("[data-answer]")).toHaveText("Vendor");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(step).toBeFocused();
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
