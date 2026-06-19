import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Criar OS", () => {
  test("admin Paiffer acessa tela de nova OS", async ({ page }) => {
    await login(page, "adminPaiffer");
    await page.goto("/dashboard/orders/new");
    // Verifica que a página carregou com os campos esperados
    await expect(page.locator("input[placeholder='Buscar cliente...']")).toBeVisible();
    await expect(page.getByRole("heading", { name: "CLIENTE", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "VEÍCULO", exact: true })).toBeVisible();
  });

  test("admin Demo não vê clientes do tenant Paiffer", async ({ page }) => {
    await login(page, "adminDemo");
    await page.goto("/dashboard/orders/new");

    const clientInput = page.locator("input[placeholder='Buscar cliente...']");
    await clientInput.fill("João");
    await page.waitForTimeout(2000);
    await expect(page.locator("[role='option']")).toHaveCount(0);
  });
});
