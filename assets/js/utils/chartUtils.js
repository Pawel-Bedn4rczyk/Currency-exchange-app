// Funkcje pomocnicze dla generowania wykresów SVG

// Generowanie punktów dla wykresu liniowego
export const generateChartData = (data) => {
  if (!data || data.length === 0) {
    return null;
  }

  // Sortuj dane chronologicznie (od najstarszych do najnowszych) dla wykresu
  const sortedData = [...data].sort((a, b) => {
    return new Date(a.effectiveDate) - new Date(b.effectiveDate);
  });

  const points = [];
  const numPoints = sortedData.length;

  // Znajdź min i max do skalowania - użyj nbpRate zamiast mid
  const rates = sortedData.map((item) => item.nbpRate || item.mid);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const range = maxRate - minRate;

  // Generowanie punktów dla wykresu (od najstarszych do najnowszych)
  // Zawsze rozciągnij na pełną szerokość SVG (0-100)
  for (let i = 0; i < numPoints; i++) {
    const item = sortedData[i];
    // Rozciągnij równomiernie na pełną szerokość, niezależnie od liczby punktów
    const x = numPoints > 1 ? (i / (numPoints - 1)) * 100 : 50; // Wyśrodkuj jeśli tylko 1 punkt
    const rate = item.nbpRate || item.mid;

    let y;
    if (range === 0) {
      // Wszystkie wartości są takie same - pozioma linia na środku
      y = 20;
    } else {
      // Odwróć skalę Y - wyższe wartości powinny być wyżej (mniejsze Y w SVG)
      const normalizedRate = ((maxRate - rate) / range) * 30 + 5; // Skaluj do 5-35
      y = Math.max(5, Math.min(35, normalizedRate));
    }
    points.push(`${x},${y}`);
  }

  return points.join(" ");
};

// Generowanie obszaru wypełnienia wykresu
export const generateChartArea = (points, isPositive) => {
  const pointArray = points.split(" ").map((p) => p.split(","));
  const areaPoints = [...pointArray];

  areaPoints.push([pointArray[pointArray.length - 1][0], "40"]);
  areaPoints.push(["0", "40"]);
  areaPoints.unshift(["0", pointArray[0][1]]);

  return areaPoints.map((p) => p.join(",")).join(" ");
};

// Generowanie widocznych punktów (kółek) na wykresie
export const generateChartCircles = (data) => {
  if (!data || data.length === 0) {
    return [];
  }

  // Sortuj dane chronologicznie (od najstarszych do najnowszych)
  const sortedData = [...data].sort((a, b) => {
    return new Date(a.effectiveDate) - new Date(b.effectiveDate);
  });

  const numPoints = sortedData.length;
  const rates = sortedData.map((item) => item.nbpRate || item.mid);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const range = maxRate - minRate;

  const circles = [];
  for (let i = 0; i < numPoints; i++) {
    const item = sortedData[i];
    const x = numPoints > 1 ? (i / (numPoints - 1)) * 100 : 50;
    const rate = item.nbpRate || item.mid;

    let y;
    if (range === 0) {
      // Wszystkie wartości są takie same - pozioma linia na środku
      y = 20;
    } else {
      // Wyższew wartości wyżej a niższe niżej na wykresie
      const normalizedRate = ((maxRate - rate) / range) * 30 + 5;
      y = Math.max(5, Math.min(35, normalizedRate));
    }

    circles.push({
      x: x,
      y: y,
      date: item.effectiveDate,
      rate: rate,
    });
  }

  return circles;
};
