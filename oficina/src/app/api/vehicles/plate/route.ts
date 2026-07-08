import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

/**
 * Consulta dados de veículo pela placa.
 * Tenta múltiplas fontes públicas. Se nenhuma funcionar, retorna 404.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const plate = searchParams.get("plate")?.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

    if (!plate || plate.length < 7) {
      return NextResponse.json({ error: "Placa inválida" }, { status: 400 });
    }

    // Tentar API pública (múltiplas fontes)
    const result = await fetchPlateData(plate);

    if (result) {
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Dados não encontrados para esta placa" }, { status: 404 });
  } catch (error) {
    return handleError(error);
  }
}

interface PlateResult {
  brand: string;
  model: string;
  year: number;
  yearModel: number;
  color: string;
  fuel: string;
}

async function fetchPlateData(plate: string): Promise<PlateResult | null> {
  // Fonte 1: API pública via gateway (formato comum de resposta)
  try {
    const res = await fetch(`https://wdapi2.com.br/consulta/${plate}/${process.env.PLATE_API_TOKEN || ""}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.MARCA && data.MODELO) {
        return {
          brand: capitalize(data.MARCA),
          model: capitalize(data.MODELO),
          year: parseInt(data.ano) || parseInt(data.anoModelo) || new Date().getFullYear(),
          yearModel: parseInt(data.anoModelo) || parseInt(data.ano) || new Date().getFullYear(),
          color: capitalize(data.cor || ""),
          fuel: mapFuel(data.combustivel || ""),
        };
      }
    }
  } catch { /* timeout ou erro — tentar próxima fonte */ }

  // Fonte 2: Consulta via placa.app (alternativa)
  try {
    const res = await fetch(`https://brasilapi.com.br/api/fipe/preco/v1/${plate}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        return {
          brand: item.marca || "",
          model: item.modelo || "",
          year: parseInt(item.anoModelo) || new Date().getFullYear(),
          yearModel: parseInt(item.anoModelo) || new Date().getFullYear(),
          color: "",
          fuel: mapFuel(item.combustivel || ""),
        };
      }
    }
  } catch { /* fallback */ }

  return null;
}

function capitalize(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function mapFuel(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("flex") || lower.includes("álcool/gasolina")) return "Flex";
  if (lower.includes("diesel")) return "Diesel";
  if (lower.includes("gasolina")) return "Gasolina";
  if (lower.includes("etanol") || lower.includes("álcool")) return "Etanol";
  if (lower.includes("elétrico") || lower.includes("eletric")) return "Elétrico";
  if (lower.includes("gnv") || lower.includes("gás")) return "GNV";
  return raw;
}
