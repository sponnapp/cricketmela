import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Seasons({ user, onSelect }) {
  const [seasons, setSeasons] = useState([])
  const [hoveredId, setHoveredId] = useState(null)

  useEffect(() => {
    if (user) {
      axios.get('/api/seasons', {
        headers: { 'x-user': user.username }
      }).then(r => setSeasons(r.data)).catch(() => setSeasons([]))
    }
  }, [user])

  const styles = {
    container: {
      width: '100%',
      padding: '40px 20px',
      margin: 0,
      boxSizing: 'border-box'
    },
    title: {
      fontSize: 'clamp(24px, 5vw, 32px)',
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '40px',
      textAlign: 'center'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '30px',
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    card: (isHovered) => ({
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: '40px 30px',
      boxShadow: isHovered ? '0 20px 60px rgba(46, 204, 113, 0.3)' : '0 10px 30px rgba(0, 0, 0, 0.1)',
      cursor: 'pointer',
      transition: 'all 0.4s ease',
      transform: isHovered ? 'translateY(-10px) scale(1.05)' : 'translateY(0) scale(1)',
      border: isHovered ? '3px solid #2ecc71' : '3px solid transparent',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden'
    }),
    iconContainer: {
      fontSize: '80px',
      marginBottom: '20px',
      animation: 'bounce 2s infinite',
      filter: 'drop-shadow(0 5px 15px rgba(46, 204, 113, 0.3))'
    },
    seasonName: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '10px'
    },
    subtitle: {
      fontSize: '14px',
      color: '#666',
      marginTop: '15px',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    badge: (isHovered) => ({
      position: 'absolute',
      top: '15px',
      right: '15px',
      backgroundColor: isHovered ? '#2ecc71' : '#f0f0f0',
      color: isHovered ? 'white' : '#999',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 'bold',
      transition: 'all 0.3s ease'
    }),
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#999'
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏆 Cricket Seasons</h2>
      {seasons.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{fontSize: '60px', marginBottom: '20px'}}>🏏</div>
          <p style={{fontSize: '18px'}}>No seasons available yet</p>
        </div>
      ) : (
        <ul style={styles.grid}>
          {seasons.map(s => (
            <li
              key={s.id}
              style={styles.card(hoveredId === s.id)}
              onMouseEnter={() => setHoveredId(s.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelect(s.id)}
            >
              <div style={styles.badge(hoveredId === s.id)}>
                LIVE
              </div>
              <div style={styles.iconContainer}>
                🏏
              </div>
              <div style={styles.seasonName}>
                {s.name}
              </div>
              {user?.role !== 'admin' && s.season_balance !== undefined && s.season_balance !== null && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(135deg,#667eea,#764ba2)',
                  color: 'white', borderRadius: '20px',
                  padding: '6px 16px', marginTop: '12px',
                  fontSize: '13px', fontWeight: '700',
                }}>
                  💰 {Math.round(s.season_balance)} pts
                </div>
              )}
              <div style={styles.subtitle}>
                {hoveredId === s.id ? '→ View Matches' : 'Click to view'}
              </div>
            </li>
          ))}
        </ul>
      )}
      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  )
}
