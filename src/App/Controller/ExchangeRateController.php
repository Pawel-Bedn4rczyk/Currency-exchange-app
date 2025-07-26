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
    private NBPService $nbpService;
    private LoggerInterface $logger;

    public function __construct(NBPService $nbpService, LoggerInterface $logger)
    {
        $this->nbpService = $nbpService;
        $this->logger = $logger;
    }

    /**
     * GET /api/exchange-rates
     * Zwraca aktualne kursy walut kantoru
     */
    public function getCurrentRates(): JsonResponse
    {
        try {
            $nbpRates = $this->nbpService->getCurrentRates();
            $exchangeRates = $this->nbpService->calculateExchangeOfficeRates($nbpRates);
            foreach ($exchangeRates as &$rate) {
                try {
                    $historicalRates = $this->nbpService->getHistoricalRates(
                        $rate['code'], 
                        new \DateTime()
                    );
                    
                    $rate['percentageChange'] = $this->nbpService->calculatePercentageChange($historicalRates);
                    $rate['trend'] = $rate['percentageChange'] >= 0 ? 'up' : 'down';
                    
                } catch (\Exception $e) {
                    $this->logger->warning("Failed to fetch historical data for {$rate['code']}: " . $e->getMessage());
                    $rate['percentageChange'] = null;
                    $rate['trend'] = 'neutral';
                }
            }
            
            return new JsonResponse([
                'status' => 'success',
                'data' => $exchangeRates,
                'timestamp' => (new \DateTime())->format('Y-m-d H:i:s')
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to fetch current exchange rates: ' . $e->getMessage());
            
            return new JsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch current exchange rates',
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
        $supportedCurrencies = [
            ['code' => 'EUR', 'name' => 'Euro', 'hasBuyRate' => true],
            ['code' => 'USD', 'name' => 'Dolar amerykański', 'hasBuyRate' => true],
            ['code' => 'CZK', 'name' => 'Korona czeska', 'hasBuyRate' => false],
            ['code' => 'IDR', 'name' => 'Rupia indonezyjska', 'hasBuyRate' => false],
            ['code' => 'BRL', 'name' => 'Real brazylijski', 'hasBuyRate' => false]
        ];
        
        return new JsonResponse([
            'status' => 'success',
            'data' => $supportedCurrencies,
            'timestamp' => (new \DateTime())->format('Y-m-d H:i:s')
        ]);
    }
} 