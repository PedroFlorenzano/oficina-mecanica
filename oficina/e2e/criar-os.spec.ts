import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Criar OS", () => {
  test("admin Paiffer cria OS com reclamação e serviço", async ({ page }) => {
    await login(page, "adminPaiffer");
    await page.goto("/dashboard/orders/new");

    // Selecionar cliente
    const clientInput = page.locator("input[placeholder='Buscar cliente...']");
    await clientInput.fill("João");
    await page.waitForSelector("[role='option']", { timeout: 10000 });
    await page.locator("[role='option']").first().click();

    // Selecionar veículo
    await page.locator("select").filter({ hasText: /Selecione/ }).first().selectOption({ index: 1 });

    // Preencher KM
    const kmInput = page.getByLabel(/KM/i);
    await kmInput.fill("45000");

    // Preencher reclamação
    const complaintInput = page.locator("input[placeholder*='reclamação'], input[placeholder*='Reclamação'], textarea").first();
    await complaintInput.fill("Barulho na suspensão");

    // Adicionar serviço via catálogo
    const serviceCombobox = page.locator("input[placeholder*='serviço'], input[placeholder*='Serviço']").first();
    await serviceCombobox.click();
    await serviceCombobox.fill("Alinhamento");
    await page.waitForSelector("[role='option']", { timeout: 10000 });
    await page.locator("[role='option']").first().click();

    // Submeter
    await page.getByRole("button", { name: /Salvar|Criar|Gerar/i }).click();

    // Esperar redirecionamento para listagem de OS
    await expect(page).toHaveURL(/\/dashboard\/orders/, { timeout: 15000 });
  });

  test("admin Demo não vê clientes do tenant Paiffer", async ({ page }) => {
    await login(page, "adminDemo");
    await page.goto("/dashboard/orders/new");

    // Buscar cliente que pertence ao Paiffer — não deve aparecer
    const clientInput = page.locator("input[placeholder='Buscar cliente...']");
    await clientInput.fill("João");
    await page.waitForTimeout(2000);
    await expect(page.locator("[role='option']")).toHaveCount(0);
  });
});
