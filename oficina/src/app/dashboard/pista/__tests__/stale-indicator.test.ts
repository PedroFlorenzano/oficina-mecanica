import {
  daysSince,
  staleLevel,
  staleLabel,
  STALE_THRESHOLDS_DAYS,
} from "@/app/dashboard/pista/utils";

describe("Indicador de OS parada (item 44)", () => {
  const now = new Date("2026-09-11T12:00:00.000Z");

  describe("daysSince", () => {
    it("retorna 0 para a mesma data", () => {
      expect(daysSince(now, now)).toBe(0);
    });

    it("retorna 0 para datas no futuro (nunca negativo)", () => {
      const future = new Date("2026-09-20T12:00:00.000Z");
      expect(daysSince(future, now)).toBe(0);
    });

    it("conta dias inteiros decorridos", () => {
      const threeDaysAgo = new Date("2026-09-08T12:00:00.000Z");
      expect(daysSince(threeDaysAgo, now)).toBe(3);
    });

    it("trunca frações de dia para baixo", () => {
      const almostTwoDays = new Date("2026-09-09T13:00:00.000Z"); // 1d23h
      expect(daysSince(almostTwoDays, now)).toBe(1);
    });

    it("aceita string ISO", () => {
      expect(daysSince("2026-09-06T12:00:00.000Z", now)).toBe(5);
    });

    it("retorna 0 para datas inválidas", () => {
      expect(daysSince("not-a-date", now)).toBe(0);
    });
  });

  describe("staleLevel", () => {
    it("none abaixo do limiar de warning", () => {
      expect(staleLevel(0)).toBe("none");
      expect(staleLevel(STALE_THRESHOLDS_DAYS.warning - 1)).toBe("none");
    });

    it("warning no limiar de warning e antes do critical", () => {
      expect(staleLevel(STALE_THRESHOLDS_DAYS.warning)).toBe("warning");
      expect(staleLevel(STALE_THRESHOLDS_DAYS.critical - 1)).toBe("warning");
    });

    it("critical a partir do limiar critical", () => {
      expect(staleLevel(STALE_THRESHOLDS_DAYS.critical)).toBe("critical");
      expect(staleLevel(STALE_THRESHOLDS_DAYS.critical + 10)).toBe("critical");
    });
  });

  describe("staleLabel", () => {
    it("vazio para 0 dias", () => {
      expect(staleLabel(0)).toBe("");
    });

    it("singular para 1 dia", () => {
      expect(staleLabel(1)).toBe("parada há 1 dia");
    });

    it("plural para mais de 1 dia", () => {
      expect(staleLabel(3)).toBe("parada há 3 dias");
    });
  });

  it("limiares: warning < critical e ambos positivos", () => {
    expect(STALE_THRESHOLDS_DAYS.warning).toBeGreaterThan(0);
    expect(STALE_THRESHOLDS_DAYS.critical).toBeGreaterThan(STALE_THRESHOLDS_DAYS.warning);
  });
});
