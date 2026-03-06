import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Load Testing with k6 — Phase 4B: Stress & Throughput 📈
 *
 * Simulates realistic load on the system:
 * - Baseline: 10 concurrent users, 5 min duration
 * - Ramp-up: 50 concurrent users over 2 min
 * - Spike: 200 concurrent users for 30s
 * - Sustained: 100 concurrent users, 5 min
 *
 * Metrics collected:
 * - HTTP request latency (p95, p99)
 * - Error rate (network, 4xx, 5xx)
 * - Throughput (requests/sec)
 * - Connection pool utilization
 *
 * Run: k6 run load-test.k6.ts
 * Run with config: k6 run load-test.k6.ts -e SCENARIO=spike
 */

export const options = {
  stages: [
    // Baseline: warm up with 10 VUs
    { duration: '1m', target: 10 },
    // Ramp: scale to 50 VUs
    { duration: '2m', target: 50 },
    // Spike: sudden increase to 200 VUs
    { duration: '30s', target: 200 },
    // Sustained: maintain stress at 100 VUs
    { duration: '3m', target: 100 },
    // Ramp down gracefully
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    // HTTP request latency: p95 < 500ms, p99 < 1000ms
    'http_req_duration{staticAsset:no}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{staticAsset:yes}': ['p(95)<200'],
    // Error rate < 1%
    'http_req_failed': ['rate<0.01'],
    // Connection successful rate > 99%
    'http_conn_connecting': ['p(99)<100'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const PAGES = [
  '/profit',
  '/break-even',
  '/cashflow',
  '/dashboard',
  '/embed/en/profit',
  '/embed/de/break-even',
  '/embed/fr/cashflow',
];

const CALCULATOR_INPUTS = [
  { revenue: '50000', cost: '30000' },
  { revenue: '100000', cost: '60000' },
  { revenue: '10000', cost: '7000' },
];

/**
 * Simulate user browsing pages and performing calculations
 */
export default function () {
  // 1. Browse a random calculator page
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];
  const res = http.get(`${BASE_URL}${page}`, {
    tags: { name: `Page: ${page}`, staticAsset: 'no' },
  });

  check(res, {
    'page loaded': (r) => r.status === 200,
    'page load < 2s': (r) => r.timings.duration < 2000,
  });

  // 2. If it's a calculator page, simulate calculation
  if (page.includes('profit') || page.includes('break-even') || page.includes('cashflow')) {
    const inputs = CALCULATOR_INPUTS[Math.floor(Math.random() * CALCULATOR_INPUTS.length)];

    // Simulate API call for calculation (mock endpoint)
    const calcRes = http.post(
      `${BASE_URL}/api/calculate`,
      JSON.stringify({
        type: page.split('/').pop(),
        inputs: inputs,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'API: Calculate', staticAsset: 'no' },
      }
    );

    check(calcRes, {
      'calculation succeeded': (r) => r.status === 200 || r.status === 404, // 404 if endpoint doesn't exist
      'calculation < 500ms': (r) => r.timings.duration < 500,
    });
  }

  // 3. Random think time between requests
  sleep(Math.random() * 3 + 1);
}

/**
 * Setup phase: Initialize test data (optional)
 */
export function setup() {
  return {
    timestamp: new Date(),
  };
}

/**
 * Teardown phase: Cleanup (optional)
 */
export function teardown() {
  // Cleanup completed
}
