import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Login from './Login'
import Seasons from './Seasons'
import Matches from './Matches'
import Admin from './Admin'
import VoteHistory from './VoteHistory'
import Standings from './Standings'
import Profile from './Profile'
import './styles.css'

export default function App() {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user')
    return u ? JSON.parse(u) : null
  })
  const [page, setPage] = useState('seasons')
  const [seasonId, setSeasonId] = useState(null)

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
      // No longer set x-user header; backend no longer needs it for most endpoints
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  function onLogout() {
    setUser(null)
    setPage('seasons')
    setSeasonId(null)
  }

  function handleNavClick(nextPage) {
    if (nextPage === 'seasons') setSeasonId(null)
    setPage(nextPage)
  }

  const navTabs = [
    { key: 'seasons', label: 'Seasons', visible: !!user },
    { key: 'admin', label: 'Admin', visible: !!user && user.role === 'admin' },
    { key: 'history', label: 'Vote History', visible: !!user },
    { key: 'standings', label: 'Standings', visible: !!user },
    { key: 'profile', label: 'Profile', visible: !!user }
  ].filter(tab => tab.visible)

  const balanceDisplay = user?.role === 'admin' ? 'Unlimited' : (user?.balance ?? '—')
  const displayName = user?.display_name || user?.displayName || user?.username || ''

  return (
    <div className="container">
      <header>
        <h1 style={{fontFamily: 'Poppins, sans-serif', fontSize: '36px', fontWeight: '700', letterSpacing: '-1px', marginBottom: '20px'}}>🏏 Cricket Mela</h1>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap: '16px'}}>
          {user && (
            <nav style={{display: 'flex', gap: '8px', flex: 1}}>
              {navTabs.map((tab, idx) => (
                <div
                  key={tab.key}
                  onClick={() => handleNavClick(tab.key)}
                  style={{
                    flex: 1,
                    height: '40px',
                    backgroundColor: page === tab.key ? '#2ecc71' : '#e0e0e0',
                    borderRadius: idx === 0 ? '8px 0 0 8px' : idx === navTabs.length - 1 ? '0 8px 8px 0' : '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: page === tab.key ? 'white' : '#666',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '14px'
                  }}
                >
                  {tab.label}
                </div>
              ))}
            </nav>
          )}
          <div>
            {user ? (
              <span>
                Hello <strong>{displayName}</strong> (balance: {balanceDisplay})
                <button
                  style={{
                    marginLeft: 8,
                    backgroundColor: '#2ecc71',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#27ae60'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#2ecc71'}
                  onClick={onLogout}
                >
                  Logout
                </button>
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main>
        {!user ? (
          <Login onLogin={u => setUser(u)} />
        ) : (
          <>
            {page === 'seasons' && (
              <Seasons onSelect={id => { setSeasonId(id); setPage('matches') }} />
            )}
            {page === 'matches' && seasonId && (
              <Matches seasonId={seasonId} user={user} refreshUser={u => setUser(u)} />
            )}
            {page === 'admin' && (
              <Admin user={user} />
            )}
            {page === 'history' && user && (
              <VoteHistory user={user} />
            )}
            {page === 'standings' && (
              <Standings />
            )}
            {page === 'profile' && user && (
              <Profile user={user} refreshUser={u => setUser(u)} />
            )}
          </>
        )}
      </main>

      <footer>
        <small>Local demo - not for production</small>
      </footer>
    </div>
  )
}
