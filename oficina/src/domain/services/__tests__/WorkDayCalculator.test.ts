import { WorkDayCalculator } from "../WorkDayCalculator";

describe("WorkDayCalculator", () => {
  // Config padrão: seg-sáb, 08:00-18:00, almoço 12:00-13:00
  const defaultCalc = new WorkDayCalculator(
    [1, 2, 3, 4, 5, 6], // seg a sáb
    "08:00",
    "18:00",
    "12:00",
    "13:00"
  );

  describe("getWorkMinutesPerDay", () => {
    it("deve calcular corretamente com almoço", () => {
      // (18-8)*60 - (13-12)*60 = 600 - 60 = 540
      expect(defaultCalc.getWorkMinutesPerDay()).toBe(540);
    });

    it("deve calcular corretamente sem almoço", () => {
      const calc = new WorkDayCalculator([1, 2, 3, 4, 5], "08:00", "17:00");
      // (17-8)*60 = 540
      expect(calc.getWorkMinutesPerDay()).toBe(540);
    });

    it("deve retornar 0 se horários inválidos", () => {
      const calc = new WorkDayCalculator([1], "18:00", "08:00");
      expect(calc.getWorkMinutesPerDay()).toBe(0);
    });
  });

  describe("isWorkDay / isWorkDate", () => {
    it("segunda (1) é dia útil", () => {
      expect(defaultCalc.isWorkDay(1)).toBe(true);
    });

    it("domingo (0) não é dia útil", () => {
      expect(defaultCalc.isWorkDay(0)).toBe(false);
    });

    it("sábado (6) é dia útil no config padrão", () => {
      expect(defaultCalc.isWorkDay(6)).toBe(true);
    });

    it("isWorkDate verifica corretamente", () => {
      // 2026-07-06 = segunda
      const monday = new Date(2026, 6, 6);
      expect(defaultCalc.isWorkDate(monday)).toBe(true);

      // 2026-07-05 = domingo
      const sunday = new Date(2026, 6, 5);
      expect(defaultCalc.isWorkDate(sunday)).toBe(false);
    });
  });

  describe("minutesToWorkDays", () => {
    it("540 minutos = 1 dia", () => {
      expect(defaultCalc.minutesToWorkDays(540)).toBe(1);
    });

    it("541 minutos = 2 dias (arredonda pra cima)", () => {
      expect(defaultCalc.minutesToWorkDays(541)).toBe(2);
    });

    it("1080 minutos = 2 dias", () => {
      expect(defaultCalc.minutesToWorkDays(1080)).toBe(2);
    });

    it("0 minutos = 0 dias", () => {
      expect(defaultCalc.minutesToWorkDays(0)).toBe(0);
    });

    it("negativo = 0 dias", () => {
      expect(defaultCalc.minutesToWorkDays(-100)).toBe(0);
    });
  });

  describe("addWorkDays", () => {
    it("adicionar 1 dia útil a uma segunda retorna terça", () => {
      const monday = new Date(2026, 6, 6, 10, 0); // segunda 06/jul
      const result = defaultCalc.addWorkDays(monday, 1);
      expect(result.getDay()).toBe(2); // terça
      expect(result.getDate()).toBe(7);
      expect(result.getHours()).toBe(18); // fim expediente
    });

    it("adicionar 5 dias úteis a uma segunda pula para sábado (seg-sáb config)", () => {
      const monday = new Date(2026, 6, 6, 10, 0);
      const result = defaultCalc.addWorkDays(monday, 5);
      expect(result.getDate()).toBe(11); // sábado
      expect(result.getDay()).toBe(6);
    });

    it("adicionar 6 dias úteis a uma segunda pula domingo e cai na segunda seguinte", () => {
      const monday = new Date(2026, 6, 6, 10, 0);
      const result = defaultCalc.addWorkDays(monday, 6);
      // ter(7), qua(8), qui(9), sex(10), sab(11), [dom-pula], seg(13)
      expect(result.getDate()).toBe(13);
      expect(result.getDay()).toBe(1); // segunda
    });

    it("se começar no domingo, avança para segunda e conta a partir daí", () => {
      const sunday = new Date(2026, 6, 5, 10, 0); // domingo
      const result = defaultCalc.addWorkDays(sunday, 1);
      expect(result.getDay()).toBe(2); // terça (segunda + 1)
      expect(result.getDate()).toBe(7);
    });

    it("0 dias retorna a mesma data", () => {
      const monday = new Date(2026, 6, 6, 10, 0);
      const result = defaultCalc.addWorkDays(monday, 0);
      expect(result.getDate()).toBe(6);
    });

    it("funciona com config seg-sex (sem sábado)", () => {
      const calcSemSab = new WorkDayCalculator([1, 2, 3, 4, 5], "08:00", "18:00", "12:00", "13:00");
      const monday = new Date(2026, 6, 6, 10, 0);
      const result = calcSemSab.addWorkDays(monday, 5);
      // ter(7), qua(8), qui(9), sex(10), [sab-pula], [dom-pula], seg(13)
      expect(result.getDate()).toBe(13);
      expect(result.getDay()).toBe(1); // segunda
    });
  });

  describe("countWorkDaysBetween", () => {
    it("conta dias úteis entre segunda e sexta (seg-sáb config)", () => {
      const monday = new Date(2026, 6, 6);
      const friday = new Date(2026, 6, 10);
      expect(defaultCalc.countWorkDaysBetween(monday, friday)).toBe(4);
    });

    it("conta dias úteis entre segunda e domingo (inclui sábado)", () => {
      const monday = new Date(2026, 6, 6);
      const sunday = new Date(2026, 6, 12);
      // ter, qua, qui, sex, sab = 5 dias úteis (domingo não conta)
      expect(defaultCalc.countWorkDaysBetween(monday, sunday)).toBe(5);
    });
  });

  describe("fromConfig", () => {
    it("cria instância corretamente a partir de ScheduleConfig data", () => {
      const calc = WorkDayCalculator.fromConfig({
        workDays: "[1,2,3,4,5]",
        startTime: "09:00",
        endTime: "17:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
      });
      // (17-9)*60 - 60 = 480 - 60 = 420
      expect(calc.getWorkMinutesPerDay()).toBe(420);
      expect(calc.isWorkDay(6)).toBe(false); // sábado não
    });
  });
});
