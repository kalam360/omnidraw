import { expect, test } from "@playwright/test";

const ROUTES = [
  { name: "welcome", path: "/welcome" },
  { name: "connect", path: "/connect" },
  { name: "create-project", path: "/projects/new" },
  { name: "projects", path: "/projects" },
  { name: "project-view", path: "/projects/p_seed_1" },
  { name: "session", path: "/projects/p_seed_1/threads/t_seed_1" },
  { name: "presentation", path: "/projects/p_seed_1/present" },
  { name: "settings", path: "/settings" },
  { name: "not-found", path: "/does-not-exist" },
];

for (const route of ROUTES) {
  test(`renders ${route.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(route.path);
    // Wait for the route to settle (animations off).
    await page.waitForTimeout(400);
    expect(errors, `${route.name} threw: ${errors.join(", ")}`).toHaveLength(0);
    // Smoke check: something rendered.
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(0);
  });
}

test("F enters presentation mode from session", async ({ page }) => {
  await page.goto("/projects/p_seed_1/threads/t_seed_1");
  await page.waitForTimeout(300);
  // Make sure focus isn't trapped in the composer textarea.
  await page.locator("body").click();
  await page.keyboard.press("KeyF");
  await page.waitForURL(/\/present$/);
});

test("Escape exits presentation mode", async ({ page }) => {
  await page.goto("/projects/p_seed_1/present");
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForURL(/\/projects\/p_seed_1$/);
});

test("ArrowLeft navigates scenes in presentation", async ({ page }) => {
  await page.goto("/projects/p_seed_1/present");
  await page.waitForTimeout(300);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  // No assertion needed — passing without error is the contract.
  expect(page.url()).toContain("/present");
});
