import React, { Component } from "react";
import axios from "axios";

class CurrencyDetailsModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      historyData: [],
      loading: false,
      error: null,
      hoveredPointDate: null,
      hoveredRowDate: null,
    };
    this.hoverTimeout = null;
    this.modalRef = React.createRef();
  }

  componentDidMount() {
    // Użyj chartData z props jeśli dostępne, w przeciwnym razie pobierz
    if (this.props.chartData && this.props.chartData.length > 0) {
      this.setState({
        historyData: this.props.chartData,
        loading: false,
      });
    } else {
      this.fetchHistoryData();
    }
    document.addEventListener("keydown", this.handleKeyDown);
    document.body.style.overflow = "hidden";
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown);
    document.body.style.overflow = "unset";

    // Wyczyść oczekujący timeout hover
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
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

  handleKeyDown = (e) => {
    if (e.key === "Escape") {
      this.props.onClose();
    }
  };

  handleOverlayClick = (e) => {
    if (this.modalRef.current && !this.modalRef.current.contains(e.target)) {
      this.props.onClose();
    }
  };

  handlePointHover = (date) => {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    this.setState({ hoveredPointDate: date });

    // Automatyczne przewinięcie do odpowiadającego wiersza
    setTimeout(() => {
      const targetRow = document.querySelector(`[data-date="${date}"]`);
      const tableContainer = document.querySelector(".table-container");

      if (targetRow && tableContainer) {
        // Oblicz pozycję żeby wyśrodkować wiersz w kontenerze
        const containerHeight = tableContainer.clientHeight;
        const rowOffsetTop = targetRow.offsetTop;
        const rowHeight = targetRow.offsetHeight;

        // Wyśrodkuj wiersz w kontenerze
        const scrollTop = rowOffsetTop - containerHeight / 2 + rowHeight / 2;

        tableContainer.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        });
      }
    }, 100); // Małe opóźnienie aby upewnić się że stan jest zaktualizowany
  };

  handlePointClick = (date) => {
    // Wyczyść istniejący timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    this.setState({ hoveredPointDate: date });

    // Automatyczne przewinięcie do odpowiadającej karty (mobile) lub wiersza (desktop)
    setTimeout(() => {
      const targetCard = document.querySelector(
        `.history-card[data-date="${date}"]`
      );
      const targetRow = document.querySelector(`tr[data-date="${date}"]`);
      const historyCardsContainer = document.querySelector(".history-cards");
      const tableContainer = document.querySelector(".table-container");

      // Spróbuj najpierw kart mobilnych
      if (targetCard && historyCardsContainer) {
        const containerHeight = historyCardsContainer.clientHeight;
        const cardOffsetTop = targetCard.offsetTop;
        const cardHeight = targetCard.offsetHeight;

        // Wyśrodkuj kartę w kontenerze
        const scrollTop = cardOffsetTop - containerHeight / 2 + cardHeight / 2;

        historyCardsContainer.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        });
      }
      // Zapasowe rozwiązanie dla tabeli desktop
      else if (targetRow && tableContainer) {
        const containerHeight = tableContainer.clientHeight;
        const rowOffsetTop = targetRow.offsetTop;
        const rowHeight = targetRow.offsetHeight;

        const scrollTop = rowOffsetTop - containerHeight / 2 + rowHeight / 2;

        tableContainer.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        });
      }
    }, 100);
  };

  handleCardClick = (date) => {
    this.setState({ hoveredRowDate: date });

    // Automatyczne wyczyszczenie po opóźnieniu
    setTimeout(() => {
      this.setState({ hoveredRowDate: null });
    }, 2000);
  };

  handlePointLeave = () => {
    // Dodaj opóźnienie przed usunięciem podświetlenia aby zapobiec migotaniu
    this.hoverTimeout = setTimeout(() => {
      this.setState({ hoveredPointDate: null });
      this.hoverTimeout = null;
    }, 300);
  };

  handleRowHover = (date) => {
    this.setState({ hoveredRowDate: date });
  };

  handleRowLeave = () => {
    this.setState({ hoveredRowDate: null });
  };

  getBaseUrl() {
    return "http://localhost:8000";
  }

  fetchHistoryData() {
    const baseUrl = this.getBaseUrl();
    const { currency, selectedDate } = this.props;

    this.setState({ loading: true });

    axios
      .get(`${baseUrl}/api/exchange-rates/history`, {
        params: {
          currency: currency.code,
          date: selectedDate || new Date().toISOString().split("T")[0],
        },
      })
      .then((response) => {
        if (response.data.status === "success") {
          this.setState({
            historyData: response.data.data.history || [],
            loading: false,
          });
        } else {
          throw new Error(response.data.message || "API error");
        }
      })
      .catch((error) => {
        console.error("Failed to fetch history data:", error);
        this.setState({
          historyData: [],
          loading: false,
          error: "Nie udało się pobrać danych historycznych. Spróbuj ponownie.",
        });
      });
  }

  formatPolishDate(dateString) {
    const date = new Date(dateString);
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("pl-PL", options);
  }

  formatShortDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  getDateRange() {
    const { historyData } = this.state;
    if (historyData.length === 0) return { from: "", to: "" };

    const sortedData = [...historyData].sort(
      (a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate)
    );

    return {
      from: this.formatShortDate(sortedData[0].effectiveDate),
      to: this.formatShortDate(sortedData[sortedData.length - 1].effectiveDate),
    };
  }

  generateRealChartData() {
    const { historyData } = this.state;
    if (!historyData || historyData.length === 0) {
      return null;
    }

    const sortedData = [...historyData].sort((a, b) => {
      return new Date(a.effectiveDate) - new Date(b.effectiveDate);
    });

    const points = [];
    const numPoints = sortedData.length;

    const rates = sortedData.map((item) => item.nbpRate);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    const range = maxRate - minRate;

    for (let i = 0; i < numPoints; i++) {
      const item = sortedData[i];
      const x = numPoints > 1 ? (i / (numPoints - 1)) * 100 : 50;
      const rate = item.nbpRate;

      let y;
      if (range === 0) {
        // Wszystkie wartości są takie same - pozioma linia na środku
        y = 20;
      } else {
        const normalizedRate = ((rate - minRate) / range) * 30 + 5;
        y = Math.max(5, Math.min(35, normalizedRate));
      }
      points.push(`${x},${y}`);
    }

    return points.join(" ");
  }

  generateChartArea(points, isPositive) {
    if (!points) return "";

    const pointArray = points.split(" ").map((p) => p.split(","));
    const areaPoints = [...pointArray];

    areaPoints.push([pointArray[pointArray.length - 1][0], "40"]);
    areaPoints.push(["0", "40"]);
    areaPoints.unshift(["0", pointArray[0][1]]);

    return areaPoints.map((p) => p.join(",")).join(" ");
  }

  generateChartCircles() {
    const { historyData } = this.state;
    if (!historyData || historyData.length === 0) {
      return [];
    }

    // Sortuj dane chronologicznie (od najstarszych do najnowszych)
    const sortedData = [...historyData].sort((a, b) => {
      return new Date(a.effectiveDate) - new Date(b.effectiveDate);
    });

    const numPoints = sortedData.length;
    const rates = sortedData.map((item) => item.nbpRate);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    const range = maxRate - minRate;

    const circles = [];
    for (let i = 0; i < numPoints; i++) {
      const item = sortedData[i];
      const x = numPoints > 1 ? (i / (numPoints - 1)) * 100 : 50;
      const rate = item.nbpRate;

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
        rate: rate,
      });
    }

    return circles;
  }

  render() {
    const { currency, onClose } = this.props;
    const { historyData, loading, error, hoveredPointDate, hoveredRowDate } =
      this.state;
    const dateRange = this.getDateRange();
    const hasBuyRate = ["EUR", "USD"].includes(currency.code);
    const chartPoints = this.generateRealChartData();
    const chartCircles = this.generateChartCircles();

    return (
      <div className="modal-overlay" onClick={this.handleOverlayClick}>
        <div className="modal-content" ref={this.modalRef}>
          <div className="modal-header">
            <div className="modal-title-section">
              <div className={`currency-icon ${currency.code.toLowerCase()}`}>
                {currency.code === "EUR" && "€"}
                {currency.code === "USD" && "$"}
                {currency.code === "IDR" && "₹"}
                {currency.code === "CZK" && "CZK"}
                {currency.code === "BRL" && "R$"}
              </div>
              <div className="modal-currency-info">
                <h4>{currency.code}</h4>
                <span className="modal-currency-name">{currency.name}</span>
              </div>
            </div>
            <button className="modal-close-btn" onClick={onClose}>
              <span>×</span>
            </button>
          </div>

          <div className="modal-subtitle">
            <h5>
              Historia 14 dni{" "}
              {dateRange.from &&
                dateRange.to &&
                `(${dateRange.from} - ${dateRange.to})`}
            </h5>
            <span className={this.getChangeClass(currency.change)}>
              {currency.change > 0 ? "+" : ""}
              {this.formatPercentage(currency.change, currency.code)}%
              {currency.change !== 0 && (
                <span>{currency.change > 0 ? "↗" : "↘"}</span>
              )}
            </span>
          </div>

          {loading ? (
            <div className="modal-loading">
              <div className="spinner"></div>
              <p>Ładowanie danych historycznych...</p>
            </div>
          ) : error ? (
            <div className="modal-error">
              <div className="alert alert-danger">
                <h6>Błąd połączenia</h6>
                <p>{error}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => this.fetchHistoryData()}
                >
                  Spróbuj ponownie
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="modal-chart-section">
                <div className="large-chart">
                  {chartPoints ? (
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
                          id={`modal-gradient-${currency.code}`}
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stopColor={this.getChangeColor(currency.change)}
                            stopOpacity="0.3"
                          />
                          <stop
                            offset="100%"
                            stopColor={this.getChangeColor(currency.change)}
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <polyline
                        className="chart-line"
                        points={chartPoints}
                        stroke={this.getChangeColor(currency.change)}
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="butt"
                        strokeLinejoin="miter"
                      />
                      <polygon
                        className="chart-area"
                        points={this.generateChartArea(
                          chartPoints,
                          currency.change >= 0
                        )}
                        fill={`url(#modal-gradient-${currency.code})`}
                      />
                      {chartCircles.map((circle, index) => (
                        <g key={index}>
                          {/* Invisible larger circle for easier hover */}
                          <circle
                            cx={circle.x}
                            cy={circle.y}
                            r="4"
                            fill="transparent"
                            className="chart-point-hover-area"
                            onMouseEnter={() =>
                              this.handlePointHover(circle.date)
                            }
                            onMouseLeave={this.handlePointLeave}
                            onClick={() => this.handlePointClick(circle.date)}
                            style={{ cursor: "pointer" }}
                          >
                            <title>
                              {this.formatPolishDate(circle.date)}:{" "}
                              {this.formatRate(circle.rate, currency.code)} PLN
                            </title>
                          </circle>
                          {/* Visible point */}
                          <circle
                            cx={circle.x}
                            cy={circle.y}
                            r="0.8"
                            fill={this.getChangeColor(currency.change)}
                            stroke={
                              hoveredRowDate === circle.date ||
                              hoveredPointDate === circle.date
                                ? "black"
                                : "white"
                            }
                            strokeWidth={
                              hoveredRowDate === circle.date ||
                              hoveredPointDate === circle.date
                                ? "2"
                                : "0.3"
                            }
                            vectorEffect="non-scaling-stroke"
                            className={
                              hoveredRowDate === circle.date ||
                              hoveredPointDate === circle.date
                                ? "chart-point-highlighted"
                                : ""
                            }
                            style={{ cursor: "pointer", pointerEvents: "none" }}
                          />
                        </g>
                      ))}
                    </svg>
                  ) : (
                    <div className="no-chart-data">
                      <p>Brak danych do wyświetlenia wykresu</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-table-section">
                <div className="table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Kurs NBP</th>
                        {hasBuyRate && <th>Kurs kupna</th>}
                        <th>Kurs sprzedaży</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...historyData]
                        .sort(
                          (a, b) =>
                            new Date(b.effectiveDate) -
                            new Date(a.effectiveDate)
                        )
                        .map((item, index) => (
                          <tr
                            key={index}
                            data-date={item.effectiveDate}
                            className={
                              hoveredPointDate === item.effectiveDate
                                ? "table-row-highlighted"
                                : ""
                            }
                            onMouseEnter={() =>
                              this.handleRowHover(item.effectiveDate)
                            }
                            onMouseLeave={this.handleRowLeave}
                          >
                            <td>{this.formatPolishDate(item.effectiveDate)}</td>
                            <td className="rate-cell">
                              {this.formatRate(item.nbpRate, currency.code)} PLN
                            </td>
                            {hasBuyRate && (
                              <td className="buy-rate">
                                {item.buyRate
                                  ? `${this.formatRate(
                                      item.buyRate,
                                      currency.code
                                    )} PLN`
                                  : "-"}
                              </td>
                            )}
                            <td className="sell-rate">
                              {this.formatRate(item.sellRate, currency.code)}{" "}
                              PLN
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards Layout */}
                <div className="history-cards">
                  {[...historyData]
                    .sort(
                      (a, b) =>
                        new Date(b.effectiveDate) - new Date(a.effectiveDate)
                    )
                    .map((item, index) => (
                      <div
                        key={index}
                        data-date={item.effectiveDate}
                        className={`history-card ${
                          hoveredPointDate === item.effectiveDate ||
                          hoveredRowDate === item.effectiveDate
                            ? "table-row-highlighted"
                            : ""
                        }`}
                        onMouseEnter={() =>
                          this.handleRowHover(item.effectiveDate)
                        }
                        onMouseLeave={this.handleRowLeave}
                        onClick={() => this.handleCardClick(item.effectiveDate)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="history-card-header">
                          {this.formatPolishDate(item.effectiveDate)}
                        </div>
                        <div className="history-card-body">
                          <div className="rate-row">
                            <span className="rate-label">Kurs NBP:</span>
                            <span className="rate-value">
                              {this.formatRate(item.nbpRate, currency.code)} PLN
                            </span>
                          </div>
                          {hasBuyRate && (
                            <div className="rate-row">
                              <span className="rate-label">Kurs kupna:</span>
                              <span className="rate-value buy-rate">
                                {item.buyRate
                                  ? `${this.formatRate(
                                      item.buyRate,
                                      currency.code
                                    )} PLN`
                                  : "-"}
                              </span>
                            </div>
                          )}
                          <div className="rate-row">
                            <span className="rate-label">Kurs sprzedaży:</span>
                            <span className="rate-value sell-rate">
                              {this.formatRate(item.sellRate, currency.code)}{" "}
                              PLN
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
}

export default CurrencyDetailsModal;
