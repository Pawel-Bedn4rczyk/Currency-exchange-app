import React, {Component} from 'react';
import axios from 'axios';

class ExchangeRatesDashboard extends Component {
    constructor() {
        super();
        this.state = { 
            exchangeRates: [], 
            chartData: {},
            loading: true,
            loadingCharts: false,
            error: null,
            selectedDate: new Date().toISOString().split('T')[0],
            actualDataDate: null
        };
    }

    getBaseUrl() {
        return 'http://localhost:8000';
    }



    // Format date in Polish
    formatPolishDate(dateString) {
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('pl-PL', options);
    }



    componentDidMount() {
        this.fetchExchangeRates();
    }

    fetchExchangeRates() {
        const baseUrl = this.getBaseUrl();
        this.setState({ loading: true });
        
        const currencyNames = {
            'EUR': 'Euro',
            'USD': 'Dolar amerykański',
            'CZK': 'Korona czeska',
            'BRL': 'Real brazylijski',
            'IDR': 'Rupia indonezyjska'
        };
        
        axios.get(`${baseUrl}/api/exchange-rates`)
            .then(response => {
                if (response.data.status === 'success') {
                    const exchangeRates = response.data.data.map(rate => ({
                        code: rate.code,
                        name: currencyNames[rate.code] || rate.currency,
                        rate: rate.nbpRate,
                        buyRate: rate.buyRate,
                        sellRate: rate.sellRate,
                        change: rate.percentageChange || 0,
                        trend: rate.trend || 'neutral'
                    }));
                    
                    // Sort by specified order
                    const order = ['EUR', 'USD', 'CZK', 'BRL', 'IDR'];
                    const sortedRates = order.map(code => 
                        exchangeRates.find(rate => rate.code === code)
                    ).filter(Boolean);

                    // Save information about the data date
                    const actualDataDate = response.data.actualDataDate;

                    this.setState({ 
                        exchangeRates: sortedRates, 
                        loading: false,
                        actualDataDate: actualDataDate
                    });
                    
                    // Fetch chart data for each currency
                    this.fetchChartDataForAllCurrencies();
                } else {
                    throw new Error(response.data.message || 'API error');
                }
            })
            .catch(error => {
                console.error('Failed to fetch exchange rates:', error);
                this.setState({ 
                    exchangeRates: [], 
                    loading: false,
                    error: 'Nie udało się pobrać kursów walut. Spróbuj ponownie.'
                });
            });
    }

    fetchChartDataForAllCurrencies() {
        const baseUrl = this.getBaseUrl();
        const { selectedDate, exchangeRates } = this.state;
        
        this.setState({ loadingCharts: true });
        
        const promises = exchangeRates.map(currency => 
            axios.get(`${baseUrl}/api/exchange-rates/history`, {
                params: {
                    currency: currency.code,
                    date: selectedDate
                }
            })
        );
        
        Promise.all(promises)
            .then(responses => {
                const chartData = {};
                responses.forEach((response, index) => {
                    if (response.data.status === 'success') {
                        const currencyCode = exchangeRates[index].code;
                        chartData[currencyCode] = response.data.data.history;
                    }
                });
                
                this.setState({ chartData, loadingCharts: false });
            })
            .catch(error => {
                console.error('Failed to fetch chart data:', error);
                this.setState({ loadingCharts: false });
            });
    }

    generateMiniChart(trend, seed = 0) {
        const points = [];
        let baseValue = 20;
        const direction = trend === 'up' ? 1 : -1;
        const numPoints = 14;
        
        let volatility = 0.5 + (seed % 3) * 0.2;
        let currentValue = baseValue;
        
        for (let i = 0; i < numPoints; i++) {
            const x = (i / (numPoints - 1)) * 100;
            
            const trendStrength = direction * (i / numPoints) * 12;
            
            const shortTermNoise = Math.sin((i + seed) * 0.8) * volatility * 4;
            
            const mediumTermNoise = Math.cos((i + seed * 2) * 0.4) * volatility * 5;
            
            const randomShock = (Math.random() - 0.5) * volatility * 2;
            
            const suddenJumps = Math.sin((i + seed) * 2.5) * volatility * 3;
            
            currentValue = baseValue + trendStrength + shortTermNoise + mediumTermNoise + randomShock + suddenJumps;
            
            const y = Math.max(5, Math.min(35, currentValue));
            points.push(`${x},${y}`);
            
            currentValue = y;
        }
        
        return points.join(' ');
    }

    generateChartArea(points, isPositive) {
        const pointArray = points.split(' ').map(p => p.split(','));
        const areaPoints = [...pointArray];
        
        areaPoints.push([pointArray[pointArray.length - 1][0], '40']);
        areaPoints.push(['0', '40']);
        areaPoints.unshift(['0', pointArray[0][1]]);
        
        return areaPoints.map(p => p.join(',')).join(' ');
    }

    generateRealChartData(currencyCode) {
        const { chartData } = this.state;
        const data = chartData[currencyCode];
        
        if (!data || data.length === 0) {
            return null; 
        }
        
        // Sort data chronologically (from oldest to newest) for the chart
        const sortedData = [...data].sort((a, b) => {
            return new Date(a.effectiveDate) - new Date(b.effectiveDate);
        });
        
        
        const points = [];
        const numPoints = sortedData.length;
        
        
        // Find min and max for scaling - use nbpRate instead of mid
        const rates = sortedData.map(item => item.nbpRate || item.mid);
        const minRate = Math.min(...rates);
        const maxRate = Math.max(...rates);
        const range = maxRate - minRate || 1;
        
        // Generate points for the chart (from oldest to newest)
        // Always stretch to full width of SVG (0-100)
        for (let i = 0; i < numPoints; i++) {
            const item = sortedData[i];
            // Stretch evenly to full width, regardless of the number of points
            const x = numPoints > 1 ? (i / (numPoints - 1)) * 100 : 50; // Center if only 1 point
            const rate = item.nbpRate || item.mid;
            const normalizedRate = ((rate - minRate) / range) * 30 + 5; // Scale to 5-35
            const y = Math.max(5, Math.min(35, normalizedRate));
            points.push(`${x},${y}`);
        }
        
        return points.join(' ');
    }

    // Generate visible points (circles) on the chart
    generateChartCircles(currencyCode) {
        const { chartData } = this.state;
        const data = chartData[currencyCode];
        
        if (!data || data.length === 0) {
            return [];
        }
        
        // Sort data chronologically (from oldest to newest)
        const sortedData = [...data].sort((a, b) => {
            return new Date(a.effectiveDate) - new Date(b.effectiveDate);
        });
        
        const numPoints = sortedData.length; 
        const rates = sortedData.map(item => item.nbpRate || item.mid);
        const minRate = Math.min(...rates);
        const maxRate = Math.max(...rates);
        const range = maxRate - minRate || 1;
        
        const circles = [];
        for (let i = 0; i < numPoints; i++) {
            const item = sortedData[i];
            const x = numPoints > 1 ? (i / (numPoints - 1)) * 100 : 50;
            const rate = item.nbpRate || item.mid;
            const normalizedRate = ((rate - minRate) / range) * 30 + 5;
            const y = Math.max(5, Math.min(35, normalizedRate));
            
            circles.push({
                x: x,
                y: y,
                date: item.effectiveDate
            });
        }
        
        return circles;
    }

    // Fetch exchange rates for selected date
    fetchExchangeRatesForDate() {
        const baseUrl = this.getBaseUrl();
        const { selectedDate } = this.state;
        
        this.setState({ loading: true });
        
        const currencyNames = {
            'EUR': 'Euro',
            'USD': 'Dolar amerykański',
            'CZK': 'Korona czeska',
            'BRL': 'Real brazylijski',
            'IDR': 'Rupia indonezyjska'
        };
        
        axios.get(`${baseUrl}/api/exchange-rates`, {
            params: {
                date: selectedDate
            }
        })
        .then(response => {
            if (response.data.status === 'success') {
                const exchangeRates = response.data.data.map(rate => ({
                    code: rate.code,
                    name: currencyNames[rate.code] || rate.currency,
                    rate: rate.nbpRate,
                    buyRate: rate.buyRate,
                    sellRate: rate.sellRate,
                    change: rate.percentageChange || 0,
                    trend: rate.trend || 'neutral'
                }));
                
                // Sort by specified order
                const order = ['EUR', 'USD', 'CZK', 'BRL', 'IDR'];
                const sortedRates = order.map(code => 
                    exchangeRates.find(rate => rate.code === code)
                ).filter(Boolean);
                
                // Update information about the data date
                const actualDataDate = response.data.actualDataDate;
                
                this.setState({ 
                    exchangeRates: sortedRates, 
                    loading: false,
                    actualDataDate: actualDataDate
                });
            } else {
                throw new Error(response.data.message || 'API error');
            }
        })
        .catch(error => {
            console.error('Failed to fetch exchange rates for date:', error);
            this.setState({ 
                loading: false,
                error: 'Nie udało się pobrać kursów walut dla wybranej daty.'
            });
        });
    }

    render() {
        const { loading, loadingCharts, exchangeRates, selectedDate, error, actualDataDate } = this.state;
        const today = new Date().toISOString().split('T')[0];
        
        return(
            <div className="container-fluid">
                <div className="row justify-content-center">
                    <div className=" col-md-12 col-lg-11 col-xl-8">
                        <div className="exchange-rates-card">
                            <div className="card-header">
                                <h2>Kursy walut kantoru</h2>
                                <div className="date-selector-wrapper">
                                    <label htmlFor="dateSelector">Data:</label>
                                    <input 
                                        type="date" 
                                        id="dateSelector"
                                        className="date-input" 
                                        value={selectedDate}
                                        max={today}
                                        onKeyDown={e => e.preventDefault()}
                                        onPaste={e => e.preventDefault()} 
                                        onChange={(e) => {
                                            this.setState({selectedDate: e.target.value}, () => {
                                                // Fetch new exchange rates for selected date
                                                this.fetchExchangeRatesForDate();
                                                // Fetch chart data for all currencies
                                                this.fetchChartDataForAllCurrencies();
                                            });
                                        }}
                                    />
                                    {(loading || loadingCharts) && (
                                        <div className="loading-spinner-small">
                                            <div className="spinner-border spinner-border-sm" role="status">
                                                <span className="sr-only">Ładowanie...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {actualDataDate && (
                                    <div className={`data-status ${actualDataDate !== selectedDate ? 'different-date' : 'current-date'}`}>
                                            <strong>Kurs z dnia: {this.formatPolishDate(actualDataDate)}</strong>
                                    </div>
                                )}
                            </div>



                            {(loading || loadingCharts) ? (
                                <div className="loading-container">
                                    <div className="spinner-border" role="status">
                                        <span className="sr-only">Ładowanie...</span>
                                    </div>
                                    <p className="mt-3 text-muted">Ładowanie danych...</p>
                                </div>
                            ) : error ? (
                                <div className="error-container text-center p-4">
                                    <div className="alert alert-danger" role="alert">
                                        <h5>Błąd połączenia</h5>
                                        <p>{error}</p>
                                        <button 
                                            className="btn btn-primary" 
                                            onClick={() => {
                                                this.setState({error: null});
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
                                                    <tr key={currency.code}>
                                                        <td>
                                                            <div className="currency-cell">
                                                                <div className={`currency-icon ${currency.code.toLowerCase()}`}>
                                                                    {currency.code === 'EUR' && '€'}
                                                                    {currency.code === 'USD' && '$'}
                                                                    {currency.code === 'IDR' && '₹'}
                                                                    {currency.code === 'CZK' && 'CZK'}
                                                                    {currency.code === 'BRL' && 'R$'}
                                                                </div>
                                                                <div className="currency-info">
                                                                    <h6>{currency.code}</h6>
                                                                    <small>{currency.name}</small>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="rate-cell">{currency.rate.toFixed(4)} PLN</td>
                                                        <td className="buy-rate">
                                                            {currency.buyRate ? `${currency.buyRate.toFixed(4)} PLN` : '-'}
                                                        </td>
                                                        <td className="sell-rate">{currency.sellRate.toFixed(4)} PLN</td>
                                                        <td style={{ padding: '8px 8px 8px 12px',}} className="chart-cell">
                                                            <div className="chart-cell-content">
                                                                <div className="percentage-section">
                                                                    <span className={currency.change >= 0 ? 'change-positive' : 'change-negative'}>
                                                                        {currency.change >= 0 ? '+' : ''}{currency.change.toFixed(1)}%
                                                                        <i className={currency.change >= 0 ? 'bi bi-arrow-up-right' : 'bi bi-arrow-down-right'}></i>
                                                                    </span>
                                                                </div>
                                                            <div className="chart-section">
                                                                {this.generateRealChartData(currency.code) ? (
                                                                    <div className="mini-chart">
                                                                        <svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet" style={{width: '100%', height: '100%', display: 'block'}}>
                                                                            <defs>
                                                                                <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                                                                    <stop offset="0%" stopColor={currency.change >= 0 ? '#00b894' : '#e17055'} stopOpacity="0.3"/>
                                                                                    <stop offset="100%" stopColor={currency.change >= 0 ? '#00b894' : '#e17055'} stopOpacity="0"/>
                                                                                </linearGradient>
                                                                            </defs>
                                                                            <polyline 
                                                                                className="chart-line" 
                                                                                points={this.generateRealChartData(currency.code)}
                                                                                stroke={currency.change >= 0 ? '#00b894' : '#e17055'}
                                                                                strokeWidth="2"
                                                                                fill="none"
                                                                                strokeLinecap="butt"
                                                                                strokeLinejoin="miter"
                                                                            />
                                                                            <polygon 
                                                                                className="chart-area"
                                                                                points={this.generateChartArea(this.generateRealChartData(currency.code), currency.change >= 0)}
                                                                                fill={`url(#gradient-${index})`}
                                                                            />
                                                                            {/* Chart points */}
                                                                            {this.generateChartCircles(currency.code).map((circle, circleIndex) => (
                                                                                <circle 
                                                                                    key={circleIndex}
                                                                                    cx={circle.x} 
                                                                                    cy={circle.y} 
                                                                                    r="0.8"
                                                                                    fill={currency.change >= 0 ? '#00b894' : '#e17055'}
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

                                    <div className="d-md-none mobile-cards">
                                        {exchangeRates.map((currency, index) => (
                                            <div key={currency.code} className="currency-card">
                                                <div className="currency-card-header">
                                                    <div className="currency-cell">
                                                        <div className={`currency-icon ${currency.code.toLowerCase()}`}>
                                                            {currency.code === 'EUR' && '€'}
                                                            {currency.code === 'USD' && '$'}
                                                            {currency.code === 'IDR' && '₹'}
                                                            {currency.code === 'CZK' && 'CZK'}
                                                            {currency.code === 'BRL' && 'R$'}
                                                        </div>
                                                        <div className="currency-info">
                                                            <h6>{currency.code}</h6>
                                                            <small>{currency.name}</small>
                                                        </div>
                                                    </div>
                                                    <span className={currency.change >= 0 ? 'change-positive' : 'change-negative'}>
                                                        {currency.change >= 0 ? '+' : ''}{currency.change.toFixed(1)}%
                                                        <i className={currency.change >= 0 ? 'bi bi-arrow-up-right' : 'bi bi-arrow-down-right'}></i>
                                                    </span>
                                                </div>
                                                <div className="currency-card-body">
                                                    <div className="rate-row">
                                                        <span className="rate-label">Kurs NBP:</span>
                                                        <span className="rate-value">{currency.rate.toFixed(4)} PLN</span>
                                                    </div>
                                                    <div className="rate-row">
                                                        <span className="rate-label">Kurs kupna:</span>
                                                        <span className="rate-value buy-rate">
                                                            {currency.buyRate ? `${currency.buyRate.toFixed(4)} PLN` : '-'}
                                                        </span>
                                                    </div>
                                                    <div className="rate-row">
                                                        <span className="rate-label">Kurs sprzedaży:</span>
                                                        <span className="rate-value sell-rate">{currency.sellRate.toFixed(4)} PLN</span>
                                                    </div>
                                                    <div className="rate-row">
                                                        <span className="rate-label">Historia waluty 14 dni:</span>
                                                        {this.generateRealChartData(currency.code) ? (
                                                            <div className="mini-chart-mobile">
                                                                <svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet" style={{width: '100%', height: '100%', display: 'block', marginLeft: '10px'}}>
                                                                    <defs>
                                                                        <linearGradient id={`gradient-mobile-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                                                            <stop offset="0%" stopColor={currency.change >= 0 ? '#00b894' : '#e17055'} stopOpacity="0.3"/>
                                                                            <stop offset="100%" stopColor={currency.change >= 0 ? '#00b894' : '#e17055'} stopOpacity="0"/>
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <polyline 
                                                                        className="chart-line" 
                                                                        points={this.generateRealChartData(currency.code)}
                                                                        stroke={currency.change >= 0 ? '#00b894' : '#e17055'}
                                                                        strokeWidth="2"
                                                                        fill="none"
                                                                        strokeLinecap="butt"
                                                                        strokeLinejoin="miter"
                                                                    />
                                                                    <polygon 
                                                                        className="chart-area"
                                                                        points={this.generateChartArea(this.generateRealChartData(currency.code), currency.change >= 0)}
                                                                        fill={`url(#gradient-mobile-${index})`}
                                                                    />
                                                                    {/* Chart points mobile */}
                                                                    {this.generateChartCircles(currency.code).map((circle, circleIndex) => (
                                                                        <circle 
                                                                            key={circleIndex}
                                                                            cx={circle.x} 
                                                                            cy={circle.y} 
                                                                            r="0.8"
                                                                            fill={currency.change >= 0 ? '#00b894' : '#e17055'}
                                                                            stroke="white"
                                                                            strokeWidth="0.3"
                                                                            vectorEffect="non-scaling-stroke"
                                                                        />
                                                                    ))}
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
            </div>
        );
    }
}

export default ExchangeRatesDashboard; 