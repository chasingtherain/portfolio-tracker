import type { PortfolioState } from './types'

/**
 * Fully static PortfolioState returned by /api/portfolio when MODE=demo.
 * Zero external API calls, zero KV reads.
 *
 * Numbers are synthetically consistent:
 *   prices × quantities = position values
 *   sum of position values = totalValue (460,920)
 *   totalValue / target = progressPct
 *   sum of unrealised gains = totalPnl
 *
 * Synthetic holdings (not exported — cost basis never leaves the server):
 *   BTC:  3.2  @ avg $45,000 → value $312,000  pnl +$168,000 (+116.7%)
 *   MSTR: 200  @ avg $180    → value $77,000   pnl +$41,000  (+113.9%)
 *   NEAR: 4000 @ avg $3.50   → value $21,800   pnl +$7,800   (+55.7%)
 *   UNI:  800  @ avg $8.00   → value $10,240   pnl +$3,840   (+60.0%)
 *   LINK: 600  @ avg $12.00  → value $10,740   pnl +$3,540   (+49.2%)
 *   ONDO: 8000 @ avg $0.80   → value $9,440    pnl +$3,040   (+47.5%)
 *   USD (dry powder):          value $12,000
 *
 * Total invested: $214,000  Total PnL: +$227,220  (+106.2%)
 */
export const DEMO_PORTFOLIO_STATE: PortfolioState = {
  mode: 'demo',
  totalValue: 453220,
  totalPnl: 227220,
  pnlPct: 106.18,
  target: 1000000,
  gapToTarget: -546780,
  progressPct: 45.32,
  updatedAt: '2025-01-15T09:45:00.000Z',
  pricesPartial: false,
  kvFallback: false,

  prices: {
    btc:           97500,
    mstr:          385,
    near:          5.45,
    uni:           12.80,
    link:          17.90,
    ondo:          1.18,
    fearGreed:     72,
    btcDominance:  56.2,
    fetchedAt:     '2025-01-15T10:30:00.000Z',
  },

  // Sorted by value descending (null-value positions would go last, none here)
  positions: [
    {
      label:            'Bitcoin',
      ticker:           'BTC',
      value:            312000,
      pnl:              168000,
      pnlPct:           116.67,
      allocPct:         68.84,
      priceUnavailable: false,
    },
    {
      label:            'MicroStrategy',
      ticker:           'MSTR',
      value:            77000,
      pnl:              41000,
      pnlPct:           113.89,
      allocPct:         16.99,
      priceUnavailable: false,
    },
    {
      label:            'NEAR Protocol',
      ticker:           'NEAR',
      value:            21800,
      pnl:              7800,
      pnlPct:           55.71,
      allocPct:         4.81,
      priceUnavailable: false,
    },
    {
      label:            'Dry Powder',
      ticker:           'USD',
      value:            12000,
      pnl:              null,
      pnlPct:           null,
      allocPct:         2.65,
      priceUnavailable: false,
    },
    {
      label:            'Chainlink',
      ticker:           'LINK',
      value:            10740,
      pnl:              3540,
      pnlPct:           49.17,
      allocPct:         2.37,
      priceUnavailable: false,
    },
    {
      label:            'Uniswap',
      ticker:           'UNI',
      value:            10240,
      pnl:              3840,
      pnlPct:           60.00,
      allocPct:         2.26,
      priceUnavailable: false,
    },
    {
      label:            'Ondo Finance',
      ticker:           'ONDO',
      value:            9440,
      pnl:              3040,
      pnlPct:           47.50,
      allocPct:         2.08,
      priceUnavailable: false,
    },
  ],

  // Fixed display order: BTC MSTR ONDO LINK UNI NEAR CASH
  allocations: [
    {
      key:        'btc',
      label:      'BTC',
      value:      312000,
      currentPct: 68.84,
      targetPct:  60,
      gap:        8.84,
      color:      'var(--orange)',
    },
    {
      key:        'mstr',
      label:      'MSTR',
      value:      77000,
      currentPct: 16.99,
      targetPct:  15,
      gap:        1.99,
      color:      '#3b82f6',
    },
    {
      key:        'ondo',
      label:      'ONDO',
      value:      9440,
      currentPct: 2.08,
      targetPct:  7,
      gap:        -4.92,
      color:      '#a855f7',
    },
    {
      key:        'link',
      label:      'LINK',
      value:      10740,
      currentPct: 2.37,
      targetPct:  7,
      gap:        -4.63,
      color:      '#06b6d4',
    },
    {
      key:        'uni',
      label:      'UNI',
      value:      10240,
      currentPct: 2.26,
      targetPct:  7,
      gap:        -4.74,
      color:      '#ec4899',
    },
    {
      key:        'near',
      label:      'NEAR',
      value:      21800,
      currentPct: 4.81,
      targetPct:  0,
      gap:        4.81,
      color:      'var(--text-dim)',
    },
    {
      key:        'dry',
      label:      'CASH',
      value:      12000,
      currentPct: 2.65,
      targetPct:  4,
      gap:        -1.35,
      color:      'var(--text-muted)',
    },
  ],

  // Four triggers in display order — values match what evalXxx functions would produce
  triggers: [
    {
      label:     'FEAR & GREED',
      value:     '72',
      status:    'GREED — MONITOR CLOSELY',
      severity:  'near',
      condition: 'Near active ≥ 65 · T1/T2 active ≥ 80 · T3 active ≥ 85',
    },
    {
      label:     'BTC DOMINANCE',
      value:     '56.2%',
      status:    'BTC DOMINANT — WATCH',
      severity:  'watch',
      condition: 'Near when 52–55% · T2 fired below 52%',
    },
    {
      label:     'NUPL',
      value:     '0.55',
      status:    'BELIEF PHASE — WATCH',
      severity:  'watch',
      condition: 'Near at 0.60–0.74 · T3 euphoria ≥ 0.75',
    },
    {
      label:     'BTC PRICE ZONE',
      value:     '$98K',
      status:    'HOLD PHASE — APPROACHING EXIT',
      severity:  'near',
      condition: 'Exit ladder activates above $200K',
    },
  ],

  proceedsSplit: {
    zone:      'below_150k',
    zoneLabel: 'BELOW $150K',
    cashPct:   30,
    btcPct:    70,
  },
}
