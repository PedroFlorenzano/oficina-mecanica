import { test, expect } from "@playwright/test";
import { login, USERS } from "./helpers/auth";

test.describe("Login", () => {
  test("admin Paiffer acessa dashboard", async ({ page }) => {
    await login(page, "adminPaiffer");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("admin Demo acessa dashboard", async ({ page }) => {
    await login(page, "adminDemo");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("mecânico Paiffer acessa dashboard", async ({ page }) => {
    await login(page, "mecanicoPaiffer");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("credenciais inválidas mostra erro", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("admin@paiffer.com");
    await page.getByLabel("Senha").fill("senhaerrada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("E-mail ou senha inválidos")).toBeVisible();
  });

  test("acesso sem autenticação redireciona para login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
