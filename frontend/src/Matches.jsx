import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { toast } from './Toast'
import CoinFlip from './CoinFlip'

const POINTS = [10, 20, 50]

// ── Next Match Vote-Closes Banner ───────────────────────────────────────────
function NextMatchCountdown({ matches, parseMatchDateTime, seasonBalance }) {
  const [state, setState] = useState({ match: null, timeLeft: null })

  useEffect(() => {
    function compute() {
      const now = new Date()
      let best = null, bestCutoff = null
      for (const m of matches) {
        if (m.winner) continue
        const matchTime = parseMatchDateTime(m.scheduled_at)
        if (!matchTime) continue
        const cutoff = new Date(matchTime.getTime() - 30 * 60 * 1000)
        if (cutoff <= now) continue
        if (!bestCutoff || cutoff < bestCutoff) { best = m; bestCutoff = cutoff }
      }
      if (!best || !bestCutoff) return setState({ match: null, timeLeft: null })
      const diff = bestCutoff - now
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setState({ match: best, timeLeft: { h, m, s, diff } })
    }
    compute()
    const id = setInterval(compute, 1000)
    return () => clearInterval(id)
  }, [matches, parseMatchDateTime])

  const { match, timeLeft } = state
  if (!match || !timeLeft) return null

  const urgent = timeLeft.diff < 10 * 60 * 1000
  const warning = timeLeft.diff < 60 * 60 * 1000
  const colour = urgent ? '#e74c3c' : warning ? '#f39c12' : '#2ecc71'
  const bgColor = urgent ? 'rgba(231,76,60,0.12)' : warning ? 'rgba(243,156,18,0.12)' : 'rgba(46,204,113,0.10)'
  const label = timeLeft.h > 0
    ? `${timeLeft.h}h ${String(timeLeft.m).padStart(2,'0')}m ${String(timeLeft.s).padStart(2,'0')}s`
    : `${timeLeft.m}m ${String(timeLeft.s).padStart(2,'0')}s`

  return (
    <div style={{
      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0',
      background: bgColor,
      border: `1.5px solid ${colour}`,
      borderRadius: '12px',
      padding: '7px 14px',
      flexShrink: 0, width: '100%',
    }}>
      {urgent && <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.55}}`}</style>}
      {seasonBalance !== null && seasonBalance !== undefined && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          paddingRight: '12px', marginRight: '12px',
          borderRight: `1.5px solid ${colour}50`,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#667eea', textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif' }}>Balance</div>
          <div style={{ fontSize: '16px', fontWeight: '900', color: '#667eea', fontFamily: "'Poppins', sans-serif", lineHeight: 1.1 }}>{Math.round(seasonBalance)}</div>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#667eea', fontFamily: 'Inter, sans-serif' }}>pts</div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px', flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: colour, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif' }}>
          ⏰ Vote closes in
        </div>
        <div style={{
          fontSize: '18px', fontWeight: '800',
          color: colour,
          fontFamily: "'Poppins', sans-serif",
          letterSpacing: '0.5px',
          animation: urgent ? 'pulse 1s infinite' : 'none',
          lineHeight: 1.1,
        }}>
          {label}
        </div>
        <div style={{ fontSize: '10px', color: '#555', fontFamily: 'Inter, sans-serif', fontWeight: '600', whiteSpace: 'nowrap' }}>
          {match.home_team} vs {match.away_team}
        </div>
      </div>
    </div>
  )
}

export default function Matches({ seasonId, user, refreshUser, refreshTrigger }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [votes, setVotes] = useState({})
  const [userVotes, setUserVotes] = useState({})
  // Track which match IDs the user has manually touched this session
  // Auto-refresh will never overwrite these
  const dirtyVotes = useRef(new Set())
  const [seasonBalance, setSeasonBalance] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [coinFlip, setCoinFlip] = useState({ show: false, team: '' })
  const [saving, setSaving] = useState(false)
  const [filterTab, setFilterTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchMatches()
    fetchSeasonBalance()
  }, [seasonId, user?.username, refreshTrigger])

  async function fetchMatches() {
    setLoading(true)
    try {
      const r = await axios.get(`/api/seasons/${seasonId}/matches`)

      // Sort matches by date and time
      const sortedMatches = sortMatchesByDateTime(r.data)
      setMatches(sortedMatches)

      // Fetch user's existing votes for all matches
      const userVotesData = {}
      for (const match of sortedMatches) {
        try {
          const voteRes = await axios.get(`/api/matches/${match.id}/user-vote`, {
            headers: { 'x-user': user?.username }
          })
          if (voteRes.data) {
            userVotesData[match.id] = voteRes.data
            // Only pre-populate if the user hasn't manually changed this match
            // this session — prevents auto-refresh from clobbering in-progress edits
            if (!dirtyVotes.current.has(match.id)) {
              setVotes(prev => ({
                ...prev,
                [match.id]: { team: voteRes.data.team, points: voteRes.data.points }
              }))
            }
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

  async function fetchSeasonBalance() {
    if (!user || user.role === 'admin') return
    try {
      const r = await axios.get(`/api/seasons/${seasonId}/my-balance`, {
        headers: { 'x-user': user.username }
      })
      setSeasonBalance(r.data.balance ?? null)
    } catch (err) {
      setSeasonBalance(null)
    }
  }

  async function submitAllVotes() {
    if (!user || user.role === 'admin') return

    const toSubmit = matches.filter(m => {
      if (isVotingDisabled(m)) return false
      const v = votes[m.id]
      if (!v?.team || !v?.points) return false
      const saved = userVotes[m.id]
      if (!saved) return true
      return v.team !== saved.team || String(v.points) !== String(saved.points)
    })

    if (toSubmit.length === 0) {
      toast('warning', 'Nothing to save', 'Select a team and points for each match first')
      return
    }

    setSaving(true)
    let savedCount = 0, failedCount = 0, lastBalance = seasonBalance

    for (const m of toSubmit) {
      const { team, points } = votes[m.id]
      try {
        const res = await axios.post(`/api/matches/${m.id}/vote`,
          { team, points: parseInt(points) },
          { headers: { 'x-user': user.username } }
        )
        if (res.data.season_balance !== undefined) lastBalance = res.data.season_balance
        dirtyVotes.current.delete(m.id)
        savedCount++
      } catch (err) {
        failedCount++
      }
    }

    if (lastBalance !== seasonBalance) setSeasonBalance(lastBalance)
    setSaving(false)

    if (failedCount === 0) {
      toast('success',
        `🏏 ${savedCount} Pick${savedCount > 1 ? 's' : ''} Saved!`,
        `Season Balance: ${Math.round(lastBalance ?? 0)} pts`,
        4000
      )
    } else {
      toast('warning',
        `${savedCount} saved, ${failedCount} failed`,
        'Some picks could not be saved — check your selections',
        5000
      )
    }

    await fetchMatches()
  }

  function parseMatchDateTime(value) {
    if (!value) return null
    const raw = String(value).trim()

    // Cricbuzz API sends ISO timestamps in GMT/UTC - parse as UTC explicitly
    const isoNoTz = raw.match(/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}(?::\d{2})?$/)
    if (isoNoTz) {
      const utc = new Date(`${raw}Z`)
      if (!Number.isNaN(utc.getTime())) return utc
    }

    const direct = new Date(raw)
    if (!Number.isNaN(direct.getTime())) return direct

    const monthMap = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    }

    const parts = raw.split('T')
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
    const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i)
    if (!timeMatch) return null
    let hour = parseInt(timeMatch[1], 10)
    const minute = parseInt(timeMatch[2], 10)
    const second = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0
    const ampm = timeMatch[4] ? timeMatch[4].toUpperCase() : null

    if (ampm) {
      if (hour === 12) hour = 0
      if (ampm === 'PM') hour += 12
    }

    if (isoDate && !ampm) {
      return new Date(Date.UTC(year, monthIndex, day, hour, minute, second, 0))
    }
    return new Date(year, monthIndex, day, hour, minute, second, 0)
  }

  function formatMatchDatePart(value) {
    const dt = parseMatchDateTime(value)
    if (!dt) return 'N/A'
    // Format in user's local timezone: YYYY-MM-DD
    const year = dt.getFullYear()
    const month = String(dt.getMonth() + 1).padStart(2, '0')
    const day = String(dt.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function formatMatchTimePart(value) {
    const dt = parseMatchDateTime(value)
    if (!dt) return 'N/A'
    // Format in user's local timezone (browser automatically converts)
    const hours = String(dt.getHours()).padStart(2, '0')
    const minutes = String(dt.getMinutes()).padStart(2, '0')
    const seconds = String(dt.getSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  // Sort matches by date and time (earliest first)
  function sortMatchesByDateTime(matches) {
    return [...matches].sort((a, b) => {
      const dateA = parseMatchDateTime(a.scheduled_at)
      const dateB = parseMatchDateTime(b.scheduled_at)

      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1

      return dateA.getTime() - dateB.getTime()
    })
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

  const pendingCount = matches.filter(m => {
    if (isVotingDisabled(m)) return false
    const v = votes[m.id]
    if (!v?.team || !v?.points) return false
    const saved = userVotes[m.id]
    if (!saved) return true
    return v.team !== saved.team || String(v.points) !== String(saved.points)
  }).length

  const filteredMatches = (() => {
    const base = matches.filter(m => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!m.home_team.toLowerCase().includes(q) && !m.away_team.toLowerCase().includes(q)) return false
      }
      // Open: voting still open OR voting closed but no winner yet
      if (filterTab === 'open')   return !m.winner
      if (filterTab === 'voted')  return !!userVotes[m.id] && !m.winner
      // Closed: winner declared
      if (filterTab === 'closed') return !!m.winner
      return true
    })
    // Closed tab: latest match on top (reverse chronological)
    if (filterTab === 'closed') return [...base].reverse()
    return base
  })()

  return (
    <div style={{padding: isMobile ? '12px' : '20px', paddingBottom: !loading && pendingCount > 0 ? '80px' : undefined, minHeight: '100vh'}}>
      <div style={{
        display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '12px',
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.70)',
        borderRadius: '14px', padding: '10px 14px',
        boxShadow: '0 3px 16px rgba(0,0,0,0.12)', marginBottom: '16px',
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: 1}}>
          <div style={{
            width: '42px', height: '42px',
            background: 'linear-gradient(135deg,#2ecc71,#27ae60)',
            borderRadius: '12px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '20px', flexShrink: 0,
            boxShadow: '0 4px 14px rgba(46,204,113,0.4)',
          }}>🏏</div>
          <div>
            <div style={{fontSize: isMobile ? '16px' : '18px', fontWeight: '800', color: '#1a1a1a', fontFamily:"'Poppins',sans-serif", lineHeight: 1.2}}>Matches &amp; Voting</div>
            <div style={{fontSize: '11px', color: '#444', fontWeight: '700', marginTop: '3px'}}>Pick your winner before the match starts</div>
          </div>
        </div>
        <div style={{
          marginLeft: isMobile ? '0' : 'auto',
          width: isMobile ? '100%' : 'auto',
          flexShrink: 0,
        }}>
          <NextMatchCountdown
            matches={matches}
            parseMatchDateTime={parseMatchDateTime}
            seasonBalance={user?.role !== 'admin' && seasonBalance !== null ? seasonBalance : undefined}
          />
        </div>
      </div>

      {loading ? (
        <div style={{padding:'40px',textAlign:'center'}}>
          <div style={{fontSize:'36px',marginBottom:'10px'}}>🏏</div>
          <p style={{fontFamily:'Inter,sans-serif',fontSize:'14px',color:'#666'}}>Loading matches…</p>
        </div>
      ) : matches.length === 0 ? (
        <p style={{fontFamily: 'Inter, sans-serif', fontSize: '14px'}}>No matches found</p>
      ) : (
        <>
        {/* ── Filter bar ── */}
        <div style={{display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center'}}>
          <input
            type="text"
            placeholder="🔍 Search teams…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: '1 1 150px', minWidth: '130px',
              padding: '8px 12px', borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff', fontSize: '13px', fontFamily: 'Inter,sans-serif',
              outline: 'none',
            }}
          />
          {[
            { key: 'all',    label: `All (${matches.length})` },
            { key: 'open',   label: `Open (${matches.filter(m => !m.winner).length})` },
            { key: 'voted',  label: `Voted (${matches.filter(m => !!userVotes[m.id] && !m.winner).length})` },
            { key: 'closed', label: `Closed (${matches.filter(m => !!m.winner).length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilterTab(tab.key)} style={{
              padding: '7px 13px', borderRadius: '20px',
              border: filterTab === tab.key ? 'none' : '1px solid rgba(255,255,255,0.18)',
              background: filterTab === tab.key ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'rgba(255,255,255,0.08)',
              color: filterTab === tab.key ? '#fff' : 'rgba(255,255,255,0.65)',
              fontSize: '12px', fontWeight: '700', fontFamily: 'Inter,sans-serif',
              cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: filterTab === tab.key ? '0 3px 10px rgba(102,126,234,0.4)' : 'none',
              transition: 'all 0.2s',
            }}>{tab.label}</button>
          ))}
        </div>

        {filteredMatches.length === 0 ? (
          <div style={{textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontFamily: 'Inter,sans-serif'}}>
            No matches match your filter.
          </div>
        ) : isMobile ? (
          /* ── Mobile cards ── */
          <div>
            {filteredMatches.map((m, idx) => {
              const votingDisabled = isVotingDisabled(m)
              const disabledReason = getVotingDisabledReason(m)
              const isPending = !votingDisabled && !!votes[m.id]?.team && !!votes[m.id]?.points &&
                (!userVotes[m.id] || votes[m.id].team !== userVotes[m.id].team || String(votes[m.id].points) !== String(userVotes[m.id].points))
              const borderColor = isPending ? '#f39c12' : m.winner ? '#38a169' : votingDisabled ? '#a0aec0' : '#667eea'
              const globalIdx = matches.indexOf(m)
              return (
                <div key={m.id} style={{
                  background: isPending ? '#fffdf0' : 'rgba(255,255,255,0.93)',
                  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                  borderRadius: '14px',
                  marginBottom: '12px',
                  borderLeft: `4px solid ${borderColor}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden',
                }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px 8px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                    <span style={{fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px'}}>MATCH {globalIdx + 1}</span>
                    {m.winner ? (
                      <span style={{fontSize: '11px', color: '#68d391', fontWeight: '700', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '10px'}}>✅ {m.winner} won</span>
                    ) : isVotingClosed(m.scheduled_at) ? (
                      <span style={{fontSize: '11px', color: '#fc8181', fontWeight: '700', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '10px'}}>🔒 Voting Closed</span>
                    ) : (
                      <span style={{fontSize: '11px', color: '#68d391', fontWeight: '700', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '10px'}}>🟢 Open</span>
                    )}
                  </div>
                  <div style={{padding: '12px 14px'}}>
                    <div style={{textAlign: 'center', marginBottom: '8px'}}>
                      <span style={{fontSize: '14px', fontWeight: '800', color: '#2d3748', fontFamily: "'Poppins',sans-serif"}}>{m.home_team}</span>
                      <span style={{fontSize: '12px', color: '#a0aec0', margin: '0 8px', fontWeight: '600'}}>vs</span>
                      <span style={{fontSize: '14px', fontWeight: '800', color: '#2d3748', fontFamily: "'Poppins',sans-serif"}}>{m.away_team}</span>
                    </div>
                    <div style={{fontSize: '11px', color: '#718096', textAlign: 'center', marginBottom: '12px', lineHeight: 1.6}}>
                      📅 {formatMatchDatePart(m.scheduled_at)} &nbsp;·&nbsp; ⏱ {formatMatchTimePart(m.scheduled_at)}
                      {m.venue && <div>📍 {m.venue}</div>}
                    </div>
                    {votingDisabled ? (
                      userVotes[m.id] ? (
                        <div>
                          <div style={{textAlign: 'center', fontSize: '12px', color: '#4a5568', background: '#f7fafc', borderRadius: '10px', padding: '8px', marginBottom: m.vote_totals ? '8px' : '0'}}>
                            <span style={{fontWeight: '600'}}>Your pick: </span>
                            <span style={{color: '#667eea', fontWeight: '700'}}>{userVotes[m.id].team}</span>
                            <span style={{color: '#a0aec0'}}> · {userVotes[m.id].points} pts</span>
                          </div>
                          {m.vote_totals && (
                            <div style={{display: 'flex', gap: '8px'}}>
                              <div style={{flex: 1, textAlign: 'center', background: '#edf2f7', borderRadius: '8px', padding: '6px 4px', fontSize: '11px'}}>
                                <div style={{color: '#718096', fontWeight: '600', marginBottom: '2px'}}>{m.home_team}</div>
                                <div style={{color: '#667eea', fontWeight: '800', fontSize: '16px'}}>{m.vote_totals[m.home_team] || 0}</div>
                                <div style={{color: '#a0aec0', fontSize: '10px'}}>votes</div>
                              </div>
                              <div style={{flex: 1, textAlign: 'center', background: '#edf2f7', borderRadius: '8px', padding: '6px 4px', fontSize: '11px'}}>
                                <div style={{color: '#718096', fontWeight: '600', marginBottom: '2px'}}>{m.away_team}</div>
                                <div style={{color: '#667eea', fontWeight: '800', fontSize: '16px'}}>{m.vote_totals[m.away_team] || 0}</div>
                                <div style={{color: '#a0aec0', fontSize: '10px'}}>votes</div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{textAlign: 'center', padding: '8px', background: '#fff5f5', borderRadius: '10px'}}>
                          <span style={{color: '#e53e3e', fontWeight: '700', fontSize: '12px'}}>{disabledReason}</span>
                        </div>
                      )
                    ) : (
                      <div>
                        <div style={{display: 'flex', gap: '8px', marginBottom: '10px'}}>
                          {[m.home_team, m.away_team].map(team => {
                            const selected = votes[m.id]?.team === team
                            return (
                              <label key={team} style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 6px', borderRadius: '10px', cursor: 'pointer', border: `2px solid ${selected ? '#667eea' : '#e2e8f0'}`, background: selected ? 'rgba(102,126,234,0.12)' : 'white', fontSize: '12px', fontWeight: '700', color: selected ? '#667eea' : '#4a5568', textAlign: 'center', transition: 'all 0.15s ease'}}>
                                <input type="radio" name={`vote-${m.id}`} value={team} checked={selected}
                                  onChange={e => { dirtyVotes.current.add(m.id); setVotes({...votes, [m.id]: {...(votes[m.id] || {}), team: e.target.value}}) }}
                                  style={{display: 'none'}} />
                                {team}
                              </label>
                            )
                          })}
                        </div>
                        <select value={votes[m.id]?.points || ''}
                          onChange={e => { dirtyVotes.current.add(m.id); setVotes({...votes, [m.id]: {...(votes[m.id] || {}), points: e.target.value}}) }}
                          style={{width: '100%', padding: '10px 12px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600', fontFamily: 'Inter, sans-serif', backgroundColor: 'white', cursor: 'pointer'}}
                        >
                          <option value="">Select points</option>
                          {POINTS.map(p => <option key={p} value={p}>{p} pts</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Desktop table ── */
          <div style={{overflowX: 'auto', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', border: '1px solid rgba(255,255,255,0.55)'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif'}}>
              <thead>
                <tr style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white'}}>
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
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map((m, idx) => {
                  const votingDisabled = isVotingDisabled(m)
                  const disabledReason = getVotingDisabledReason(m)
                  const globalIdx = matches.indexOf(m)
                  const isPending = !votingDisabled && !!votes[m.id]?.team && !!votes[m.id]?.points &&
                    (!userVotes[m.id] || votes[m.id].team !== userVotes[m.id].team || String(votes[m.id].points) !== String(userVotes[m.id].points))
                  return (
                    <tr key={m.id} style={{borderBottom: '1px solid #f0f0f0', borderLeft: isPending ? '3px solid #f39c12' : '3px solid transparent', backgroundColor: isPending ? (idx % 2 === 0 ? '#fffdf0' : '#fffef5') : (idx % 2 === 0 ? '#fafbfc' : 'white'), transition: 'all 0.2s ease'}}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f7fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isPending ? (idx % 2 === 0 ? '#fffdf0' : '#fffef5') : (idx % 2 === 0 ? '#fafbfc' : 'white')}
                    >
                      <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#667eea'}}>{globalIdx + 1}</td>
                      <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '13px', fontWeight: '600', color: '#2d3748'}}>{m.home_team}</td>
                      <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '13px', fontWeight: '600', color: '#2d3748'}}>{m.away_team}</td>
                      <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', color: '#718096'}}>{m.venue || 'N/A'}</td>
                      <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', color: '#4a5568'}}>
                        <div>{formatMatchDatePart(m.scheduled_at)}</div>
                        {!m.winner && isVotingClosed(m.scheduled_at) && (
                          <div style={{marginTop:'4px',fontSize:'11px',color:'#e74c3c',fontWeight:'700'}}>🔒 Voting Closed</div>
                        )}
                      </td>
                      <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', color: '#4a5568'}}>{formatMatchTimePart(m.scheduled_at)}</td>
                      <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0'}}>
                        {votingDisabled ? (
                          userVotes[m.id] ? (
                            <div style={{fontSize: '12px', color: '#4a5568'}}>
                              <div style={{fontWeight: '600', marginBottom: '2px'}}>{userVotes[m.id].team}</div>
                              <div style={{color: '#a0aec0', fontSize: '11px'}}>{userVotes[m.id].points} pts</div>
                            </div>
                          ) : (
                            <span style={{color: '#e53e3e', fontWeight: '600', fontSize: '11px', backgroundColor: '#fff5f5', padding: '4px 8px', borderRadius: '6px', display: 'inline-block'}}>{disabledReason}</span>
                          )
                        ) : (
                          <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                            <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px'}}>
                              <input type="radio" name={`vote-${m.id}`} value={m.home_team} checked={votes[m.id]?.team === m.home_team}
                                onChange={e => { dirtyVotes.current.add(m.id); setVotes({...votes, [m.id]: {...(votes[m.id] || {}), team: e.target.value}}) }}
                                disabled={votingDisabled} style={{accentColor: '#667eea'}} />
                              <span style={{fontWeight: '500'}}>{m.home_team}</span>
                            </label>
                            <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px'}}>
                              <input type="radio" name={`vote-${m.id}`} value={m.away_team} checked={votes[m.id]?.team === m.away_team}
                                onChange={e => { dirtyVotes.current.add(m.id); setVotes({...votes, [m.id]: {...(votes[m.id] || {}), team: e.target.value}}) }}
                                disabled={votingDisabled} style={{accentColor: '#667eea'}} />
                              <span style={{fontWeight: '500'}}>{m.away_team}</span>
                            </label>
                          </div>
                        )}
                      </td>
                      <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0'}}>
                        {votingDisabled ? (
                          <span style={{color: '#a0aec0', fontSize: '12px'}}>-</span>
                        ) : (
                          <select value={votes[m.id]?.points || ''}
                            onChange={e => { dirtyVotes.current.add(m.id); setVotes({...votes, [m.id]: {...(votes[m.id] || {}), points: e.target.value}}) }}
                            style={{padding: '6px 8px', width: '100%', minWidth: '70px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '500', fontFamily: 'Inter, sans-serif', backgroundColor: 'white', cursor: 'pointer'}}
                            disabled={votingDisabled}>
                            <option value="">Select</option>
                            {POINTS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', textAlign: 'center'}}>
                        {votingDisabled ? (
                          <span style={{fontWeight: '700', fontSize: '15px', color: '#667eea', backgroundColor: '#edf2f7', padding: '4px 12px', borderRadius: '8px', display: 'inline-block'}}>{m.vote_totals && m.vote_totals[m.home_team] ? m.vote_totals[m.home_team] : 0}</span>
                        ) : <span style={{color: '#a0aec0', fontSize: '12px'}}>-</span>}
                      </td>
                      <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', textAlign: 'center'}}>
                        {votingDisabled ? (
                          <span style={{fontWeight: '700', fontSize: '15px', color: '#667eea', backgroundColor: '#edf2f7', padding: '4px 12px', borderRadius: '8px', display: 'inline-block'}}>{m.vote_totals && m.vote_totals[m.away_team] ? m.vote_totals[m.away_team] : 0}</span>
                        ) : <span style={{color: '#a0aec0', fontSize: '12px'}}>-</span>}
                      </td>
                      <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', textAlign: 'center'}}>
                        {m.winner ? (
                          <span style={{color: '#38a169', fontWeight: '700', backgroundColor: '#f0fff4', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', display: 'inline-block', border: '1px solid #c6f6d5'}}>{m.winner}</span>
                        ) : (
                          <span style={{color: '#a0aec0', fontSize: '12px', fontWeight: '600'}}>TBD</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        </>
      )}

      {coinFlip.show && <CoinFlip teamName={coinFlip.team} />}

      {/* ── Sticky Save Bar ── */}
      {user?.role !== 'admin' && !loading && pendingCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: 'rgba(10,20,35,0.96)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          borderTop: '1px solid rgba(46,204,113,0.35)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.32)',
          padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap',
        }}>
          <span style={{fontSize: '13px', color: '#f39c12', fontWeight: '700', fontFamily: 'Inter,sans-serif'}}>
            ⚡ {pendingCount} unsaved pick{pendingCount > 1 ? 's' : ''}
          </span>
          <button
            onClick={submitAllVotes}
            disabled={saving}
            style={{
              padding: '11px 28px',
              background: saving ? 'rgba(46,204,113,0.5)' : 'linear-gradient(135deg,#2ecc71,#27ae60)',
              color: '#fff', border: 'none', borderRadius: '12px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: '800', fontSize: '14px', fontFamily: 'Inter,sans-serif',
              boxShadow: '0 4px 16px rgba(46,204,113,0.45)',
              transition: 'all 0.2s',
            }}
          >
            {saving ? '⏳ Saving…' : `💾 Save All Picks (${pendingCount})`}
          </button>
        </div>
      )}
    </div>
  )
}

