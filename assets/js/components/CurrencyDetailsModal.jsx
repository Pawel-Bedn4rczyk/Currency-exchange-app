import React, { Component } from "react";
import {
  formatRate,
  formatPolishDate,
  formatShortDate,
  getChangeColor,
} from "../utils/formatters.js";
import { fetchCurrencyHistory } from "../utils/apiService.js";
import {
  generateChartData,
  generateChartArea,
  generateChartCircles,
} from "../utils/chartUtils.js";
import { CURRENCIES_WITH_BUY_RATE } from "../utils/constants.js";
import LoadingSpinner from "./shared/LoadingSpinner.jsx";
import ErrorMessage from "./shared/ErrorMessage.jsx";
import CurrencyIcon from "./shared/CurrencyIcon.jsx";
import PercentageChange from "./shared/PercentageChange.jsx";

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
        `.history-cards .history-card[data-date="${date}"]`
      );
      const targetRow = document.querySelector(`tr[data-date="${date}"]`);
      const historyCardsContainer = document.querySelector(".history-cards");
      const tableContainer = document.querySelector(".table-container");

      // Mobile
      if (targetCard && historyCardsContainer) {
        targetCard.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
      // Desktop
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

  async fetchHistoryData() {
    const { currency, selectedDate } = this.props;

    this.setState({ loading: true });

    try {
      const response = await fetchCurrencyHistory(
        currency.code,
        selectedDate || new Date().toISOString().split("T")[0]
      );

      if (response.status === "success") {
        this.setState({
          historyData: response.data.history || [],
          loading: false,
        });
      } else {
        throw new Error(response.message || "API error");
      }
    } catch (error) {
      console.error("Failed to fetch history data:", error);
      this.setState({
        historyData: [],
        loading: false,
        error: "Nie udało się pobrać danych historycznych. Spróbuj ponownie.",
      });
    }
  }

  getDateRange() {
    const { historyData } = this.state;
    if (historyData.length === 0) return { from: "", to: "" };

    const sortedData = [...historyData].sort(
      (a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate)
    );

    return {
      from: formatShortDate(sortedData[0].effectiveDate),
      to: formatShortDate(sortedData[sortedData.length - 1].effectiveDate),
    };
  }

  render() {
    const { currency, onClose } = this.props;
    const { historyData, loading, error, hoveredPointDate, hoveredRowDate } =
      this.state;
    const dateRange = this.getDateRange();
    const hasBuyRate = CURRENCIES_WITH_BUY_RATE.includes(currency.code);
    const chartPoints = generateChartData(historyData);
    const chartCircles = generateChartCircles(historyData);

    return (
      <div className="modal-overlay" onClick={this.handleOverlayClick}>
        <div className="modal-content" ref={this.modalRef}>
          <div className="modal-header">
            <div className="modal-title-section">
              <CurrencyIcon currency={currency.code} />
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
            <PercentageChange
              change={currency.change}
              currencyCode={currency.code}
            />
          </div>

          {loading ? (
            <div className="modal-loading">
              <LoadingSpinner message="Ładowanie danych historycznych..." />
            </div>
          ) : error ? (
            <div className="modal-error">
              <ErrorMessage
                error={error}
                onRetry={() => this.fetchHistoryData()}
              />
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
                            stopColor={getChangeColor(currency.change)}
                            stopOpacity="0.3"
                          />
                          <stop
                            offset="100%"
                            stopColor={getChangeColor(currency.change)}
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <polyline
                        className="chart-line"
                        points={chartPoints}
                        stroke={getChangeColor(currency.change)}
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="butt"
                        strokeLinejoin="miter"
                      />
                      <polygon
                        className="chart-area"
                        points={generateChartArea(
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
                              {formatPolishDate(circle.date)}:{" "}
                              {formatRate(circle.rate, currency.code)} PLN
                            </title>
                          </circle>
                          {/* Visible point */}
                          <circle
                            cx={circle.x}
                            cy={circle.y}
                            r="0.8"
                            fill={getChangeColor(currency.change)}
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
                            <td>{formatPolishDate(item.effectiveDate)}</td>
                            <td className="rate-cell">
                              {formatRate(item.nbpRate, currency.code)} PLN
                            </td>
                            {hasBuyRate && (
                              <td className="buy-rate">
                                {item.buyRate
                                  ? `${formatRate(
                                      item.buyRate,
                                      currency.code
                                    )} PLN`
                                  : "-"}
                              </td>
                            )}
                            <td className="sell-rate">
                              {formatRate(item.sellRate, currency.code)} PLN
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
                          {formatPolishDate(item.effectiveDate)}
                        </div>
                        <div className="history-card-body">
                          <div className="rate-row">
                            <span className="rate-label">Kurs NBP:</span>
                            <span className="rate-value">
                              {formatRate(item.nbpRate, currency.code)} PLN
                            </span>
                          </div>
                          {hasBuyRate && (
                            <div className="rate-row">
                              <span className="rate-label">Kurs kupna:</span>
                              <span className="rate-value buy-rate">
                                {item.buyRate
                                  ? `${formatRate(
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
                              {formatRate(item.sellRate, currency.code)} PLN
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
