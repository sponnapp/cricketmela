import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'

export default function VoteHistory({ user, refreshTrigger }) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState('all')
  const [totalBalance, setTotalBalance] = useState(0)

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
    if (user.role === 'admin') { setVotes([]); setLoading(false); return }
    setLoading(true)
    axios.get(`/api/users/${user.id}/votes`)
      .then(r => { setVotes(sortVotesByDateTime(r.data || [])); setLoading(false) })
      .catch(() => { setVotes([]); setLoading(false) })
  }, [user, refreshTrigger])

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
          <div style={{fontSize: '12px', color: '#444', fontWeight: '700', marginTop: '3px'}}>Your picks &amp; point history</div>
        </div>

        {/* Season selector */}
        {seasons.length > 0 && (
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
            <div key={card.label} style={{
              background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)',
              borderRadius: '12px', padding: '12px 20px', minWidth: '100px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.7)',
            }}>
              <div style={{fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px'}}>{card.label}</div>
              <div style={{fontSize: '20px', fontWeight: '900', color: card.color, fontFamily:"'Poppins',sans-serif", marginTop: '4px'}}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {user?.role === 'admin' ? (
        <p style={{fontSize: '14px', color: '#718096'}}>Admin accounts do not participate in voting.</p>
      ) : loading ? (
        <p style={{fontSize: '14px', color: '#718096'}}>Loading votes...</p>
      ) : filteredVotes.length === 0 ? (
        <p style={{fontSize: '14px', color: '#718096'}}>
          {selectedSeason === 'all' ? 'No votes yet.' : 'No votes for this season yet.'}
        </p>
      ) : (
        <div style={{overflowX: 'auto', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.55)'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white'}}>
                {selectedSeason === 'all' && (
                  <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Season</th>
                )}
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Match</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Date/Time</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Your Vote</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Points Voted</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Winner</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Result</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Total Payout</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Net</th>
              </tr>
            </thead>
            <tbody>
              {filteredVotes.map((v, idx) => (
                <tr key={v.id} style={{borderBottom: '1px solid #f0f0f0', backgroundColor: idx % 2 === 0 ? '#fafbfc' : 'white'}}>
                  {selectedSeason === 'all' && (
                    <td style={{padding: '14px 12px', fontSize: '12px', color: '#555'}}>
                      <span style={{
                        background: 'linear-gradient(135deg,#667eea22,#764ba222)',
                        border: '1px solid #667eea44',
                        color: '#667eea', borderRadius: '6px',
                        padding: '2px 8px', fontWeight: '700', whiteSpace: 'nowrap',
                      }}>{v.season_name || `Season ${v.season_id}`}</span>
                    </td>
                  )}
                  <td style={{padding: '14px 12px', fontSize: '13px', color: '#2d3748'}}>{v.home_team} vs {v.away_team}</td>
                  <td style={{padding: '14px 12px', fontSize: '13px', color: '#4a5568'}}>{formatMatchDateTime(v.scheduled_at)}</td>
                  <td style={{padding: '14px 12px', fontSize: '13px', fontWeight: '600', color: '#667eea'}}>{v.team}</td>
                  <td style={{padding: '14px 12px', fontSize: '13px', fontWeight: '600', color: '#4a5568'}}>{v.points}</td>
                  <td style={{padding: '14px 12px', fontSize: '13px', color: '#2d3748'}}>{v.winner || 'TBD'}</td>
                  <td style={{padding: '14px 12px', fontSize: '13px', fontWeight: '600'}}>
                    {!v.winner ? <span style={{color: '#ed8936'}}>⏳ Pending</span> : v.team === v.winner ? <span style={{color: '#38a169'}}>✅ Won</span> : <span style={{color: '#e53e3e'}}>❌ Lost</span>}
                  </td>
                  <td style={{padding: '14px 12px', fontSize: '13px', fontWeight: '600'}}>
                    {v.total_payout === null || v.total_payout === undefined ? (
                      <span style={{color: '#a0aec0'}}>—</span>
                    ) : (
                      <span style={{color: '#2d3748'}}>{Math.round(v.total_payout)}</span>
                    )}
                  </td>
                  <td style={{padding: '14px 12px', fontSize: '13px', fontWeight: '600'}}>
                    {v.net_points === null || v.net_points === undefined ? (
                      <span style={{color: '#a0aec0'}}>—</span>
                    ) : v.net_points >= 0 ? (
                      <span style={{color: '#38a169'}}>+{Math.round(v.net_points)}</span>
                    ) : (
                      <span style={{color: '#e53e3e'}}>{Math.round(v.net_points)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
