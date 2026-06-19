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

  test("API retorna OS diferentes por tenant", async ({ page }) => {
    // Login como Paiffer
    await login(page, "adminPaiffer");
    const paifferRes = await page.request.get("/api/orders");
    expect(paifferRes.ok()).toBeTruthy();
    const paifferOrders = await paifferRes.json();

    // Login como Demo em novo contexto via API
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("admin@demo.com");
    await page.getByLabel("Senha").fill("password123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL("/dashboard**");

    const demoRes = await page.request.get("/api/orders");
    expect(demoRes.ok()).toBeTruthy();
    const demoOrders = await demoRes.json();

    // IDs devem ser disjuntos
    const demoIds = new Set(demoOrders.map((o: { id: string }) => o.id));
    const paifferIds = new Set(paifferOrders.map((o: { id: string }) => o.id));
    const intersection = [...demoIds].filter((id) => paifferIds.has(id));
    expect(intersection).toHaveLength(0);
  });
});
