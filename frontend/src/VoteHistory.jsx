import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { celebrateBalanceIncrease } from './celebrations'

export default function VoteHistory({ user, refreshTrigger }) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState('all')
  const [totalBalance, setTotalBalance] = useState(0)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('all')

  // Helper function to parse match date/time for sorting
  function parseMatchDateTime(value) {
    if (!value) return null
    try {
      let date
      const raw = String(value).trim()

      // Cricbuzz API sends ISO timestamps in GMT/UTC - parse as UTC explicitly
      const isoNoTz = raw.match(/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}(?::\d{2})?$/)
      if (isoNoTz) {
        date = new Date(`${raw}Z`)
        return (!date || isNaN(date.getTime())) ? null : date
      }

      // Try direct parsing first
      const direct = new Date(raw)
      if (!Number.isNaN(direct.getTime())) return direct

      // Handle format like "16-Feb-26T5:30 AM" from CSV upload
      if (raw.includes('T') && !raw.match(/^\d{4}-/)) {
        const [datePart, timePart] = raw.split('T')
        const dateStr = datePart.includes('-20') ? datePart : datePart.replace(/-(\d{2})$/, '-20$1')
        const fullDateStr = `${dateStr} ${timePart}`
        date = new Date(fullDateStr)
      } else {
        date = new Date(raw)
      }
      return (!date || isNaN(date.getTime())) ? null : date
    } catch {
      return null
    }
  }

  // Helper function to sort votes by date/time
  function sortVotesByDateTime(votesArray) {
    return votesArray.sort((a, b) => {
      const dateA = parseMatchDateTime(a.scheduled_at)
      const dateB = parseMatchDateTime(b.scheduled_at)
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      return dateA - dateB
    })
  }

  // Helper function to format match date/time
  function formatMatchDateTime(scheduledAt) {
    if (!scheduledAt) return 'TBD'
    try {
      let date
      const raw = String(scheduledAt).trim()

      // CricAPI ISO without timezone is GMT; parse as UTC explicitly.
      const isoNoTz = raw.match(/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}(?::\d{2})?$/)
      if (isoNoTz) {
        date = new Date(`${raw}Z`)
      } else if (raw.includes('T') && !raw.match(/^\d{4}-/)) {
        // Handle format like "16-Feb-26T5:30 AM" from CSV upload
        const [datePart, timePart] = raw.split('T')
        const dateStr = datePart.includes('-20') ? datePart : datePart.replace(/-(\d{2})$/, '-20$1')
        const fullDateStr = `${dateStr} ${timePart}`
        date = new Date(fullDateStr)
      } else {
        date = new Date(raw)
      }

      if (!date || isNaN(date.getTime())) {
        console.log('Failed to parse date:', scheduledAt)
        return scheduledAt // Return raw value for debugging
      }

      // Format: "01-Mar-2026 | 2:30 AM" in user's local timezone
      const day = String(date.getDate()).padStart(2, '0')
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      const month = months[date.getMonth()]
      const year = date.getFullYear()
      let hour = date.getHours()
      const ampm = hour >= 12 ? 'PM' : 'AM'
      hour = hour % 12 || 12
      const minute = String(date.getMinutes()).padStart(2, '0')

      return `${day}-${month}-${year} | ${hour}:${minute} ${ampm}`
    } catch (e) {
      console.log('Error formatting date:', scheduledAt, e)
      return scheduledAt // Return raw value for debugging
    }
  }

  // Fetch users list for admin dropdown
  useEffect(() => {
    if (!user || user.role !== 'admin') return
    axios.get('/api/admin/users', { headers: { 'x-user': user.username } })
      .then(r => setUsers(r.data?.filter(u => u.role !== 'admin') || []))
      .catch(() => setUsers([]))
  }, [user])

  // Fetch seasons for the dropdown
  useEffect(() => {
    if (!user || user.role === 'admin') return
    axios.get('/api/seasons', { headers: { 'x-user': user.username } })
      .then(r => setSeasons(r.data || []))
      .catch(() => setSeasons([]))
  }, [user])

  // Fetch total balance across all seasons
  useEffect(() => {
    if (!user || user.role === 'admin') return
    axios.get('/api/users/my-total-balance', { headers: { 'x-user': user.username } })
      .then(r => setTotalBalance(r.data?.balance ?? 0))
      .catch(() => setTotalBalance(0))
  }, [user, refreshTrigger])

  useEffect(() => {
    if (!user) return
    if (user.role === 'admin') {
      // Admin fetching vote history
      setLoading(true)
      const endpoint = selectedUser === 'all' 
        ? '/api/admin/vote-history'
        : `/api/admin/vote-history?userId=${selectedUser}`
      axios.get(endpoint, { headers: { 'x-user': user.username } })
        .then(r => { setVotes(sortVotesByDateTime(r.data || [])); setLoading(false) })
        .catch(() => { setVotes([]); setLoading(false) })
    } else {
      // Regular user fetching their own votes
      setLoading(true)
      axios.get(`/api/users/${user.id}/votes`)
        .then(r => { setVotes(sortVotesByDateTime(r.data || [])); setLoading(false) })
        .catch(() => { setVotes([]); setLoading(false) })
    }
  }, [user, refreshTrigger, selectedUser])

  // Filter votes by selected season
  const filteredVotes = useMemo(() => {
    if (selectedSeason === 'all') return votes
    return votes.filter(v => String(v.season_id) === String(selectedSeason))
  }, [votes, selectedSeason])

  // Season balance for selected season (from seasons list)
  const selectedSeasonData = useMemo(() => {
    if (selectedSeason === 'all') return null
    return seasons.find(s => String(s.id) === String(selectedSeason)) || null
  }, [seasons, selectedSeason])

  // Summary stats for filtered votes
  const summary = useMemo(() => {
    const settled = filteredVotes.filter(v => v.winner)
    const won = settled.filter(v => v.team === v.winner).length
    const lost = settled.filter(v => v.team !== v.winner).length
    const netTotal = settled.reduce((sum, v) => sum + (v.net_points ?? 0), 0)
    return { won, lost, netTotal }
  }, [filteredVotes])

  return (
    <div style={{padding: '20px', fontFamily: 'Inter, sans-serif'}}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.70)', borderRadius: '14px',
        padding: '10px 18px 10px 10px', boxShadow: '0 3px 16px rgba(0,0,0,0.12)',
        marginBottom: '20px',
      }}>
        <div style={{
          width: '42px', height: '42px',
          background: 'linear-gradient(135deg,#f39c12,#e67e22)',
          borderRadius: '12px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '20px', flexShrink: 0,
          boxShadow: '0 4px 14px rgba(243,156,18,0.4)',
        }}>📋</div>
        <div style={{flex: 1}}>
          <div style={{fontSize: '18px', fontWeight: '800', color: '#1a1a1a', fontFamily:"'Poppins',sans-serif", lineHeight: 1.2}}>Vote History</div>
          <div style={{fontSize: '12px', color: '#444', fontWeight: '700', marginTop: '3px'}}>
            {user?.role === 'admin' ? 'View all user votes' : 'Your picks & point history'}
          </div>
        </div>

        {/* Admin user selector */}
        {user?.role === 'admin' && users.length > 0 && (
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0}}>
            <span style={{fontSize: '12px', fontWeight: '700', color: '#555', whiteSpace: 'nowrap'}}>👤 User:</span>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              style={{
                padding: '7px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                border: '1px solid #ddd', background: 'white', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', color: '#333',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
            >
              <option value="all">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.display_name || u.username}</option>
              ))}
            </select>
          </div>
        )}

        {/* Season selector */}
        {seasons.length > 0 && user?.role !== 'admin' && (
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0}}>
            <span style={{fontSize: '12px', fontWeight: '700', color: '#555', whiteSpace: 'nowrap'}}>🏏 Season:</span>
            <select
              value={selectedSeason}
              onChange={e => setSelectedSeason(e.target.value)}
              style={{
                padding: '7px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                border: '1px solid #ddd', background: 'white', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', color: '#333',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
            >
              <option value="all">All Seasons</option>
              {seasons.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Balance / summary bar */}
      {user?.role !== 'admin' && (
        <div style={{
          display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px',
        }}>
          {/* Balance card */}
          <div style={{
            background: 'linear-gradient(135deg,#667eea,#764ba2)',
            borderRadius: '12px', padding: '12px 20px', color: 'white', minWidth: '140px',
            boxShadow: '0 4px 14px rgba(102,126,234,0.4)',
          }}>
            <div style={{fontSize: '11px', fontWeight: '600', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px'}}>
              {selectedSeasonData ? `${selectedSeasonData.name} Balance` : 'Overall Balance'}
            </div>
            <div style={{fontSize: '22px', fontWeight: '900', fontFamily:"'Poppins',sans-serif", marginTop: '4px'}}>
              {selectedSeasonData
                ? `${Math.round(selectedSeasonData.season_balance ?? 0)} pts`
                : `${Math.round(totalBalance)} pts`}
            </div>
          </div>

          {/* Won / Lost / Net */}
          {[
            { label: '✅ Won', value: summary.won, color: '#38a169' },
            { label: '❌ Lost', value: summary.lost, color: '#e53e3e' },
            { label: '📊 Net', value: (summary.netTotal >= 0 ? '+' : '') + Math.round(summary.netTotal), color: summary.netTotal >= 0 ? '#38a169' : '#e53e3e' },
          ].map(card => (
            <div 
              key={card.label} 
              onClick={() => {
                if (card.label === '✅ Won' && summary.won > 0) {
                  celebrateBalanceIncrease(summary.won * 20);
                } else if (card.label === '📊 Net' && summary.netTotal > 0) {
                  celebrateBalanceIncrease(summary.netTotal);
                }
              }}
              style={{
                background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)',
                borderRadius: '12px', padding: '12px 20px', minWidth: '100px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.7)',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)';
              }}
            >
              <div style={{fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px'}}>{card.label}</div>
              <div style={{fontSize: '20px', fontWeight: '900', color: card.color, fontFamily:"'Poppins',sans-serif", marginTop: '4px'}}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{fontSize: '14px', color: '#718096'}}>Loading votes...</p>
      ) : filteredVotes.length === 0 ? (
        <p style={{fontSize: '14px', color: '#718096'}}>
          {selectedSeason === 'all' ? 'No votes yet.' : 'No votes for this season yet.'}
        </p>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {filteredVotes.map(v => {
            const isWon = v.winner && v.team === v.winner
            const isLost = v.winner && v.team !== v.winner
            const isPending = !v.winner
            const netVal = v.net_points !== null && v.net_points !== undefined ? Math.round(v.net_points) : null

            const resultColor = isPending ? '#ed8936' : isWon ? '#38a169' : '#e53e3e'
            const resultBg   = isPending ? 'rgba(237,137,54,0.12)' : isWon ? 'rgba(56,161,105,0.12)' : 'rgba(229,62,62,0.12)'
            const resultIcon = isPending ? '⏳' : isWon ? '✅' : '❌'
            const resultText = isPending ? 'Pending' : isWon ? 'Won' : 'Lost'

            return (
              <div key={v.id} style={{
                background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(14px)',
                borderRadius: '14px', padding: '14px 16px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                border: `1px solid ${isPending ? 'rgba(237,137,54,0.2)' : isWon ? 'rgba(56,161,105,0.2)' : 'rgba(229,62,62,0.2)'}`,
                borderLeft: `4px solid ${resultColor}`,
              }}>
                {/* Row 1: match title + result badge */}
                <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px'}}>
                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{fontSize: '14px', fontWeight: '800', color: '#1a1a1a', fontFamily:"'Poppins',sans-serif", lineHeight: 1.3}}>
                      {v.home_team} <span style={{color: '#999', fontWeight: 400}}>vs</span> {v.away_team}
                    </div>
                    <div style={{fontSize: '11px', color: '#888', marginTop: '3px', fontWeight: 500}}>
                      {formatMatchDateTime(v.scheduled_at)}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0,
                  }}>
                    <span style={{
                      background: resultBg, color: resultColor,
                      fontSize: '12px', fontWeight: '700', borderRadius: '20px',
                      padding: '3px 10px', whiteSpace: 'nowrap',
                    }}>{resultIcon} {resultText}</span>
                    {netVal !== null && (
                      <span style={{
                        fontSize: '16px', fontWeight: '900', fontFamily:"'Poppins',sans-serif",
                        color: netVal >= 0 ? '#38a169' : '#e53e3e',
                      }}>{netVal >= 0 ? '+' : ''}{netVal} pts</span>
                    )}
                  </div>
                </div>

                {/* Row 2: season badge + vote info */}
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                  {(selectedSeason === 'all' || user?.role === 'admin') && (
                    <span style={{
                      background: 'linear-gradient(135deg,#667eea22,#764ba222)',
                      border: '1px solid #667eea44', color: '#667eea',
                      borderRadius: '6px', padding: '2px 8px',
                      fontSize: '11px', fontWeight: '700',
                    }}>{v.season_name || `Season ${v.season_id}`}</span>
                  )}
                  {user?.role === 'admin' && v.display_name && (
                    <span style={{
                      background: 'rgba(102,126,234,0.1)', color: '#667eea',
                      borderRadius: '6px', padding: '2px 8px',
                      fontSize: '11px', fontWeight: '700',
                    }}>👤 {v.display_name || v.username}</span>
                  )}
                  <span style={{
                    background: 'rgba(102,126,234,0.1)', color: '#4a5568',
                    borderRadius: '6px', padding: '2px 8px',
                    fontSize: '11px', fontWeight: '600',
                  }}>🗳️ <span style={{color: '#667eea', fontWeight: 700}}>{v.team}</span> · {v.points} pts</span>
                  {v.winner && (
                    <span style={{
                      background: 'rgba(56,161,105,0.1)', color: '#2f855a',
                      borderRadius: '6px', padding: '2px 8px',
                      fontSize: '11px', fontWeight: '600',
                    }}>🏆 {v.winner}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
