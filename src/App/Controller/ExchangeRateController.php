<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\NBPService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Psr\Log\LoggerInterface;

class ExchangeRateController extends AbstractController
{
    private const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'CZK', 'IDR', 'BRL'];
    private const CURRENCY_NAMES = [
        'EUR' => 'Euro',
        'USD' => 'Dolar amerykański', 
        'CZK' => 'Korona czeska',
        'IDR' => 'Rupia indonezyjska',
        'BRL' => 'Real brazylijski'
    ];

    private NBPService $nbpService;
    private LoggerInterface $logger;

    public function __construct(NBPService $nbpService, LoggerInterface $logger)
    {
        $this->nbpService = $nbpService;
        $this->logger = $logger;
    }

    /**
     * GET /api/exchange-rates?date=2024-01-15
     * Zwraca kursy walut kantoru dla wybranej daty (domyślnie dzisiejsze)
     */
    public function getCurrentRates(Request $request): JsonResponse
    {
        $dateString = $request->query->get('date');
        
        try {
            $date = $dateString ? new \DateTime($dateString) : new \DateTime();
        } catch (\Exception $e) {
            return new JsonResponse([
                'status' => 'error',
                'message' => 'Invalid date format. Use YYYY-MM-DD'
            ], Response::HTTP_BAD_REQUEST);
        }
        
        try {
            // Jeśli data to dzisiaj, użyj getCurrentRates(), w przeciwnym razie pobierz z historii
            if ($date->format('Y-m-d') === (new \DateTime())->format('Y-m-d')) {
                $nbpRates = $this->nbpService->getCurrentRates();
                // Dodaj pełne nazwy walut
                foreach ($nbpRates as &$rate) {
                    if (isset(self::CURRENCY_NAMES[$rate['code']])) {
                        $rate['currency'] = self::CURRENCY_NAMES[$rate['code']];
                    }
                }
                $exchangeRates = $this->nbpService->calculateExchangeOfficeRates($nbpRates);
            } else {
                // Pobierz kursy z historii dla każdej waluty
                $exchangeRates = [];
                
                foreach (self::SUPPORTED_CURRENCIES as $currency) {
                    try {
                        // Pobierz dane historyczne tylko raz dla każdej waluty
                        $historicalRates = $this->nbpService->getHistoricalRates($currency, $date);
                        if (!empty($historicalRates)) {
                            // Weź kurs z wybranej daty (pierwszy element, ponieważ są posortowane)
                            $rateForDate = $historicalRates[0];
                            $nbpRate = [
                                'code' => $currency,
                                'currency' => self::CURRENCY_NAMES[$currency],
                                'mid' => $rateForDate['mid'],
                                'publishedDate' => $rateForDate['effectiveDate']
                            ];
                            
                            $exchangeRate = $this->nbpService->calculateExchangeOfficeRates([$nbpRate])[0];
                            
                            // Oblicz percentageChange na podstawie tych samych danych historycznych
                            $exchangeRate['percentageChange'] = $this->nbpService->calculatePercentageChange($historicalRates, $currency);
                            $exchangeRate['trend'] = $exchangeRate['percentageChange'] >= 0 ? 'up' : 'down';
                            
                            $this->logger->info("Currency {$currency}: Using " . count($historicalRates) . " historical data points for calculation");
                            
                            $exchangeRates[] = $exchangeRate;
                        }
                    } catch (\Exception $e) {
                        $this->logger->warning("Failed to fetch historical data for {$currency}: " . $e->getMessage());
                        
                        // Dodaj currency z domyślnymi wartościami jeśli nie udało się pobrać danych
                        $exchangeRates[] = [
                            'code' => $currency,
                            'currency' => self::CURRENCY_NAMES[$currency],
                            'nbpRate' => 0,
                            'buyRate' => null,
                            'sellRate' => 0,
                            'percentageChange' => null,
                            'trend' => 'neutral'
                        ];
                    }
                }
            }
            
            // Dla dzisiejszych danych też oblicz percentageChange na podstawie tych samych danych
            if ($date->format('Y-m-d') === (new \DateTime())->format('Y-m-d')) {
                foreach ($exchangeRates as &$rate) {
                    try {
                        $historicalRates = $this->nbpService->getHistoricalRates(
                            $rate['code'], 
                            $date
                        );
                        
                        $rate['percentageChange'] = $this->nbpService->calculatePercentageChange($historicalRates, $rate['code']);
                        $rate['trend'] = $rate['percentageChange'] >= 0 ? 'up' : 'down';
                        
                        $this->logger->info("Currency {$rate['code']}: Using " . count($historicalRates) . " historical data points for current date calculation");
                        
                    } catch (\Exception $e) {
                        $this->logger->warning("Failed to fetch historical data for {$rate['code']}: " . $e->getMessage());
                        $rate['percentageChange'] = null;
                        $rate['trend'] = 'neutral';
                    }
                }
            }
            
            // Pobierz datę danych z pierwszej waluty
            $actualDataDate = null;
            
            if (!empty($exchangeRates)) {
                // Sprawdź datę pierwszej waluty
                $firstRate = $exchangeRates[0];
                if (isset($firstRate['publishedDate'])) {
                    $actualDataDate = $firstRate['publishedDate'];
                }
            }
            
            return new JsonResponse([
                'status' => 'success',
                'data' => $exchangeRates,
                'timestamp' => (new \DateTime())->format('Y-m-d H:i:s'),
                'requestedDate' => $date->format('Y-m-d'),
                'actualDataDate' => $actualDataDate
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to fetch exchange rates: ' . $e->getMessage());
            
            return new JsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch exchange rates',
                'timestamp' => (new \DateTime())->format('Y-m-d H:i:s')
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * GET /api/exchange-rates/history?date=2024-01-15&currency=EUR
     * Zwraca historię kursów dla wybranej waluty z ostatnich 14 dni
     */
    public function getHistoricalRates(Request $request): JsonResponse
    {
        $currency = $request->query->get('currency');
        $dateString = $request->query->get('date');
        
        if (!$currency) {
            return new JsonResponse([
                'status' => 'error',
                'message' => 'Currency parameter is required'
            ], Response::HTTP_BAD_REQUEST);
        }
        
        try {
            $date = $dateString ? new \DateTime($dateString) : new \DateTime();
        } catch (\Exception $e) {
            return new JsonResponse([
                'status' => 'error',
                'message' => 'Invalid date format. Use YYYY-MM-DD'
            ], Response::HTTP_BAD_REQUEST);
        }
        
        try {
            $historicalRates = $this->nbpService->getHistoricalRates($currency, $date);
            
            $exchangeHistory = [];
            foreach ($historicalRates as $rate) {
                $nbpRate = [
                    'code' => $currency,
                    'currency' => $currency,
                    'mid' => $rate['mid'],
                    'publishedDate' => $rate['effectiveDate']
                ];
                
                $exchangeRate = $this->nbpService->calculateExchangeOfficeRates([$nbpRate])[0];
                $exchangeRate['effectiveDate'] = $rate['effectiveDate'];
                
                $exchangeHistory[] = $exchangeRate;
            }
            
            return new JsonResponse([
                'status' => 'success',
                'data' => [
                    'currency' => $currency,
                    'requestedDate' => $date->format('Y-m-d'),
                    'history' => $exchangeHistory
                ],
                'timestamp' => (new \DateTime())->format('Y-m-d H:i:s')
            ]);
            
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse([
                'status' => 'error',
                'message' => $e->getMessage()
            ], Response::HTTP_BAD_REQUEST);
            
        } catch (\Exception $e) {
            $this->logger->error("Failed to fetch historical rates for {$currency}: " . $e->getMessage());
            
            return new JsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch historical exchange rates',
                'timestamp' => (new \DateTime())->format('Y-m-d H:i:s')
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * GET /api/exchange-rates/supported
     * Zwraca listę obsługiwanych walut
     */
    public function getSupportedCurrencies(): JsonResponse
    {
        $supportedCurrencies = [];
        foreach (self::SUPPORTED_CURRENCIES as $code) {
            $supportedCurrencies[] = [
                'code' => $code,
                'name' => self::CURRENCY_NAMES[$code],
                'hasBuyRate' => in_array($code, ['EUR', 'USD'])
            ];
        }
        
        return new JsonResponse([
            'status' => 'success',
            'data' => $supportedCurrencies,
            'timestamp' => (new \DateTime())->format('Y-m-d H:i:s')
        ]);
    }
} 