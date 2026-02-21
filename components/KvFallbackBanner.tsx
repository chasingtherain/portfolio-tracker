interface KvFallbackBannerProps {
  kvFallback: boolean
}

/**
 * Shown when KV returned no stored holdings and DEFAULT_HOLDINGS (all zeros)
 * was used to compute the portfolio. This happens on first deploy or if KV is cleared.
 *
 * The banner nudges the user to open EditHoldingsPanel and enter their positions.
 * Absent from DOM entirely when kvFallback is false.
 */
export function KvFallbackBanner({ kvFallback }: KvFallbackBannerProps) {
  if (!kvFallback) return null

  return (
    <div
      data-testid="kv-fallback-banner"
      className="banner banner-info mono"
    >
      Holdings not set — all quantities are zero. Open the edit panel to enter your positions.
    </div>
  )
}
