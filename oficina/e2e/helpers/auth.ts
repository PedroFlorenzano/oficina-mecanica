import { Page } from "@playwright/test";

export const USERS = {
  adminPaiffer: { email: "admin@paiffer.com", password: "password123" },
  mecanicoPaiffer: { email: "mecanico@paiffer.com", password: "password123" },
  adminDemo: { email: "admin@demo.com", password: "password123" },
} as const;

export async function login(page: Page, user: keyof typeof USERS = "adminPaiffer") {
  const { email, password } = USERS[user];
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("/dashboard**");
}
