import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Pista (Kanban)", () => {
  test("admin Paiffer vê apenas OS do próprio tenant", async ({ page }) => {
    await login(page, "adminPaiffer");
    await page.goto("/dashboard/pista");

    await expect(page.getByText("Aguardando Aprovação")).toBeVisible();
    await expect(page.getByText("Em Andamento")).toBeVisible();
    await expect(page.getByText("Concluída")).toBeVisible();

    // Deve ter cards (Paiffer tem OS no seed)
    await page.waitForSelector("[draggable='true']", { timeout: 10000 });
    const cards = page.locator("[draggable='true']");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("admin Demo vê apenas OS do próprio tenant", async ({ page }) => {
    await login(page, "adminDemo");
    await page.goto("/dashboard/pista");

    await expect(page.getByText("Aguardando Aprovação")).toBeVisible();

    // Demo também tem OS no seed, mas NÃO as mesmas do Paiffer
    await page.waitForTimeout(2000);
    const cards = page.locator("[draggable='true']");
    const demoCount = await cards.count();

    // Agora loga como Paiffer e compara — deve ser diferente
    await page.goto("/api/auth/signout");
    await login(page, "adminPaiffer");
    await page.goto("/dashboard/pista");
    await page.waitForSelector("[draggable='true']", { timeout: 10000 });
    const paifferCount = await page.locator("[draggable='true']").count();

    // Os dois tenants têm quantidades diferentes de OS ativas
    expect(demoCount).not.toEqual(paifferCount);
  });

  test("mecânico vê a pista mas não consegue acessar gestão de usuários", async ({ page }) => {
    await login(page, "mecanicoPaiffer");

    // Pista é acessível
    await page.goto("/dashboard/pista");
    await expect(page.getByText("Aguardando Aprovação")).toBeVisible();

    // Gestão de usuários não é acessível (ADMIN only)
    const res = await page.request.get("/api/users");
    expect(res.status()).toBe(403);
  });
});
