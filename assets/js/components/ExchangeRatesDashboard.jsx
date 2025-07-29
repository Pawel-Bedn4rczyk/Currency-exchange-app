import React, { Component } from "react";
import CurrencyDetailsModal from "./CurrencyDetailsModal.jsx";
import { formatRate, formatPolishDate } from "../utils/formatters.js";
import {
  fetchExchangeRates,
  fetchChartDataForCurrencies,
} from "../utils/apiService.js";
import { CURRENCY_NAMES, CURRENCY_ORDER } from "../utils/constants.js";
import LoadingSpinner from "./shared/LoadingSpinner.jsx";
import ErrorMessage from "./shared/ErrorMessage.jsx";
import CurrencyIcon from "./shared/CurrencyIcon.jsx";
import PercentageChange from "./shared/PercentageChange.jsx";
import MiniChart from "./shared/MiniChart.jsx";

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

  componentDidMount() {
    this.fetchExchangeRates();
  }

  async fetchExchangeRates() {
    this.setState({ loading: true });

    try {
      const response = await fetchExchangeRates();

      if (response.status === "success") {
        const exchangeRates = response.data.map((rate) => ({
          code: rate.code,
          name: CURRENCY_NAMES[rate.code] || rate.currency,
          rate: rate.nbpRate,
          buyRate: rate.buyRate,
          sellRate: rate.sellRate,
          change: rate.percentageChange || 0,
          trend: rate.trend || "neutral",
        }));

        // Sortuj w określonej kolejności
        const sortedRates = CURRENCY_ORDER.map((code) =>
          exchangeRates.find((rate) => rate.code === code)
        ).filter(Boolean);

        // Zapisz informację o dacie danych
        const actualDataDate = response.actualDataDate;

        this.setState({
          exchangeRates: sortedRates,
          loading: false,
          actualDataDate: actualDataDate,
        });

        // Pobierz dane wykresów dla każdej waluty
        this.fetchChartDataForAllCurrencies();
      } else {
        throw new Error(response.message || "API error");
      }
    } catch (error) {
      console.error("Failed to fetch exchange rates:", error);
      this.setState({
        exchangeRates: [],
        loading: false,
        error: "Nie udało się pobrać kursów walut. Spróbuj ponownie.",
      });
    }
  }

  async fetchChartDataForAllCurrencies() {
    const { selectedDate, exchangeRates } = this.state;

    this.setState({ loadingCharts: true });

    try {
      const chartData = await fetchChartDataForCurrencies(
        exchangeRates,
        selectedDate
      );
      this.setState({ chartData, loadingCharts: false });
    } catch (error) {
      console.error("Failed to fetch chart data:", error);
      this.setState({ loadingCharts: false });
    }
  }

  // Pobierz kursy walut dla wybranej daty
  async fetchExchangeRatesForDate() {
    const { selectedDate } = this.state;

    this.setState({ loading: true });

    try {
      const response = await fetchExchangeRates(selectedDate);

      if (response.status === "success") {
        const exchangeRates = response.data.map((rate) => ({
          code: rate.code,
          name: CURRENCY_NAMES[rate.code] || rate.currency,
          rate: rate.nbpRate,
          buyRate: rate.buyRate,
          sellRate: rate.sellRate,
          change: rate.percentageChange || 0,
          trend: rate.trend || "neutral",
        }));

        // Sortuj w określonej kolejności
        const sortedRates = CURRENCY_ORDER.map((code) =>
          exchangeRates.find((rate) => rate.code === code)
        ).filter(Boolean);

        // Zaktualizuj informację o dacie danych
        const actualDataDate = response.actualDataDate;

        this.setState({
          exchangeRates: sortedRates,
          loading: false,
          actualDataDate: actualDataDate,
        });
      } else {
        throw new Error(response.message || "API error");
      }
    } catch (error) {
      console.error("Failed to fetch exchange rates for date:", error);
      this.setState({
        loading: false,
        error: "Nie udało się pobrać kursów walut dla wybranej daty.",
      });
    }
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
                      Kurs z dnia: {formatPolishDate(actualDataDate)}
                    </strong>
                  </div>
                ) : (
                  <div className="data-status data-status-placeholder">
                    <strong>&nbsp;</strong>
                  </div>
                )}
              </div>

              {loading || loadingCharts ? (
                <LoadingSpinner />
              ) : error ? (
                <ErrorMessage
                  error={error}
                  onRetry={() => {
                    this.setState({ error: null });
                    this.fetchExchangeRates();
                  }}
                />
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
                                <CurrencyIcon currency={currency.code} />
                                <div className="currency-info">
                                  <h6>{currency.code}</h6>
                                  <small>{currency.name}</small>
                                </div>
                              </div>
                            </td>
                            <td className="rate-cell">
                              {formatRate(currency.rate, currency.code)} PLN
                            </td>
                            <td className="buy-rate">
                              {currency.buyRate
                                ? `${formatRate(
                                    currency.buyRate,
                                    currency.code
                                  )} PLN`
                                : "-"}
                            </td>
                            <td className="sell-rate">
                              {formatRate(currency.sellRate, currency.code)} PLN
                            </td>
                            <td
                              style={{ padding: "8px 8px 8px 12px" }}
                              className="chart-cell"
                            >
                              <div className="chart-cell-content">
                                <div className="percentage-section">
                                  <PercentageChange
                                    change={currency.change}
                                    currencyCode={currency.code}
                                  />
                                </div>
                                <div className="chart-section">
                                  <MiniChart
                                    data={this.state.chartData[currency.code]}
                                    currency={currency}
                                    index={index}
                                  />
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
                            <CurrencyIcon currency={currency.code} />
                            <div className="currency-info">
                              <h6>{currency.code}</h6>
                              <small>{currency.name}</small>
                            </div>
                          </div>
                          <PercentageChange
                            change={currency.change}
                            currencyCode={currency.code}
                          />
                        </div>
                        <div className="currency-card-body">
                          <div className="rate-row">
                            <span className="rate-label">Kurs NBP:</span>
                            <span className="rate-value">
                              {formatRate(currency.rate, currency.code)} PLN
                            </span>
                          </div>
                          <div className="rate-row">
                            <span className="rate-label">Kurs kupna:</span>
                            <span className="rate-value buy-rate">
                              {currency.buyRate
                                ? `${formatRate(
                                    currency.buyRate,
                                    currency.code
                                  )} PLN`
                                : "-"}
                            </span>
                          </div>
                          <div className="rate-row">
                            <span className="rate-label">Kurs sprzedaży:</span>
                            <span className="rate-value sell-rate">
                              {formatRate(currency.sellRate, currency.code)} PLN
                            </span>
                          </div>
                          <div className="rate-row">
                            <span className="rate-label">
                              Historia waluty 14 dni:
                            </span>
                            <MiniChart
                              data={this.state.chartData[currency.code]}
                              currency={currency}
                              index={index}
                              isMobile={true}
                            />
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
