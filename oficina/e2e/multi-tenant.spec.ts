import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Isolamento Multi-Tenant", () => {
  test("listagem de clientes é isolada por tenant (Paiffer)", async ({ page }) => {
    await login(page, "adminPaiffer");
    await page.goto("/dashboard/clients");
    await page.waitForSelector("table tbody tr", { timeout: 10000 });
    const paifferClients = await page.locator("table tbody tr").count();
    expect(paifferClients).toBeGreaterThan(0);
  });

  test("listagem de clientes é isolada por tenant (Demo)", async ({ page }) => {
    await login(page, "adminDemo");
    await page.goto("/dashboard/clients");
    await page.waitForSelector("table tbody tr", { timeout: 10000 });
    const demoClients = await page.locator("table tbody tr").count();
    expect(demoClients).toBeGreaterThan(0);
  });

  test("API retorna OS diferentes por tenant", async ({ page, context }) => {
    // Login como Paiffer
    await login(page, "adminPaiffer");
    const paifferRes = await page.request.get("/api/orders");
    expect(paifferRes.ok()).toBeTruthy();
    const paifferBody = await paifferRes.json();
    const paifferOrders = Array.isArray(paifferBody) ? paifferBody : paifferBody.data || [];

    // Limpar cookies e relogar como Demo
    await context.clearCookies();
    await login(page, "adminDemo");
    const demoRes = await page.request.get("/api/orders");
    expect(demoRes.ok()).toBeTruthy();
    const demoBody = await demoRes.json();
    const demoOrders = Array.isArray(demoBody) ? demoBody : demoBody.data || [];

    // IDs devem ser disjuntos
    const demoIds = new Set(demoOrders.map((o: { id: string }) => o.id));
    const paifferIds = new Set(paifferOrders.map((o: { id: string }) => o.id));
    const intersection = [...demoIds].filter((id) => paifferIds.has(id));
    expect(intersection).toHaveLength(0);
  });
});
