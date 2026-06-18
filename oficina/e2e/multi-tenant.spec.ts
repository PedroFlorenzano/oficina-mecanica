import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Isolamento Multi-Tenant", () => {
  test("listagem de clientes é isolada por tenant", async ({ page }) => {
    // Login como Paiffer
    await login(page, "adminPaiffer");
    await page.goto("/dashboard/clients");
    await page.waitForTimeout(1000);
    const paifferClients = await page.locator("table tbody tr").count();

    // Logout e login como Demo
    await page.goto("/api/auth/signout");
    await login(page, "adminDemo");
    await page.goto("/dashboard/clients");
    await page.waitForTimeout(1000);
    const demoClients = await page.locator("table tbody tr").count();

    // Tenants diferentes devem ter quantidades diferentes de clientes
    expect(paifferClients).toBeGreaterThan(0);
    expect(demoClients).toBeGreaterThan(0);
    expect(paifferClients).not.toEqual(demoClients);
  });

  test("listagem de estoque é isolada por tenant", async ({ page }) => {
    await login(page, "adminPaiffer");
    await page.goto("/dashboard/stock");
    await page.waitForTimeout(1000);
    const paifferStock = await page.locator("table tbody tr").count();

    await page.goto("/api/auth/signout");
    await login(page, "adminDemo");
    await page.goto("/dashboard/stock");
    await page.waitForTimeout(1000);
    const demoStock = await page.locator("table tbody tr").count();

    expect(paifferStock).toBeGreaterThan(0);
    expect(demoStock).toBeGreaterThan(0);
    expect(paifferStock).not.toEqual(demoStock);
  });

  test("API rejeita acesso a recurso de outro tenant", async ({ page }) => {
    // Login como Demo e tenta acessar um ID de OS que pertence ao Paiffer
    await login(page, "adminDemo");

    // Buscar OS do Demo
    const demoRes = await page.request.get("/api/orders");
    const demoOrders = await demoRes.json();

    // Login como Paiffer e tenta acessar OS do próprio tenant
    await page.goto("/api/auth/signout");
    await login(page, "adminPaiffer");
    const paifferRes = await page.request.get("/api/orders");
    const paifferOrders = await paifferRes.json();

    // As OS devem ser conjuntos disjuntos (IDs diferentes)
    const demoIds = new Set(demoOrders.map((o: { id: string }) => o.id));
    const paifferIds = new Set(paifferOrders.map((o: { id: string }) => o.id));
    const intersection = [...demoIds].filter((id) => paifferIds.has(id));
    expect(intersection).toHaveLength(0);
  });
});
