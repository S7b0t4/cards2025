'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function NotFound() {
  const router = useRouter()

  useEffect(() => {
    // Log 404 for debugging
    console.log('[404] Page not found:', typeof window !== 'undefined' ? window.location.pathname : 'unknown')
  }, [])

  return (
    <div className="container" style={{ 
      maxWidth: '800px', 
      margin: '2rem auto', 
      padding: '2rem',
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="card" style={{ 
        textAlign: 'center', 
        padding: '3rem 2rem',
        width: '100%'
      }}>
        <h1 style={{ 
          fontSize: '4rem', 
          marginBottom: '1rem',
          color: 'var(--text-primary)'
        }}>
          😕
        </h1>
        <h2 style={{ 
          fontSize: '2rem', 
          marginBottom: '1rem',
          color: 'var(--text-primary)'
        }}>
          Упс, такой страницы нету
        </h2>
        <p style={{ 
          fontSize: '1.1rem', 
          marginBottom: '2rem',
          color: 'var(--text-secondary)'
        }}>
          Страница, которую вы ищете, не существует или была перемещена.
        </p>
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button 
            className="btn btn-primary" 
            onClick={() => router.push('/')}
            style={{ padding: '0.75rem 2rem' }}
          >
            На главную
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => router.back()}
            style={{ padding: '0.75rem 2rem' }}
          >
            Назад
          </button>
        </div>
      </div>
    </div>
  )
}
