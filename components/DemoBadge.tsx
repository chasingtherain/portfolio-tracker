// NEXT_PUBLIC_IS_DEMO is the only component in the project that reads this variable.
// See CLAUDE.md: "Used only in DemoBadge.tsx. No other component reads it."
//
// When not in demo mode this component returns null — it is completely absent from
// the DOM. Do not use CSS `display: none` as a substitute: the invariant requires
// the element to not exist, not just to be invisible.

export function DemoBadge() {
  if (process.env.NEXT_PUBLIC_IS_DEMO !== 'true') return null

  return (
    <div
      role="status"
      aria-label="Demo mode"
      style={{
        display:        'inline-block',
        padding:        '4px 10px',
        background:     'var(--orange)',
        color:          '#000',
        fontFamily:     'var(--mono)',
        fontSize:       '12px',
        fontWeight:     600,
        letterSpacing:  '0.08em',
        textTransform:  'uppercase',
        borderRadius:   '4px',
        marginBottom:   '12px',
      }}
    >
      DEMO — synthetic data
    </div>
  )
}
