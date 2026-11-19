/* eslint-disable no-await-in-loop -- Navigations and interactions on one page must be sequential. */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const routes = [
  "vulnerability-triage",
  "injury-claims",
  "device-reports",
  "aviation-safety",
  "contract-review",
];

async function expectNoOverlap(page: Page): Promise<void> {
  const overlaps = await page.locator("decision-net").evaluateAll((nets) =>
    nets.flatMap((net) => {
      if (!net.getBoundingClientRect().width || net.getAttribute("aria-hidden") === "true")
        return [];
      const cards = [...net.querySelectorAll<HTMLElement>(".node")].filter(
        (el) => getComputedStyle(el).display !== "none",
      );
      const boxes = cards.map((el) => ({ id: el.dataset["id"], rect: el.getBoundingClientRect() }));
      return boxes.flatMap((a, i) => {
        const problems = a.rect.left < 0 || a.rect.right > innerWidth ? [`outside ${a.id}`] : [];
        for (const b of boxes.slice(i + 1)) {
          if (
            a.rect.left < b.rect.right - 1 &&
            b.rect.left < a.rect.right - 1 &&
            a.rect.top < b.rect.bottom - 1 &&
            b.rect.top < a.rect.bottom - 1
          )
            problems.push(`${a.id} overlaps ${b.id}`);
        }
        return problems;
      });
    }),
  );
  expect(overlaps).toEqual([]);
}

async function expectMapFits(page: Page): Promise<void> {
  const problems = await page.locator(".map").evaluateAll((maps) =>
    maps.flatMap((map) => {
      const boxes = [...map.querySelectorAll<HTMLElement>(".node")].map((el) => ({
        name: el.textContent?.trim() ?? "",
        rect: el.getBoundingClientRect(),
      }));
      return boxes.flatMap((a, i) => {
        const found = a.rect.left < 0 || a.rect.right > innerWidth ? [`outside ${a.name}`] : [];
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
}

for (const width of [390, 720, 1440]) {
  test(`every recorded network fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const slug of routes) {
      await page.goto(`/examples/${slug}/`);
      await page.evaluate(() => document.fonts.ready);
      await expectNoOverlap(page);
    }
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expectMapFits(page);
  });
}

test("example networks keep static probabilities and follow live reduced motion", async ({
  page,
}) => {
  await page.goto("/examples/vulnerability-triage/");
  const net = page.locator("decision-net").first();
  await expect(net.locator(".on").first()).toHaveAttribute("aria-hidden", "true");
  await expect(net.locator(".sr-only").first()).not.toBeEmpty();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(net.locator(".wait, .active")).toHaveCount(0);
});
