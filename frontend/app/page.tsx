'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from './lib/axios-config'
import SettingsModal from './components/settings-modal'

interface Statistics {
  totalCards: number
  dueCards: number
  recentlyReviewed: number
  activeDays: number
}

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    
    if (!token || !user) {
      router.push('/auth')
      return
    }

    setCurrentUser(JSON.parse(user))
    fetchStatistics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const fetchStatistics = async () => {
    try {
      const response = await apiClient.get('/api/cards/statistics')
      setStatistics(response.data)
    } catch (error: any) {
      console.error('Ошибка при получении статистики:', error)
      if (error?.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/auth')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/auth')
  }

  if (loading || !currentUser) {
    return (
      <div className="container home-container">
        <div className="card">
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="container home-container">
        {/* Header with active days */}
        <div className="home-header">
            <div className="home-logo-title">
            <div className="home-logo">
              <img src="/logo.png" alt="АБОБА" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            </div>
            <h1 className="home-title">АБОБА</h1>
          </div>
          <div className="active-days-badge">
            <div className="active-days-number">{statistics?.activeDays || 0}</div>
            <div className="active-days-label">активных дней</div>
          </div>
        </div>

      {/* Statistics cards */}
      {statistics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{statistics.totalCards}</div>
            <div className="stat-label">Всего карточек</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{statistics.dueCards}</div>
            <div className="stat-label">К повторению</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{statistics.recentlyReviewed}</div>
            <div className="stat-label">Повторено сегодня</div>
          </div>
        </div>
      )}

      {/* Footer and action buttons in one block */}
      <div className="home-bottom-bar">
        {/* Footer with user info, settings and logout */}
        <div className="home-footer">
          <div className="user-info">
            <span>Привет, {currentUser.name}!</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setSettingsOpen(true)}
              className="btn btn-secondary"
              style={{ 
                padding: '0.5rem',
                minWidth: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem'
              }}
              title="Настройки"
            >
              ⚙️
            </button>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </div>

        {/* Main action buttons */}
        <div className="home-actions">
          <button 
            className="btn-action btn-action-practice"
            onClick={() => router.push('/practice')}
          >
            <div className="btn-action-text">Практика</div>
          </button>
          <button 
            className="btn-action btn-action-add"
            onClick={() => router.push('/cards?new=true')}
          >
            <div className="btn-action-icon">+</div>
          </button>
          <button 
            className="btn-action btn-action-cards"
            onClick={() => router.push('/cards')}
          >
            <div className="btn-action-text">Мои карточки</div>
          </button>
        </div>
      </div>
    </div>

    <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
