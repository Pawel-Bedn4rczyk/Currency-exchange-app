// Funkcje formatowania kursów walut i dat

// Formatowanie kursu waluty z odpowiednią precyzją dla kantoru
export const formatRate = (rate, currencyCode = null) => {
  // Dla walut egzotycznych używaj większej precyzji niezależnie od wartości
  if (currencyCode === "IDR") {
    return rate.toFixed(8); // 8 miejsc po przecinku dla IDR (precyzja NBP)
  }

  // Zapasowe formatowanie na podstawie wartości kursu
  if (rate < 0.001) return rate.toFixed(6); // Inne waluty egzotyczne
  if (rate < 0.1) return rate.toFixed(5); // Niektóre waluty azjatyckie
  return rate.toFixed(4); // EUR, USD, waluty standardowe
};

// Formatowanie procentów z odpowiednią precyzją dla różnych walut
export const formatPercentage = (change, currencyCode) => {
  // IDR: 3 miejsca po przecinku dla mikro-zmian (0.003%)
  // Inne: 1 miejsce po przecinku (1.4%)
  const decimals = currencyCode === "IDR" ? 3 : 1;
  return change.toFixed(decimals);
};

// Funkcja pomocnicza do określania koloru na podstawie zmiany procentowej
export const getChangeColor = (change) => {
  if (change === 0) return "#6c757d"; // Szary dla 0%
  return change > 0 ? "#00b894" : "#e17055"; // Zielony dla dodatnich, czerwony dla ujemnych
};

// Funkcja pomocnicza do określania klasy CSS dla zmiany procentowej
export const getChangeClass = (change) => {
  if (change === 0) return "change-neutral";
  return change >= 0 ? "change-positive" : "change-negative";
};

// Formatowanie daty po polsku
export const formatPolishDate = (dateString) => {
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("pl-PL", options);
};

// Formatowanie daty w krótkim formacie (DD.MM.YYYY)
export const formatShortDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
