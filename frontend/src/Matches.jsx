import React, { useEffect, useState } from 'react'
import axios from 'axios'

const POINTS = [10, 20, 50]

export default function Matches({ seasonId, user, refreshUser }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [votes, setVotes] = useState({}) // {matchId: {team: '', points: ''}}
  const [userVotes, setUserVotes] = useState({}) // {matchId: {team: '', points: ''}}

  useEffect(() => {
    fetchMatches()
  }, [seasonId])

  async function fetchMatches() {
    setLoading(true)
    try {
      const r = await axios.get(`/api/seasons/${seasonId}/matches`)
      setMatches(r.data)

      // Fetch user's existing votes for all matches
      const userVotesData = {}
      for (const match of r.data) {
        try {
          const voteRes = await axios.get(`/api/matches/${match.id}/user-vote`, {
            headers: { 'x-user': user?.username }
          })
          if (voteRes.data) {
            userVotesData[match.id] = voteRes.data
            // Pre-populate the vote form with existing vote
            setVotes(prev => ({
              ...prev,
              [match.id]: { team: voteRes.data.team, points: voteRes.data.points }
            }))
          }
        } catch (err) {
          // No existing vote for this match
        }
      }
      setUserVotes(userVotesData)
      setLoading(false)
    } catch (err) {
      setMatches([])
      setLoading(false)
    }
  }

  function parseMatchDateTime(value) {
    if (!value) return null
    const direct = new Date(value)
    if (!Number.isNaN(direct.getTime())) return direct

    const monthMap = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    }

    const parts = String(value).split('T')
    if (parts.length < 2) return null
    const [datePart, timePartRaw] = parts

    let year
    let monthIndex
    let day

    const isoDate = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (isoDate) {
      year = parseInt(isoDate[1], 10)
      monthIndex = parseInt(isoDate[2], 10) - 1
      day = parseInt(isoDate[3], 10)
    } else {
      const dmy = datePart.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/)
      if (!dmy) return null
      day = parseInt(dmy[1], 10)
      const monthKey = dmy[2].toLowerCase()
      if (monthMap[monthKey] === undefined) return null
      monthIndex = monthMap[monthKey]
      const yearRaw = dmy[3]
      year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw, 10) : parseInt(yearRaw, 10)
    }

    const timePart = timePartRaw.trim()
    const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
    if (!timeMatch) return null
    let hour = parseInt(timeMatch[1], 10)
    const minute = parseInt(timeMatch[2], 10)
    const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : null

    if (ampm) {
      if (hour === 12) hour = 0
      if (ampm === 'PM') hour += 12
    }

    return new Date(year, monthIndex, day, hour, minute, 0, 0)
  }

  // Check if match has started
  function hasMatchStarted(scheduledAt) {
    const matchTime = parseMatchDateTime(scheduledAt)
    if (!matchTime) return false
    return new Date() >= matchTime
  }

  // Check if voting is closed (30 minutes before match start)
  function isVotingClosed(scheduledAt) {
    const matchTime = parseMatchDateTime(scheduledAt)
    if (!matchTime) return true
    const cutoffTime = new Date(matchTime.getTime() - 30 * 60 * 1000)
    return new Date() >= cutoffTime
  }

  // Check if voting is disabled (match started or winner set)
  function isVotingDisabled(match) {
    return isVotingClosed(match.scheduled_at) || match.winner || user?.role === 'admin'
  }

  // Get reason why voting is disabled
  function getVotingDisabledReason(match) {
    if (user?.role === 'admin') return 'Admin View'
    if (match.winner) return 'Winner Declared'
    if (!parseMatchDateTime(match.scheduled_at)) return 'Schedule Invalid'
    if (isVotingClosed(match.scheduled_at)) return 'Voting Closed'
    return null
  }

  async function submitVote(matchId, team, points) {
    if (!user) { alert('Please login'); return }
    if (user.role === 'admin') { alert('Admins cannot vote'); return }
    if (!team || !points) { alert('Select both team and points'); return }

    try {
      const res = await axios.post(`/api/matches/${matchId}/vote`,
        { team, points: parseInt(points) },
        { headers: { 'x-user': user.username } }
      )
      alert(`${res.data.message}! New balance: ${res.data.balance}`)

      // Update user balance locally (avoid re-login)
      refreshUser({ ...user, balance: res.data.balance })

      // Refresh matches to get updated odds
      await fetchMatches()

      // Keep the vote displayed in the form
      // No need to clear - it should stay as selected
    } catch (err) {
      alert(err.response?.data?.error || 'Vote failed')
    }
  }

  return (
    <div style={{padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh'}}>
      <h2 style={{
        color: '#1a1a1a',
        marginBottom: '30px',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '28px',
        fontWeight: '600',
        letterSpacing: '-0.5px'
      }}>🏏 Matches & Voting</h2>

      {loading ? (
        <p style={{fontFamily: 'Inter, sans-serif', fontSize: '14px'}}>Loading matches...</p>
      ) : matches.length === 0 ? (
        <p style={{fontFamily: 'Inter, sans-serif', fontSize: '14px'}}>No matches found</p>
      ) : (
        <div style={{
          overflowX: 'auto',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          padding: '0',
          border: '1px solid #e8e8e8'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'Inter, sans-serif'
          }}>
            <thead>
              <tr style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <th style={{padding: '14px 12px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>S.No</th>
                <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Team 1</th>
                <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Team 2</th>
                <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Venue</th>
                <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Date</th>
                <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Time</th>
                <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Vote</th>
                <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Points</th>
                <th style={{padding: '14px 12px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>T1<br/>Odds</th>
                <th style={{padding: '14px 12px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>T2<br/>Odds</th>
                <th style={{padding: '14px 12px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Winner</th>
                <th style={{padding: '14px 12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m, idx) => {
                const votingDisabled = isVotingDisabled(m)
                const disabledReason = getVotingDisabledReason(m)
                const userVote = userVotes[m.id]

                return (
                  <tr key={m.id} style={{
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: idx % 2 === 0 ? '#fafbfc' : 'white',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f7fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fafbfc' : 'white'}
                  >
                    <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#667eea'}}>{idx + 1}</td>
                    <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '13px', fontWeight: '600', color: '#2d3748'}}>{m.home_team}</td>
                    <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '13px', fontWeight: '600', color: '#2d3748'}}>{m.away_team}</td>
                    <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', color: '#718096'}}>{m.venue || 'N/A'}</td>
                    <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', color: '#4a5568'}}>
                      {m.scheduled_at ? m.scheduled_at.split('T')[0] : 'N/A'}
                    </td>
                    <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', color: '#4a5568'}}>
                      {m.scheduled_at ? m.scheduled_at.split('T')[1] || 'N/A' : 'N/A'}
                    </td>
                    <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0'}}>
                      {votingDisabled ? (
                        userVotes[m.id] ? (
                          <div style={{fontSize: '12px', color: '#4a5568'}}>
                            <div style={{fontWeight: '600', marginBottom: '2px'}}>{userVotes[m.id].team}</div>
                            <div style={{color: '#a0aec0', fontSize: '11px'}}>{userVotes[m.id].points} pts</div>
                          </div>
                        ) : (
                          <span style={{
                            color: '#e53e3e',
                            fontWeight: '600',
                            fontSize: '11px',
                            backgroundColor: '#fff5f5',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            display: 'inline-block'
                          }}>{disabledReason}</span>
                        )
                      ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                          <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px'}}>
                            <input
                              type="radio"
                              name={`vote-${m.id}`}
                              value={m.home_team}
                              checked={votes[m.id]?.team === m.home_team}
                              onChange={e => setVotes({...votes, [m.id]: {...(votes[m.id] || {}), team: e.target.value}})}
                              disabled={votingDisabled}
                              style={{accentColor: '#667eea'}}
                            />
                            <span style={{fontWeight: '500'}}>{m.home_team}</span>
                          </label>
                          <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px'}}>
                            <input
                              type="radio"
                              name={`vote-${m.id}`}
                              value={m.away_team}
                              checked={votes[m.id]?.team === m.away_team}
                              onChange={e => setVotes({...votes, [m.id]: {...(votes[m.id] || {}), team: e.target.value}})}
                              disabled={votingDisabled}
                              style={{accentColor: '#667eea'}}
                            />
                            <span style={{fontWeight: '500'}}>{m.away_team}</span>
                          </label>
                        </div>
                      )}
                    </td>
                    <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0'}}>
                      {votingDisabled ? (
                        <span style={{color: '#a0aec0', fontSize: '12px'}}>-</span>
                      ) : (
                        <select
                          value={votes[m.id]?.points || ''}
                          onChange={e => setVotes({...votes, [m.id]: {...(votes[m.id] || {}), points: e.target.value}})}
                          style={{
                            padding: '6px 8px',
                            width: '100%',
                            minWidth: '70px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '12px',
                            fontWeight: '500',
                            fontFamily: 'Inter, sans-serif',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                          }}
                          disabled={votingDisabled}
                        >
                          <option value="">Select</option>
                          {POINTS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      )}
                    </td>
                    <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', textAlign: 'center'}}>
                      <span style={{
                        fontWeight: '700',
                        fontSize: '15px',
                        color: '#667eea',
                        backgroundColor: '#edf2f7',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        display: 'inline-block'
                      }}>
                        {m.vote_totals && m.vote_totals[m.home_team] ? m.vote_totals[m.home_team] : 0}
                      </span>
                    </td>
                    <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', textAlign: 'center'}}>
                      <span style={{
                        fontWeight: '700',
                        fontSize: '15px',
                        color: '#667eea',
                        backgroundColor: '#edf2f7',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        display: 'inline-block'
                      }}>
                        {m.vote_totals && m.vote_totals[m.away_team] ? m.vote_totals[m.away_team] : 0}
                      </span>
                    </td>
                    <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', textAlign: 'center'}}>
                      {m.winner ? (
                        <span style={{
                          color: '#38a169',
                          fontWeight: '700',
                          backgroundColor: '#f0fff4',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          display: 'inline-block',
                          border: '1px solid #c6f6d5'
                        }}>
                          {m.winner}
                        </span>
                      ) : (
                        <span style={{color: '#a0aec0', fontSize: '12px', fontWeight: '600'}}>TBD</span>
                      )}
                    </td>
                    <td style={{padding: '14px 12px', textAlign: 'center'}}>
                      {votingDisabled ? (
                        <span style={{color: '#a0aec0', fontSize: '11px', fontWeight: '500'}}>Voting Closed</span>
                      ) : (
                        <button
                          onClick={() => submitVote(m.id, votes[m.id]?.team, votes[m.id]?.points)}
                          style={{
                            padding: '8px 20px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '12px',
                            fontFamily: 'Inter, sans-serif',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-2px)'
                            e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)'
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)'
                            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
                          }}
                        >
                          {userVote ? 'Update' : 'Vote'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
