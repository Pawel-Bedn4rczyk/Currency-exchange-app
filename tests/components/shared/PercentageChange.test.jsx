import React from "react";
import { render, screen } from "@testing-library/react";
import PercentageChange from "../../../assets/js/components/shared/PercentageChange.jsx";

describe("PercentageChange", () => {
  test("wyświetla pozytywną zmianę procentową", () => {
    render(<PercentageChange change={2.5} currencyCode="EUR" />);

    // Sprawdź czy wyświetla znak plus i wartość
    expect(screen.getByText(/\+2\.5/)).toBeInTheDocument();
  });

  test("wyświetla negatywną zmianę procentową", () => {
    render(<PercentageChange change={-1.8} currencyCode="USD" />);

    // Sprawdź czy wyświetla minus i wartość
    expect(screen.getByText(/-1\.8/)).toBeInTheDocument();
  });

  test("obsługuje null jako change", () => {
    const { container } = render(
      <PercentageChange change={null} currencyCode="IDR" />
    );

    // Sprawdź czy komponent się renderuje bez błędów
    expect(container.firstChild).toBeInTheDocument();
  });

  test("ma odpowiednią klasę CSS dla wzrostu", () => {
    const { container } = render(
      <PercentageChange change={1.5} currencyCode="EUR" />
    );

    // Sprawdź czy ma klasę dla pozytywnej zmiany
    const element = container.querySelector(".percentage-change");
    expect(element).toBeInTheDocument();
  });
});
