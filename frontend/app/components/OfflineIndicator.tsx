'use client'

import { useEffect, useState } from 'react'
import { isOnline, onOnlineStatusChange } from '../lib/offline-sync'

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true)
  const [show, setShow] = useState(false)

  useEffect(() => {
    setOnline(isOnline())
    // Показываем только если офлайн, не показываем при подключении
    setShow(!isOnline())

    const cleanup = onOnlineStatusChange((isOnline) => {
      setOnline(isOnline)
      // Показываем только если офлайн
      setShow(!isOnline)
    })

    return cleanup
  }, [])

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: '#f44336',
        color: 'white',
        padding: '0.4rem 1rem',
        textAlign: 'center',
        zIndex: 10000,
        fontSize: '0.75rem',
        fontWeight: '500',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
      }}
    >
      ⚠ Офлайн
    </div>
  )
}
