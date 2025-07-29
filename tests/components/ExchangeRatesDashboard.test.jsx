import React from "react";
import { render, screen } from "@testing-library/react";
import ExchangeRatesDashboard from "../../assets/js/components/ExchangeRatesDashboard.jsx";

describe("ExchangeRatesDashboard", () => {
  test("renderuje się bez błędów", () => {
    render(<ExchangeRatesDashboard />);

    // Sprawdź czy tytuł jest obecny
    expect(screen.getByText("Kursy walut kantoru")).toBeInTheDocument();
  });

  test("wyświetla nagłówki tabeli", () => {
    render(<ExchangeRatesDashboard />);

    // Sprawdź nagłówki tabeli (desktop)
    expect(screen.getByText("Waluta")).toBeInTheDocument();
    expect(screen.getByText("Kurs NBP")).toBeInTheDocument();
    expect(screen.getByText("Kurs kupna")).toBeInTheDocument();
    expect(screen.getByText("Kurs sprzedaży")).toBeInTheDocument();
  });
});
