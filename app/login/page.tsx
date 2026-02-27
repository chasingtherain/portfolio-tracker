'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Incorrect password')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius:  12,
        padding:       40,
        width:         '100%',
        maxWidth:      360,
      }}>
        <div style={{
          fontFamily:    'var(--mono)',
          fontSize:       11,
          letterSpacing: '0.12em',
          color:         'var(--orange)',
          marginBottom:   32,
        }}>
          PORTFOLIO TRACKER
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{
              fontFamily:    'var(--mono)',
              fontSize:       10,
              letterSpacing: '0.06em',
              color:         'var(--text-dim)',
            }}>
              PASSWORD
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoFocus
              autoComplete="current-password"
              style={{
                background:   'var(--surface2)',
                border:       '1px solid var(--border)',
                borderRadius:  4,
                color:        'var(--text)',
                fontFamily:   'var(--mono)',
                fontSize:      13,
                padding:      '8px 12px',
                outline:      'none',
                width:        '100%',
                boxSizing:    'border-box',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              background:    loading || !password ? 'var(--surface2)' : 'var(--orange)',
              border:        'none',
              borderRadius:   4,
              color:          loading || !password ? 'var(--text-dim)' : '#000',
              fontFamily:    'var(--mono)',
              fontSize:       12,
              fontWeight:     500,
              letterSpacing: '0.08em',
              padding:       '9px 0',
              cursor:         loading || !password ? 'default' : 'pointer',
              marginTop:      4,
            }}
          >
            {loading ? 'VERIFYING…' : 'ENTER'}
          </button>

          {error && (
            <div style={{
              fontFamily: 'var(--mono)',
              fontSize:    12,
              color:      'var(--red)',
              textAlign:  'center',
            }}>
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
