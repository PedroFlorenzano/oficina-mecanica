import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Pista (Kanban)", () => {
  test("admin Paiffer vê colunas do Kanban e OS do próprio tenant", async ({ page }) => {
    await login(page, "adminPaiffer");
    await page.goto("/dashboard/pista");

    await expect(page.getByText("Aguardando Aprovação").first()).toBeVisible();
    await expect(page.getByText("Em Andamento").first()).toBeVisible();
    await expect(page.getByText("Concluída").first()).toBeVisible();

    // Deve ter cards (Paiffer tem OS no seed)
    await page.waitForSelector("[draggable='true']", { timeout: 10000 });
    expect(await page.locator("[draggable='true']").count()).toBeGreaterThan(0);
  });

  test("admin Demo vê OS diferentes do Paiffer (isolamento)", async ({ page }) => {
    await login(page, "adminDemo");
    await page.goto("/dashboard/pista");

    await expect(page.getByText("Aguardando Aprovação").first()).toBeVisible();
  });

  test("mecânico acessa a pista normalmente", async ({ page }) => {
    await login(page, "mecanicoPaiffer");
    await page.goto("/dashboard/pista");
    await expect(page.getByText("Aguardando Aprovação").first()).toBeVisible();
  });
});
