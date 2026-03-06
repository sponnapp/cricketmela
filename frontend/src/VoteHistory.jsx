import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function VoteHistory({ user, refreshTrigger }) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)

  // Helper function to parse match date/time for sorting
  function parseMatchDateTime(value) {
    if (!value) return null
    try {
      let date;
      // Handle format like "16-Feb-26T5:30 AM" from CSV upload
      if (value.includes('T') && !value.match(/^\d{4}-/)) {
        const [datePart, timePart] = value.split('T')
        const dateStr = datePart.includes('-20') ? datePart : datePart.replace(/-(\d{2})$/, '-20$1')
        const fullDateStr = `${dateStr} ${timePart}`
        date = new Date(fullDateStr)
      } else if (value.includes('T')) {
        date = new Date(value)
      } else {
        date = new Date(value)
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
      let date;

      // Handle format like "16-Feb-26T5:30 AM" from CSV upload
      if (scheduledAt.includes('T') && !scheduledAt.match(/^\d{4}-/)) {
        // Split by T to get date and time parts
        const [datePart, timePart] = scheduledAt.split('T')

        // Parse date part (e.g., "16-Feb-26" or "01-Mar-2026")
        const dateStr = datePart.includes('-20') ? datePart : datePart.replace(/-(\d{2})$/, '-20$1')

        // Combine with time for parsing
        const fullDateStr = `${dateStr} ${timePart}`
        date = new Date(fullDateStr)
      } else if (scheduledAt.includes('T')) {
        // ISO format like "2026-03-01T14:30"
        date = new Date(scheduledAt)
      } else {
        // Try direct parsing
        date = new Date(scheduledAt)
      }

      if (!date || isNaN(date.getTime())) {
        console.log('Failed to parse date:', scheduledAt)
        return scheduledAt // Return raw value for debugging
      }

      // Format: "01-Mar-2026 | 2:30 AM"
      const day = String(date.getDate()).padStart(2, '0')
      const month = date.toLocaleString('en-US', { month: 'short' })
      const year = date.getFullYear()
      const time = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

      return `${day}-${month}-${year} | ${time}`
    } catch (e) {
      console.log('Error formatting date:', scheduledAt, e)
      return scheduledAt // Return raw value for debugging
    }
  }

  useEffect(() => {
    if (!user) return
    if (user.role === 'admin') {
      setVotes([])
      setLoading(false)
      return
    }
    setLoading(true)
    axios.get(`/api/users/${user.id}/votes`)
      .then(r => {
        const sortedVotes = sortVotesByDateTime(r.data || [])
        setVotes(sortedVotes)
        setLoading(false)
      })
      .catch(() => { setVotes([]); setLoading(false) })
  }, [user, refreshTrigger])

  return (
    <div style={{padding: '20px', fontFamily: 'Inter, sans-serif'}}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '12px',
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.70)',
        borderRadius: '14px', padding: '10px 18px 10px 10px',
        boxShadow: '0 3px 16px rgba(0,0,0,0.12)', marginBottom: '22px',
      }}>
        <div style={{
          width: '42px', height: '42px',
          background: 'linear-gradient(135deg,#f39c12,#e67e22)',
          borderRadius: '12px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '20px', flexShrink: 0,
          boxShadow: '0 4px 14px rgba(243,156,18,0.4)',
        }}>📋</div>
        <div>
          <div style={{fontSize: '18px', fontWeight: '800', color: '#1a1a1a', fontFamily:"'Poppins',sans-serif", lineHeight: 1.2}}>Vote History</div>
          <div style={{fontSize: '12px', color: '#444', fontWeight: '700', marginTop: '3px'}}>Your picks &amp; point history</div>
        </div>
      </div>
      <div style={{marginBottom: '20px', fontSize: '14px'}}>
        <strong style={{fontSize: '16px'}}>Current Balance: {Math.round(user?.balance ?? 0)} points</strong>
      </div>
      {user?.role === 'admin' ? (
        <p style={{fontSize: '14px', color: '#718096'}}>Admin accounts do not participate in voting.</p>
      ) : loading ? (
        <p style={{fontSize: '14px', color: '#718096'}}>Loading votes...</p>
      ) : votes.length === 0 ? (
        <p style={{fontSize: '14px', color: '#718096'}}>No votes yet.</p>
      ) : (
        <div style={{overflowX: 'auto', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.55)'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white'}}>
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
              {votes.map((v, idx) => (
                <tr key={v.id} style={{borderBottom: '1px solid #f0f0f0', backgroundColor: idx % 2 === 0 ? '#fafbfc' : 'white'}}>
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
                      <span style={{color: v.total_payout > 0 ? '#2d3748' : '#718096'}}>{Math.round(v.total_payout)}</span>
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
