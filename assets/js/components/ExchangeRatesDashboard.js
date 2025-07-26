// ./assets/js/components/ExchangeRatesDashboard.js

import React, {Component} from 'react';
import axios from 'axios';

class ExchangeRatesDashboard extends Component {
    constructor() {
        super();
        this.state = { 
            exchangeRates: [], 
            loading: true,
            error: null,
            selectedDate: new Date().toISOString().split('T')[0]
        };
    }

    getBaseUrl() {
        return 'http://localhost:8000';
    }

    componentDidMount() {
        this.fetchExchangeRates();
    }

    fetchExchangeRates() {
        const baseUrl = this.getBaseUrl();
        this.setState({ loading: true });
        
        axios.get(`${baseUrl}/api/exchange-rates`)
            .then(response => {
                if (response.data.status === 'success') {
                    const exchangeRates = response.data.data.map(rate => ({
                        code: rate.code,
                        name: rate.currency,
                        rate: rate.nbpRate,
                        buyRate: rate.buyRate,
                        sellRate: rate.sellRate,
                        change: rate.percentageChange || 0,
                        trend: rate.trend || 'neutral'
                    }));
                    
                    this.setState({ 
                        exchangeRates: exchangeRates, 
                        loading: false 
                    });
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

    generateMiniChart(trend, seed = 0) {
        const points = [];
        let baseValue = 20;
        const direction = trend === 'up' ? 1 : -1;
        
        for (let i = 0; i < 14; i++) {
            const x = (i / 13) * 100;
            const noise = Math.sin((i + seed) * 0.8) * 3;
            const trendValue = direction * (i * 1.2);
            const y = Math.max(5, Math.min(35, baseValue + trendValue + noise));
            points.push(`${x},${y}`);
        }
        return points.join(' ');
    }

    render() {
        const { loading, exchangeRates, selectedDate, error } = this.state;
        
        return(
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12">
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
                                        onChange={(e) => {
                                            this.setState({selectedDate: e.target.value});
                                            if (e.target.value !== new Date().toISOString().split('T')[0]) {
                                                console.log('Note: NBP API provides current rates only. Historical selection affects chart data.');
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {loading ? (
                                <div className="loading-container">
                                    <div className="spinner-border" role="status">
                                        <span className="sr-only">Ładowanie...</span>
                                    </div>
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
                                                    <th>Zmiana</th>
                                                    <th>Wykres (14 dni)</th>
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
                                                        <td>
                                                            <span className={currency.change >= 0 ? 'change-positive' : 'change-negative'}>
                                                                {currency.change >= 0 ? '+' : ''}{currency.change.toFixed(1)}%
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="mini-chart">
                                                                <svg viewBox="0 0 100 40">
                                                                    <defs>
                                                                        <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                                                            <stop offset="0%" stopColor={currency.trend === 'up' ? '#00b894' : '#e17055'} stopOpacity="0.3"/>
                                                                            <stop offset="100%" stopColor={currency.trend === 'up' ? '#00b894' : '#e17055'} stopOpacity="0"/>
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <polyline 
                                                                        className="chart-line" 
                                                                        points={this.generateMiniChart(currency.trend, index)}
                                                                        stroke={currency.trend === 'up' ? '#00b894' : '#e17055'}
                                                                    />
                                                                    <polygon 
                                                                        className="chart-area"
                                                                        points={`0,40 ${this.generateMiniChart(currency.trend, index)} 100,40`}
                                                                        fill={`url(#gradient-${index})`}
                                                                    />
                                                                </svg>
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
                                                        <span className="rate-label">Wykres (14 dni):</span>
                                                        <div className="mini-chart-mobile">
                                                            <svg viewBox="0 0 100 40">
                                                                <defs>
                                                                    <linearGradient id={`gradient-mobile-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                                                        <stop offset="0%" stopColor={currency.trend === 'up' ? '#00b894' : '#e17055'} stopOpacity="0.3"/>
                                                                        <stop offset="100%" stopColor={currency.trend === 'up' ? '#00b894' : '#e17055'} stopOpacity="0"/>
                                                                    </linearGradient>
                                                                </defs>
                                                                <polyline 
                                                                    className="chart-line" 
                                                                    points={this.generateMiniChart(currency.trend, index)}
                                                                    stroke={currency.trend === 'up' ? '#00b894' : '#e17055'}
                                                                />
                                                                <polygon 
                                                                    className="chart-area"
                                                                    points={`0,40 ${this.generateMiniChart(currency.trend, index)} 100,40`}
                                                                    fill={`url(#gradient-mobile-${index})`}
                                                                />
                                                            </svg>
                                                        </div>
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
        )
    }
}

export default ExchangeRatesDashboard; 