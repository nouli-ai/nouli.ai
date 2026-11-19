/* eslint-disable no-await-in-loop -- Checks on one page run in order. */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const spent = (page: Page, side: string): Promise<string | null> =>
  page.locator(`traffic-compare [data-side="${side}"] + .spent [data-meter]`).textContent();

test("the traffic totals read without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("/");
    expect(await spent(page, "frontier")).toContain("$422.50");
    expect(await spent(page, "nouli")).toContain("$80.51");
    await expect(page.locator(".labels li")).toHaveCount(5);
  } finally {
    await context.close();
  }
});

test("the spend counts up once and holds its totals", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.locator("traffic-compare").scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      await page.clock.runFor(250);
      return (await spent(page, "nouli"))?.trim();
    })
    .toBe("$80.51");
  await page.clock.runFor(20_000);
  expect((await spent(page, "nouli"))?.trim()).toBe("$80.51");
  expect((await spent(page, "frontier"))?.trim()).toBe("$422.50");
});

test("the count waits until the totals are fully in view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.clock.install();
  await page.goto("/");
  const compare = page.locator("traffic-compare");
  const top = await compare.evaluate((el) => el.getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => {
    scrollTo(0, y - innerHeight + 4);
  }, top);
  await page.clock.runFor(5000);
  expect((await spent(page, "nouli"))?.trim()).toBe("$0.00");
  await page.locator("traffic-compare .spent").last().scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      await page.clock.runFor(250);
      return (await spent(page, "nouli"))?.trim();
    })
    .toBe("$80.51");
});

test("screen readers get the recorded totals, never the count", async ({ page }) => {
  await page.goto("/");
  const totals = page.locator("traffic-compare .spent .sr-only");
  await expect(totals).toHaveText(["$422.50", "$80.51"]);
  await expect(page.locator("traffic-compare [data-meter]").first()).toHaveAttribute(
    "aria-hidden",
    "true",
  );
});

test("reduced motion shows the totals", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("traffic-compare").scrollIntoViewIfNeeded();
  expect((await spent(page, "frontier"))?.trim()).toBe("$422.50");
  expect((await spent(page, "nouli"))?.trim()).toBe("$80.51");
});

for (const width of [390, 720, 1024, 1160, 1440]) {
  test(`traffic labels stay inside their panel without overlapping at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const problems = await page.locator("traffic-compare .stage").evaluateAll((stages) =>
      stages.flatMap((stage) => {
        const panel = stage.closest(".panel")?.getBoundingClientRect();
        const boxes = [...stage.querySelectorAll<HTMLElement>(".labels li, .source")].map((el) => ({
          name: el.textContent?.trim().slice(0, 20) ?? "",
          rect: el.getBoundingClientRect(),
        }));
        return boxes.flatMap((a, i) => {
          const found =
            panel && (a.rect.left < panel.left || a.rect.right > panel.right + 1)
              ? [`outside ${a.name}`]
              : [];
          for (const b of boxes.slice(i + 1))
            if (
              a.rect.left < b.rect.right - 1 &&
              b.rect.left < a.rect.right - 1 &&
              a.rect.top < b.rect.bottom - 1 &&
              b.rect.top < a.rect.bottom - 1
            )
              found.push(`${a.name} overlaps ${b.name}`);
          return found;
        });
      }),
    );
    expect(problems).toEqual([]);
  });
}
