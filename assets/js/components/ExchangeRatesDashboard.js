import React, { Component } from "react";
import axios from "axios";
import CurrencyDetailsModal from "./CurrencyDetailsModal";

class ExchangeRatesDashboard extends Component {
  constructor() {
    super();
    this.state = {
      exchangeRates: [],
      chartData: {},
      loading: true,
      loadingCharts: false,
      error: null,
      selectedDate: new Date().toISOString().split("T")[0],
      actualDataDate: null,
      selectedCurrency: null,
      isModalOpen: false,
    };
  }

  // Funkcja pomocnicza do określania koloru na podstawie zmiany procentowej
  getChangeColor(change) {
    if (change === 0) return "#6c757d"; // Szary dla 0%
    return change > 0 ? "#00b894" : "#e17055"; // Zielony dla dodatnich, czerwony dla ujemnych
  }

  // Funkcja pomocnicza do określania klasy CSS dla zmiany procentowej
  getChangeClass(change) {
    if (change === 0) return "change-neutral";
    return change >= 0 ? "change-positive" : "change-negative";
  }

  // Formatowanie procentów z odpowiednią precyzją dla różnych walut
  formatPercentage(change, currencyCode) {
    // IDR: 3 miejsca po przecinku dla mikro-zmian (0.003%)
    // Inne: 1 miejsce po przecinku (1.4%)
    const decimals = currencyCode === "IDR" ? 3 : 1;
    return change.toFixed(decimals);
  }

  // Formatowanie kursu waluty z odpowiednią precyzją dla kantoru
  formatRate(rate, currencyCode = null) {
    // Dla walut egzotycznych używaj większej precyzji niezależnie od wartości
    if (currencyCode === "IDR") {
      return rate.toFixed(8); // 8 miejsc po przecinku dla IDR (precyzja NBP)
    }

    // Zapasowe formatowanie na podstawie wartości kursu
    if (rate < 0.001) return rate.toFixed(6); // Inne waluty egzotyczne
    if (rate < 0.1) return rate.toFixed(5); // Niektóre waluty azjatyckie
    return rate.toFixed(4); // EUR, USD, waluty standardowe
  }

  getBaseUrl() {
    return "http://localhost:8000";
  }

  // Formatowanie daty po polsku
  formatPolishDate(dateString) {
    const date = new Date(dateString);
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("pl-PL", options);
  }

  componentDidMount() {
    this.fetchExchangeRates();
  }

  fetchExchangeRates() {
    const baseUrl = this.getBaseUrl();
    this.setState({ loading: true });

    const currencyNames = {
      EUR: "Euro",
      USD: "Dolar amerykański",
      CZK: "Korona czeska",
      BRL: "Real brazylijski",
      IDR: "Rupia indonezyjska",
    };

    axios
      .get(`${baseUrl}/api/exchange-rates`)
      .then((response) => {
        if (response.data.status === "success") {
          const exchangeRates = response.data.data.map((rate) => ({
            code: rate.code,
            name: currencyNames[rate.code] || rate.currency,
            rate: rate.nbpRate,
            buyRate: rate.buyRate,
            sellRate: rate.sellRate,
            change: rate.percentageChange || 0,
            trend: rate.trend || "neutral",
          }));

          // Sortuj w określonej kolejności
          const order = ["EUR", "USD", "CZK", "BRL", "IDR"];
          const sortedRates = order
            .map((code) => exchangeRates.find((rate) => rate.code === code))
            .filter(Boolean);

          // Zapisz informację o dacie danych
          const actualDataDate = response.data.actualDataDate;

          this.setState({
            exchangeRates: sortedRates,
            loading: false,
            actualDataDate: actualDataDate,
          });

          // Pobierz dane wykresów dla każdej waluty
          this.fetchChartDataForAllCurrencies();
        } else {
          throw new Error(response.data.message || "API error");
        }
      })
      .catch((error) => {
        console.error("Failed to fetch exchange rates:", error);
        this.setState({
          exchangeRates: [],
          loading: false,
          error: "Nie udało się pobrać kursów walut. Spróbuj ponownie.",
        });
      });
  }

  fetchChartDataForAllCurrencies() {
    const baseUrl = this.getBaseUrl();
    const { selectedDate, exchangeRates } = this.state;

    this.setState({ loadingCharts: true });

    const promises = exchangeRates.map((currency) =>
      axios.get(`${baseUrl}/api/exchange-rates/history`, {
        params: {
          currency: currency.code,
          date: selectedDate,
        },
      })
    );

    Promise.all(promises)
      .then((responses) => {
        const chartData = {};
        responses.forEach((response, index) => {
          if (response.data.status === "success") {
            const currencyCode = exchangeRates[index].code;
            chartData[currencyCode] = response.data.data.history;
          }
        });

        this.setState({ chartData, loadingCharts: false });
      })
      .catch((error) => {
        console.error("Failed to fetch chart data:", error);
        this.setState({ loadingCharts: false });
      });
  }

  generateChartArea(points, isPositive) {
    const pointArray = points.split(" ").map((p) => p.split(","));
    const areaPoints = [...pointArray];

    areaPoints.push([pointArray[pointArray.length - 1][0], "40"]);
    areaPoints.push(["0", "40"]);
    areaPoints.unshift(["0", pointArray[0][1]]);

    return areaPoints.map((p) => p.join(",")).join(" ");
  }

  generateRealChartData(currencyCode) {
    const { chartData } = this.state;
    const data = chartData[currencyCode];

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
        const normalizedRate = ((rate - minRate) / range) * 30 + 5; // Skaluj do 5-35
        y = Math.max(5, Math.min(35, normalizedRate));
      }
      points.push(`${x},${y}`);
    }

    return points.join(" ");
  }

  // Generowanie widocznych punktów (kółek) na wykresie
  generateChartCircles(currencyCode) {
    const { chartData } = this.state;
    const data = chartData[currencyCode];

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
        const normalizedRate = ((rate - minRate) / range) * 30 + 5;
        y = Math.max(5, Math.min(35, normalizedRate));
      }

      circles.push({
        x: x,
        y: y,
        date: item.effectiveDate,
      });
    }

    return circles;
  }

  // Pobierz kursy walut dla wybranej daty
  fetchExchangeRatesForDate() {
    const baseUrl = this.getBaseUrl();
    const { selectedDate } = this.state;

    this.setState({ loading: true });

    const currencyNames = {
      EUR: "Euro",
      USD: "Dolar amerykański",
      CZK: "Korona czeska",
      BRL: "Real brazylijski",
      IDR: "Rupia indonezyjska",
    };

    axios
      .get(`${baseUrl}/api/exchange-rates`, {
        params: {
          date: selectedDate,
        },
      })
      .then((response) => {
        if (response.data.status === "success") {
          const exchangeRates = response.data.data.map((rate) => ({
            code: rate.code,
            name: currencyNames[rate.code] || rate.currency,
            rate: rate.nbpRate,
            buyRate: rate.buyRate,
            sellRate: rate.sellRate,
            change: rate.percentageChange || 0,
            trend: rate.trend || "neutral",
          }));

          // Sortuj w określonej kolejności
          const order = ["EUR", "USD", "CZK", "BRL", "IDR"];
          const sortedRates = order
            .map((code) => exchangeRates.find((rate) => rate.code === code))
            .filter(Boolean);

          // Zaktualizuj informację o dacie danych
          const actualDataDate = response.data.actualDataDate;

          this.setState({
            exchangeRates: sortedRates,
            loading: false,
            actualDataDate: actualDataDate,
          });
        } else {
          throw new Error(response.data.message || "API error");
        }
      })
      .catch((error) => {
        console.error("Failed to fetch exchange rates for date:", error);
        this.setState({
          loading: false,
          error: "Nie udało się pobrać kursów walut dla wybranej daty.",
        });
      });
  }

  // Obsługa otwierania modala ze szczegółami waluty
  handleCurrencyClick = (currency) => {
    this.setState({
      selectedCurrency: currency,
      isModalOpen: true,
    });
  };

  // Obsługa zamykania modala
  handleModalClose = () => {
    this.setState({
      selectedCurrency: null,
      isModalOpen: false,
    });
  };

  render() {
    const {
      loading,
      loadingCharts,
      exchangeRates,
      selectedDate,
      error,
      actualDataDate,
    } = this.state;
    const today = new Date().toISOString().split("T")[0];

    return (
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className=" col-md-12 col-lg-11 col-xl-8">
            <div className="exchange-rates-card">
              <div className="card-header">
                <h2>Kursy walut kantoru</h2>
                <div
                  className={`date-selector-wrapper ${
                    loading || loadingCharts ? "disabled" : ""
                  }`}
                >
                  <label htmlFor="dateSelector">Data:</label>
                  <input
                    type="date"
                    id="dateSelector"
                    className="date-input"
                    value={selectedDate}
                    max={today}
                    disabled={loading || loadingCharts}
                    onKeyDown={(e) => e.preventDefault()}
                    onPaste={(e) => e.preventDefault()}
                    onClick={(e) => {
                      try {
                        e.target.showPicker();
                      } catch {
                        e.target.focus();
                      }
                    }}
                    onChange={(e) => {
                      const newDate = e.target.value || today;
                      this.setState({ selectedDate: newDate }, () => {
                        this.fetchExchangeRatesForDate();
                        this.fetchChartDataForAllCurrencies();
                      });
                    }}
                  />
                </div>
                {actualDataDate ? (
                  <div
                    className={`data-status ${
                      actualDataDate !== selectedDate
                        ? "different-date"
                        : "current-date"
                    }`}
                  >
                    <strong>
                      Kurs z dnia: {this.formatPolishDate(actualDataDate)}
                    </strong>
                  </div>
                ) : (
                  <div className="data-status data-status-placeholder">
                    <strong>&nbsp;</strong>
                  </div>
                )}
              </div>

              {loading || loadingCharts ? (
                <div className="loading-container">
                  <div className="spinner" role="status">
                    <span className="sr-only">Ładowanie...</span>
                  </div>
                  <p>Ładowanie danych...</p>
                </div>
              ) : error ? (
                <div className="error-container text-center p-4">
                  <div className="alert alert-danger" role="alert">
                    <h5>Błąd połączenia</h5>
                    <p>{error}</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        this.setState({ error: null });
                        this.fetchExchangeRates();
                      }}
                    >
                      Spróbuj ponownie
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="table-responsive d-none d-md-block">
                    <table className="exchange-table table">
                      <thead>
                        <tr>
                          <th>Waluta</th>
                          <th>Kurs NBP</th>
                          <th>Kurs kupna</th>
                          <th>Kurs sprzedaży</th>
                          <th>Historia waluty 14 dni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exchangeRates.map((currency, index) => (
                          <tr
                            key={currency.code}
                            onClick={() => this.handleCurrencyClick(currency)}
                          >
                            <td>
                              <div className="currency-cell">
                                <div
                                  className={`currency-icon ${currency.code.toLowerCase()}`}
                                >
                                  {currency.code === "EUR" && "€"}
                                  {currency.code === "USD" && "$"}
                                  {currency.code === "IDR" && "₹"}
                                  {currency.code === "CZK" && "CZK"}
                                  {currency.code === "BRL" && "R$"}
                                </div>
                                <div className="currency-info">
                                  <h6>{currency.code}</h6>
                                  <small>{currency.name}</small>
                                </div>
                              </div>
                            </td>
                            <td className="rate-cell">
                              {this.formatRate(currency.rate, currency.code)}{" "}
                              PLN
                            </td>
                            <td className="buy-rate">
                              {currency.buyRate
                                ? `${this.formatRate(
                                    currency.buyRate,
                                    currency.code
                                  )} PLN`
                                : "-"}
                            </td>
                            <td className="sell-rate">
                              {this.formatRate(
                                currency.sellRate,
                                currency.code
                              )}{" "}
                              PLN
                            </td>
                            <td
                              style={{ padding: "8px 8px 8px 12px" }}
                              className="chart-cell"
                            >
                              <div className="chart-cell-content">
                                <div className="percentage-section">
                                  <span
                                    className={this.getChangeClass(
                                      currency.change
                                    )}
                                  >
                                    {currency.change > 0 ? "+" : ""}
                                    {this.formatPercentage(
                                      currency.change,
                                      currency.code
                                    )}
                                    %
                                    {currency.change !== 0 && (
                                      <i
                                        className={
                                          currency.change > 0
                                            ? "bi bi-arrow-up-right"
                                            : "bi bi-arrow-down-right"
                                        }
                                      ></i>
                                    )}
                                  </span>
                                </div>
                                <div className="chart-section">
                                  {this.generateRealChartData(currency.code) ? (
                                    <div className="mini-chart">
                                      <svg
                                        viewBox="0 0 100 40"
                                        preserveAspectRatio="xMidYMid meet"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          display: "block",
                                        }}
                                      >
                                        <defs>
                                          <linearGradient
                                            id={`gradient-${index}`}
                                            x1="0%"
                                            y1="0%"
                                            x2="0%"
                                            y2="100%"
                                          >
                                            <stop
                                              offset="0%"
                                              stopColor={this.getChangeColor(
                                                currency.change
                                              )}
                                              stopOpacity="0.3"
                                            />
                                            <stop
                                              offset="100%"
                                              stopColor={this.getChangeColor(
                                                currency.change
                                              )}
                                              stopOpacity="0"
                                            />
                                          </linearGradient>
                                        </defs>
                                        <polyline
                                          className="chart-line"
                                          points={this.generateRealChartData(
                                            currency.code
                                          )}
                                          stroke={this.getChangeColor(
                                            currency.change
                                          )}
                                          strokeWidth="2"
                                          fill="none"
                                          strokeLinecap="butt"
                                          strokeLinejoin="miter"
                                        />
                                        <polygon
                                          className="chart-area"
                                          points={this.generateChartArea(
                                            this.generateRealChartData(
                                              currency.code
                                            ),
                                            currency.change >= 0
                                          )}
                                          fill={`url(#gradient-${index})`}
                                        />
                                        {/* Chart points */}
                                        {this.generateChartCircles(
                                          currency.code
                                        ).map((circle, circleIndex) => (
                                          <circle
                                            key={circleIndex}
                                            cx={circle.x}
                                            cy={circle.y}
                                            r="0.8"
                                            fill={this.getChangeColor(
                                              currency.change
                                            )}
                                            stroke="white"
                                            strokeWidth="0.3"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                        ))}
                                      </svg>
                                    </div>
                                  ) : (
                                    <div className="no-data-message">
                                      <span>Brak danych</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile Cards */}
                  <div className="d-md-none mobile-cards">
                    {exchangeRates.map((currency, index) => (
                      <div
                        key={currency.code}
                        className="currency-card"
                        onClick={() => this.handleCurrencyClick(currency)}
                      >
                        <div className="currency-card-header">
                          <div className="currency-cell">
                            <div
                              className={`currency-icon ${currency.code.toLowerCase()}`}
                            >
                              {currency.code === "EUR" && "€"}
                              {currency.code === "USD" && "$"}
                              {currency.code === "IDR" && "₹"}
                              {currency.code === "CZK" && "CZK"}
                              {currency.code === "BRL" && "R$"}
                            </div>
                            <div className="currency-info">
                              <h6>{currency.code}</h6>
                              <small>{currency.name}</small>
                            </div>
                          </div>
                          <span
                            className={this.getChangeClass(currency.change)}
                          >
                            {currency.change > 0 ? "+" : ""}
                            {this.formatPercentage(
                              currency.change,
                              currency.code
                            )}
                            %
                            {currency.change !== 0 && (
                              <i
                                className={
                                  currency.change > 0
                                    ? "bi bi-arrow-up-right"
                                    : "bi bi-arrow-down-right"
                                }
                              ></i>
                            )}
                          </span>
                        </div>
                        <div className="currency-card-body">
                          <div className="rate-row">
                            <span className="rate-label">Kurs NBP:</span>
                            <span className="rate-value">
                              {this.formatRate(currency.rate, currency.code)}{" "}
                              PLN
                            </span>
                          </div>
                          <div className="rate-row">
                            <span className="rate-label">Kurs kupna:</span>
                            <span className="rate-value buy-rate">
                              {currency.buyRate
                                ? `${this.formatRate(
                                    currency.buyRate,
                                    currency.code
                                  )} PLN`
                                : "-"}
                            </span>
                          </div>
                          <div className="rate-row">
                            <span className="rate-label">Kurs sprzedaży:</span>
                            <span className="rate-value sell-rate">
                              {this.formatRate(
                                currency.sellRate,
                                currency.code
                              )}{" "}
                              PLN
                            </span>
                          </div>
                          <div className="rate-row">
                            <span className="rate-label">
                              Historia waluty 14 dni:
                            </span>
                            {this.generateRealChartData(currency.code) ? (
                              <div className="mini-chart-mobile">
                                <svg
                                  viewBox="0 0 100 40"
                                  preserveAspectRatio="xMidYMid meet"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "block",
                                    marginLeft: "10px",
                                  }}
                                >
                                  <defs>
                                    <linearGradient
                                      id={`gradient-mobile-${index}`}
                                      x1="0%"
                                      y1="0%"
                                      x2="0%"
                                      y2="100%"
                                    >
                                      <stop
                                        offset="0%"
                                        stopColor={this.getChangeColor(
                                          currency.change
                                        )}
                                        stopOpacity="0.3"
                                      />
                                      <stop
                                        offset="100%"
                                        stopColor={this.getChangeColor(
                                          currency.change
                                        )}
                                        stopOpacity="0"
                                      />
                                    </linearGradient>
                                  </defs>
                                  <polyline
                                    className="chart-line"
                                    points={this.generateRealChartData(
                                      currency.code
                                    )}
                                    stroke={this.getChangeColor(
                                      currency.change
                                    )}
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="butt"
                                    strokeLinejoin="miter"
                                  />
                                  <polygon
                                    className="chart-area"
                                    points={this.generateChartArea(
                                      this.generateRealChartData(currency.code),
                                      currency.change >= 0
                                    )}
                                    fill={`url(#gradient-mobile-${index})`}
                                  />
                                  {/* Chart points mobile */}
                                  {this.generateChartCircles(currency.code).map(
                                    (circle, circleIndex) => (
                                      <circle
                                        key={circleIndex}
                                        cx={circle.x}
                                        cy={circle.y}
                                        r="0.8"
                                        fill={this.getChangeColor(
                                          currency.change
                                        )}
                                        stroke="white"
                                        strokeWidth="0.3"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                    )
                                  )}
                                </svg>
                              </div>
                            ) : (
                              <div className="no-data-message-mobile">
                                <span>Brak danych</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Currency Details Modal */}
        {this.state.isModalOpen && this.state.selectedCurrency && (
          <CurrencyDetailsModal
            currency={this.state.selectedCurrency}
            selectedDate={this.state.selectedDate}
            chartData={
              this.state.chartData[this.state.selectedCurrency.code] || []
            }
            onClose={this.handleModalClose}
          />
        )}
      </div>
    );
  }
}

export default ExchangeRatesDashboard;
