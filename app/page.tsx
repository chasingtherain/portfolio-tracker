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
import { TriggerMonitor } from '@/components/TriggerMonitor'
import { ExitLadder } from '@/components/ExitLadder'
import { ScenarioTable } from '@/components/ScenarioTable'
import { Checklist } from '@/components/Checklist'
import { EditHoldingsPanel } from '@/components/EditHoldingsPanel'
import { PriceWarningBanner } from '@/components/PriceWarningBanner'
import { KvFallbackBanner } from '@/components/KvFallbackBanner'
import { ErrorToast } from '@/components/ErrorToast'

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
      {/* Interactive panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
        <div className="skeleton panel" style={{ height: 260 }} />
        <div className="skeleton panel" style={{ height: 260 }} />
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

  // refreshError: true when the most recent manual refresh failed.
  // Cleared on the next successful fetch. Only set for refresh failures —
  // initial load failure leaves portfolioState null (no data to preserve).
  const [refreshError, setRefreshError] = useState(false)

  // holdingsSavedAt: epoch ms, updated when EditHoldingsPanel saves successfully.
  // Passed to Checklist so it re-fetches the KV-reset state after a holdings write.
  const [holdingsSavedAt, setHoldingsSavedAt] = useState(0)

  const fetchPortfolio = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    }

    try {
      const res = await fetch('/api/portfolio')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: PortfolioState = await res.json()
      setPortfolioState(data)
      setRefreshError(false)
    } catch {
      // Only flag an error for refresh — initial load failure leaves the page empty,
      // but there's no "last known good" data to warn the user about losing.
      if (isRefresh) setRefreshError(true)
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

  // Called by EditHoldingsPanel after a successful save.
  // Updates holdingsSavedAt (triggers Checklist re-fetch) and refreshes portfolio data.
  const handleHoldingsSaved = useCallback(() => {
    setHoldingsSavedAt(Date.now())
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
      {refreshError && (
        <ErrorToast onDismiss={() => setRefreshError(false)} />
      )}
      {portfolioState && (
        <>
          <KvFallbackBanner kvFallback={portfolioState.kvFallback} />
          <StatBar
            totalValue={portfolioState.totalValue}
            gapToTarget={portfolioState.gapToTarget}
            btcPrice={portfolioState.prices.btc}
            fearGreed={portfolioState.prices.fearGreed}
          />
          <PriceWarningBanner pricesPartial={portfolioState.pricesPartial} />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <TriggerMonitor triggers={portfolioState.triggers} />
            <ExitLadder
              btcPrice={portfolioState.prices.btc}
              proceedsSplit={portfolioState.proceedsSplit}
            />
            <ScenarioTable />
          </div>

          {/* Interactive panels:
              Checklist — always shown (demo uses local state, live uses KV)
              EditHoldingsPanel — absent from DOM entirely in demo mode (CLAUDE.md invariant) */}
          <div
            style={{
              display:             'grid',
              gridTemplateColumns: portfolioState.mode !== 'demo' ? '300px 1fr' : '300px',
              gap:                  16,
            }}
          >
            <Checklist mode={portfolioState.mode} savedAt={holdingsSavedAt} />
            {portfolioState.mode !== 'demo' && (
              <EditHoldingsPanel onHoldingsSaved={handleHoldingsSaved} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
