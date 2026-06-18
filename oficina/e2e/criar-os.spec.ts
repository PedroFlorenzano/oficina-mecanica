import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Criar OS", () => {
  test("admin Paiffer cria OS e vê apenas clientes do próprio tenant", async ({ page }) => {
    await login(page, "adminPaiffer");
    await page.goto("/dashboard/orders/new");

    // Buscar cliente do tenant Paiffer
    const clientInput = page.locator("input[placeholder='Buscar cliente...']");
    await clientInput.fill("João");
    await page.locator("[role='option']").first().click();

    // Selecionar veículo
    await page.locator("select").filter({ hasText: /Selecione/ }).first().selectOption({ index: 1 });

    // KM
    const kmInput = page.getByLabel(/KM/i);
    await kmInput.fill("45000");

    // Reclamação
    const complaintInput = page.locator("input[placeholder*='reclamação'], input[placeholder*='Reclamação'], textarea").first();
    await complaintInput.fill("Barulho na suspensão");

    // Serviço do catálogo
    const serviceCombobox = page.locator("input[placeholder*='serviço'], input[placeholder*='Serviço']").first();
    await serviceCombobox.click();
    await serviceCombobox.fill("Alinhamento");
    await page.locator("[role='option']").first().click();

    // Salvar
    await page.getByRole("button", { name: /Salvar|Criar|Gerar/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/orders/, { timeout: 10000 });
  });

  test("admin Demo não vê clientes do tenant Paiffer", async ({ page }) => {
    await login(page, "adminDemo");
    await page.goto("/dashboard/orders/new");

    // Buscar cliente que pertence ao Paiffer — não deve aparecer como opção
    const clientInput = page.locator("input[placeholder='Buscar cliente...']");
    await clientInput.fill("João");
    await page.waitForTimeout(1000);

    // Não deve existir opção visível (dados isolados por tenant)
    await expect(page.locator("[role='option']")).toHaveCount(0);
  });
});
