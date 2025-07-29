import React from "react";
import { render } from "@testing-library/react";
import CurrencyIcon from "../../../assets/js/components/shared/CurrencyIcon.jsx";

describe("CurrencyIcon", () => {
  test("renderuje się z kodem waluty EUR", () => {
    const { container } = render(<CurrencyIcon currency="EUR" />);

    // Sprawdź czy komponent się renderuje
    expect(container.firstChild).toBeInTheDocument();
  });

  test("renderuje się z kodem waluty USD", () => {
    const { container } = render(<CurrencyIcon currency="USD" />);

    // Sprawdź czy komponent się renderuje
    expect(container.firstChild).toBeInTheDocument();
  });

  test("renderuje się z kodem waluty CZK", () => {
    const { container } = render(<CurrencyIcon currency="CZK" />);

    // Sprawdź czy komponent się renderuje
    expect(container.firstChild).toBeInTheDocument();
  });
});
