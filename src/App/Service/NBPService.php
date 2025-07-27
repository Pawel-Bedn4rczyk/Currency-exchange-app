<?php

declare(strict_types=1);

namespace App\Service;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class NBPService
{
    private const NBP_BASE_URL = 'https://api.nbp.pl/api/exchangerates';
    private const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'CZK', 'IDR', 'BRL'];
    
    private Client $httpClient;

    public function __construct()
    {
        $this->httpClient = new Client([
            'timeout' => 10.0,
            'verify' => false
        ]);
    }

    /**
     * Pobiera aktualne kursy wszystkich obsługiwanych walut
     */
    public function getCurrentRates(): array
    {
        try {
            $response = $this->httpClient->get(self::NBP_BASE_URL . '/tables/A/', [
                'query' => ['format' => 'json']
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            
            if (empty($data) || !isset($data[0]['rates'])) {
                throw new \RuntimeException('Invalid NBP API response');
            }

            $rates = $data[0]['rates'];
            $publishedDate = $data[0]['effectiveDate'];
            
            $supportedRates = [];
            foreach ($rates as $rate) {
                if (in_array($rate['code'], self::SUPPORTED_CURRENCIES)) {
                    $supportedRates[] = [
                        'code' => $rate['code'],
                        'currency' => $rate['currency'],
                        'mid' => $rate['mid'],
                        'publishedDate' => $publishedDate
                    ];
                }
            }

            return $supportedRates;
            
        } catch (GuzzleException $e) {
            throw new \RuntimeException('Failed to fetch current rates from NBP API: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Pobiera historyczne kursy dla konkretnej waluty - zawsze 14 dni roboczych wstecz od wybranej daty
     */
    public function getHistoricalRates(string $currencyCode, \DateTime $endDate): array
    {
        if (!in_array($currencyCode, self::SUPPORTED_CURRENCIES)) {
            throw new \InvalidArgumentException("Currency {$currencyCode} is not supported");
        }

        try {
            // Get wider range (~30 days) to have buffer for weekends/holidays
            $startDate = (clone $endDate)->modify('-30 days');
            
            $url = self::NBP_BASE_URL . '/rates/A/' . $currencyCode . '/' . 
                   $startDate->format('Y-m-d') . '/' . $endDate->format('Y-m-d') . '/';
            
            
            $response = $this->httpClient->get($url, [
                'query' => ['format' => 'json']
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            
            if (empty($data) || !isset($data['rates'])) {
                throw new \RuntimeException('Invalid NBP API response for historical data');
            }

            $allRates = $data['rates'];
            
            // Sort from newest to oldest
            usort($allRates, function($a, $b) {
                return strcmp($b['effectiveDate'], $a['effectiveDate']);
            });

            $filteredRates = [];
            foreach ($allRates as $rate) {
                if ($rate['effectiveDate'] <= $endDate->format('Y-m-d')) {
                    $filteredRates[] = $rate;
                    if (count($filteredRates) >= 14) {
                        break;
                    }
                }
            }
            
            error_log("Filtered to exactly " . count($filteredRates) . " working days for {$currencyCode}");
            
            return $filteredRates;
            
        } catch (GuzzleException $e) {
            throw new \RuntimeException("Failed to fetch historical rates for {$currencyCode}: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Przelicza kursy NBP na kursy kantoru zgodnie z regułami biznesowymi
     */
    public function calculateExchangeOfficeRates(array $nbpRates): array
    {
        $exchangeRates = [];
        
        foreach ($nbpRates as $rate) {
            $currencyCode = $rate['code'];
            $midRate = $rate['mid'];
            
            $exchangeRate = [
                'code' => $currencyCode,
                'currency' => $rate['currency'],
                'nbpRate' => $midRate,
                'publishedDate' => $rate['publishedDate']
            ];
            
            if (in_array($currencyCode, ['EUR', 'USD'])) {
                $exchangeRate['buyRate'] = round($midRate - 0.15, 4);
                $exchangeRate['sellRate'] = round($midRate + 0.11, 4);
            } else {
                $exchangeRate['buyRate'] = null;
                $exchangeRate['sellRate'] = round($midRate + 0.2, 4);
            }
            
            $exchangeRates[] = $exchangeRate;
        }
        
        return $exchangeRates;
    }

    /**
     * Oblicza zmianę procentową na podstawie historii kursów - zawsze z dostępnych dni roboczych (max 14)
     * Porównuje najnowszy dostępny kurs z najstarszym kursem z otrzymanego okresu
     */
    public function calculatePercentageChange(array $historicalRates): ?float
    {
        if (count($historicalRates) < 2) {
            error_log("Not enough historical rates for percentage change calculation: " . count($historicalRates) . " records");
            return null;
        }
        
        // Get current rate (first in sorted array)
        $currentRate = $historicalRates[0]['mid'];
        
        // Get oldest rate (last in sorted array)
        $oldestRate = end($historicalRates)['mid'];
        
        $daysCount = count($historicalRates);
        
        
        if ($oldestRate == 0) {
            return null;
        }
        
        // Calculate percentage change: (current - oldest) / oldest * 100
        $change = (($currentRate - $oldestRate) / $oldestRate) * 100;
        
        
        // If change is too small, return 0
        if (abs($change) < 0.01) {
            return 0.0;
        }
        
        $roundedChange = round($change, 2);
        
        return $roundedChange;
    }
} 