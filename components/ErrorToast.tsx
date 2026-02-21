'use client'

import { useEffect } from 'react'

const AUTO_DISMISS_MS = 4000

interface ErrorToastProps {
  onDismiss: () => void
}

/**
 * Shown when a manual refresh fails (network error or non-OK response).
 * Auto-dismisses after 4 seconds — the timer starts on mount.
 * Cleanup function on the useEffect cancels the timer if the component
 * unmounts before the 4 seconds elapse (e.g. user manually navigates away).
 *
 * Only appears for REFRESH failures, not initial load. On initial load,
 * the page renders without data — no existing state to preserve, nothing
 * to warn about losing.
 */
export function ErrorToast({ onDismiss }: ErrorToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      data-testid="error-toast"
      className="toast toast-error mono"
      role="alert"
    >
      ✕ Refresh failed — prices may be stale
    </div>
  )
}
