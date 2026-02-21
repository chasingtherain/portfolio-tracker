interface PriceWarningBannerProps {
  pricesPartial: boolean
}

/**
 * Shown below StatBar when one or more price sources returned null.
 * Absent from the DOM entirely when pricesPartial is false — same pattern as DemoBadge.
 * The banner explains the ⚠ icons visible in the positions table without requiring
 * the user to already know what priceUnavailable means.
 */
export function PriceWarningBanner({ pricesPartial }: PriceWarningBannerProps) {
  if (!pricesPartial) return null

  return (
    <div
      data-testid="price-warning-banner"
      className="banner banner-warning mono"
    >
      ⚠ Some prices unavailable — affected positions show{' '}
      <span style={{ opacity: 0.7 }}>⚠ —</span> and are excluded from totals
    </div>
  )
}
