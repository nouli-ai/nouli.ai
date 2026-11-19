import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { contact } from "../../src/lib/site";
import { distDir } from "../support/site";

test("llms.txt gives the same contact address as the site", () => {
  expect(readFileSync(join(distDir, "llms.txt"), "utf8")).toContain(contact.email);
});
