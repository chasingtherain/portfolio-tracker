'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PortfolioState } from '@/lib/types'
import { DemoBadge } from '@/components/DemoBadge'
import { Header } from '@/components/Header'
import { StatBar } from '@/components/StatBar'
import { ProgressBar } from '@/components/ProgressBar'
import { PhaseIndicator } from '@/components/PhaseIndicator'
import { PositionsTable } from '@/components/PositionsTable'
import { AllocationBars } from '@/components/AllocationBars'

// ---------------------------------------------------------------------------
// Skeleton — shown on initial load only
// Never re-shown during a manual refresh (existing data stays visible)
// ---------------------------------------------------------------------------

function SkeletonLayout() {
  return (
    <div className="container dashboard">
      {/* Stat bar row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton panel" style={{ height: 80 }} />
        ))}
      </div>
      {/* Progress bar */}
      <div className="skeleton panel" style={{ height: 64 }} />
      {/* 60/40 grid */}
      <div className="grid-60-40">
        <div className="skeleton panel" style={{ height: 280 }} />
        <div className="skeleton panel" style={{ height: 280 }} />
      </div>
      {/* Bottom panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton panel" style={{ height: 200 }} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page — owns all portfolio state
// ---------------------------------------------------------------------------

export default function Page() {
  // Single source of truth for dashboard data — passed as props to all children
  const [portfolioState, setPortfolioState] = useState<PortfolioState | null>(null)

  // isInitialLoading: true only before the very first fetch completes.
  // Never set back to true — this is the skeleton gate.
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  // isRefreshing: true while a manual refresh is in-flight.
  // Used by Header to show a loading state on the refresh button.
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchPortfolio = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    }

    try {
      const res = await fetch('/api/portfolio')
      const data: PortfolioState = await res.json()
      setPortfolioState(data)
    } catch {
      // Error states handled in Phase 10
    } finally {
      if (isRefresh) {
        setIsRefreshing(false)
      } else {
        setIsInitialLoading(false)
      }
    }
  }, [])

  // Fetch once on mount
  useEffect(() => {
    fetchPortfolio(false)
  }, [fetchPortfolio])

  const handleRefresh = useCallback(() => {
    fetchPortfolio(true)
  }, [fetchPortfolio])

  // Show skeletons only on the very first load
  if (isInitialLoading) {
    return <SkeletonLayout />
  }

  return (
    <div className="container dashboard">
      <DemoBadge />
      <Header
        fetchedAt={portfolioState?.prices.fetchedAt ?? null}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      {portfolioState && (
        <>
          <StatBar
            totalValue={portfolioState.totalValue}
            gapToTarget={portfolioState.gapToTarget}
            btcPrice={portfolioState.prices.btc}
            fearGreed={portfolioState.prices.fearGreed}
          />
          <ProgressBar
            totalValue={portfolioState.totalValue}
            target={portfolioState.target}
            progressPct={portfolioState.progressPct}
            gapToTarget={portfolioState.gapToTarget}
          />
          <PhaseIndicator btcPrice={portfolioState.prices.btc} />
          <div className="grid-60-40">
            <PositionsTable positions={portfolioState.positions} />
            <AllocationBars allocations={portfolioState.allocations} />
          </div>
        </>
      )}
      {/* Phase 8: TriggerMonitor, ExitLadder, ScenarioTable */}
      {/* Phase 9: Checklist, EditHoldingsPanel */}
    </div>
  )
}
