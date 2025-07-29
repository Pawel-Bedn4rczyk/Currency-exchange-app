import axios from "axios";

// Base URL dla API
export const getBaseUrl = () => {
  return "http://localhost:8000";
};

// Pobierz kursy walut
export const fetchExchangeRates = async (date = null) => {
  const baseUrl = getBaseUrl();
  const params = date ? { date } : {};

  const response = await axios.get(`${baseUrl}/api/exchange-rates`, { params });
  return response.data;
};

// Pobierz historię kursu waluty
export const fetchCurrencyHistory = async (currency, date = null) => {
  const baseUrl = getBaseUrl();
  const params = { currency };
  if (date) params.date = date;

  const response = await axios.get(`${baseUrl}/api/exchange-rates/history`, {
    params,
  });
  return response.data;
};

// Pobierz dane wykresów dla wielu walut
export const fetchChartDataForCurrencies = async (currencies, date) => {
  const promises = currencies.map((currency) =>
    fetchCurrencyHistory(currency.code, date)
  );

  const responses = await Promise.all(promises);
  const chartData = {};

  responses.forEach((response, index) => {
    if (response.status === "success") {
      const currencyCode = currencies[index].code;
      chartData[currencyCode] = response.data.history;
    }
  });

  return chartData;
};
