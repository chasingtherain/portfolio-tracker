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
 *   ETH:  2.5  @ avg $2,200  → value $7,700    pnl +$2,200   (+40.0%)
 *   USD (dry powder):          value $12,000
 *
 * Total invested: $219,500  Total PnL: +$229,420  (+104.5%)
 */
export const DEMO_PORTFOLIO_STATE: PortfolioState = {
  mode: 'demo',
  totalValue: 460920,
  totalPnl: 229420,
  pnlPct: 104.52,
  target: 1000000,
  gapToTarget: -539080,
  progressPct: 46.09,
  updatedAt: '2025-01-15T09:45:00.000Z',
  pricesPartial: false,

  prices: {
    btc:           97500,
    mstr:          385,
    near:          5.45,
    uni:           12.80,
    link:          17.90,
    ondo:          1.18,
    eth:           3080,
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
      allocPct:         67.70,
      priceUnavailable: false,
    },
    {
      label:            'MicroStrategy',
      ticker:           'MSTR',
      value:            77000,
      pnl:              41000,
      pnlPct:           113.89,
      allocPct:         16.71,
      priceUnavailable: false,
    },
    {
      label:            'NEAR Protocol',
      ticker:           'NEAR',
      value:            21800,
      pnl:              7800,
      pnlPct:           55.71,
      allocPct:         4.73,
      priceUnavailable: false,
    },
    {
      label:            'Dry Powder',
      ticker:           'USD',
      value:            12000,
      pnl:              null,
      pnlPct:           null,
      allocPct:         2.60,
      priceUnavailable: false,
    },
    {
      label:            'Chainlink',
      ticker:           'LINK',
      value:            10740,
      pnl:              3540,
      pnlPct:           49.17,
      allocPct:         2.33,
      priceUnavailable: false,
    },
    {
      label:            'Uniswap',
      ticker:           'UNI',
      value:            10240,
      pnl:              3840,
      pnlPct:           60.00,
      allocPct:         2.22,
      priceUnavailable: false,
    },
    {
      label:            'Ondo Finance',
      ticker:           'ONDO',
      value:            9440,
      pnl:              3040,
      pnlPct:           47.50,
      allocPct:         2.05,
      priceUnavailable: false,
    },
    {
      label:            'Ethereum',
      ticker:           'ETH',
      value:            7700,
      pnl:              2200,
      pnlPct:           40.00,
      allocPct:         1.67,
      priceUnavailable: false,
    },
  ],

  // Fixed display order: BTC MSTR ONDO LINK UNI NEAR ETH CASH
  allocations: [
    {
      key:        'btc',
      label:      'BTC',
      value:      312000,
      currentPct: 67.70,
      targetPct:  60,
      gap:        7.70,
      color:      'var(--orange)',
    },
    {
      key:        'mstr',
      label:      'MSTR',
      value:      77000,
      currentPct: 16.71,
      targetPct:  15,
      gap:        1.71,
      color:      '#3b82f6',
    },
    {
      key:        'ondo',
      label:      'ONDO',
      value:      9440,
      currentPct: 2.05,
      targetPct:  7,
      gap:        -4.95,
      color:      '#a855f7',
    },
    {
      key:        'link',
      label:      'LINK',
      value:      10740,
      currentPct: 2.33,
      targetPct:  7,
      gap:        -4.67,
      color:      '#06b6d4',
    },
    {
      key:        'uni',
      label:      'UNI',
      value:      10240,
      currentPct: 2.22,
      targetPct:  7,
      gap:        -4.78,
      color:      '#ec4899',
    },
    {
      key:        'near',
      label:      'NEAR',
      value:      21800,
      currentPct: 4.73,
      targetPct:  0,
      gap:        4.73,
      color:      'var(--text-dim)',
    },
    {
      key:        'eth',
      label:      'ETH',
      value:      7700,
      currentPct: 1.67,
      targetPct:  0,
      gap:        1.67,
      color:      'var(--text-dim)',
    },
    {
      key:        'dry',
      label:      'CASH',
      value:      12000,
      currentPct: 2.60,
      targetPct:  4,
      gap:        -1.40,
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
