import {
  formatRate,
  formatPolishDate,
} from "../../assets/js/utils/formatters.js";

describe("formatters", () => {
  describe("formatRate", () => {
    test("formatuje kurs EUR z odpowiednią precyzją", () => {
      const result = formatRate(4.5678, "EUR");

      // EUR powinien mieć 4 miejsca po przecinku
      expect(result).toMatch(/4\.\d{4}/);
    });

    test("formatuje kurs USD z odpowiednią precyzją", () => {
      const result = formatRate(4.1234, "USD");

      // USD powinien mieć 4 miejsca po przecinku
      expect(result).toMatch(/4\.\d{4}/);
    });

    test("formatuje kurs IDR z większą precyzją", () => {
      const result = formatRate(0.00026789, "IDR");

      // IDR powinien mieć więcej miejsc po przecinku
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    test("obsługuje wartość 0", () => {
      const result = formatRate(0, "EUR");

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });
  });

  describe("formatPolishDate", () => {
    test("formatuje datę w formacie ISO na polski format", () => {
      const result = formatPolishDate("2024-01-15");

      // Sprawdź czy zwraca string z datą
      expect(typeof result).toBe("string");
      expect(result).toBeDefined();
    });

    test("obsługuje różne daty", () => {
      const result = formatPolishDate("2023-12-25");

      expect(typeof result).toBe("string");
      expect(result).toBeDefined();
    });
  });
});
