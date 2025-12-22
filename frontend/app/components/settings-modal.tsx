'use client'

import { useTheme } from '../contexts/theme-context'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()

  if (!isOpen) return null

  return (
    <div 
      className="settings-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
    >
      <div 
        className="settings-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 4px 20px var(--shadow)',
          color: 'var(--text-primary)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Настройки</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              padding: '0.5rem',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '1rem', 
            fontSize: '1.1rem', 
            fontWeight: '500',
            color: 'var(--text-primary)'
          }}>
            Тема
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setTheme('light')}
              className={theme === 'light' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{
                flex: 1,
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              ☀️ Светлая
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={theme === 'dark' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{
                flex: 1,
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              🌙 Темная
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '0.75rem 1.5rem' }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}





