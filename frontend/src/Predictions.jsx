import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from './Toast'

// ── Reusable Glass Card ───────────────────────────────────────────────────────
function GlassCard({ children, style = {} }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,0.65)',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Tile Header (clickable for collapsible sections) ──────────────────────────
function TileHeader({ icon, title, accent, badge, expanded, onToggle, collapsible = false, selectedPreview }) {
  return (
    <div
      onClick={collapsible ? onToggle : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '14px 16px',
        background: `linear-gradient(135deg, ${accent}22 0%, ${accent}10 100%)`,
        borderRadius: expanded || !collapsible ? '12px 12px 0 0' : '12px',
        borderBottom: (expanded || !collapsible) ? `1px solid ${accent}33` : 'none',
        cursor: collapsible ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'all 0.2s',
      }}
    >
      <span style={{ fontSize: '22px' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '800', color: '#1a1a2e', fontFamily: "'Poppins',sans-serif" }}>{title}</div>
        {selectedPreview && (
          <div style={{ fontSize: '11px', color: accent, fontWeight: '700', marginTop: '2px' }}>
            ✓ {selectedPreview}
          </div>
        )}
      </div>
      {badge && (
        <span style={{
          fontSize: '11px', fontWeight: '700', color: 'white',
          background: accent, padding: '3px 10px', borderRadius: '20px',
          letterSpacing: '0.4px',
        }}>{badge}</span>
      )}
      {collapsible && (
        <span style={{
          fontSize: '18px', color: accent, fontWeight: '900',
          transition: 'transform 0.25s', display: 'inline-block',
          transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
        }}>▾</span>
      )}
    </div>
  )
}

// ── Radio Option ──────────────────────────────────────────────────────────────
function RadioOption({ label, sublabel, selected, locked, accent = '#2ecc71', onClick }) {
  return (
    <div
      onClick={locked ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '11px 14px',
        background: selected ? `${accent}18` : 'rgba(0,0,0,0.03)',
        border: `2px solid ${selected ? accent : 'rgba(0,0,0,0.08)'}`,
        borderRadius: '10px',
        cursor: locked ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        opacity: locked ? 0.55 : 1,
      }}
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
        border: `2.5px solid ${selected ? accent : '#ccc'}`,
        background: selected ? accent : 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: selected ? `0 0 0 3px ${accent}33` : 'none',
        transition: 'all 0.2s',
      }}>
        {selected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{sublabel}</div>}
      </div>
    </div>
  )
}

// ── Points Selector ───────────────────────────────────────────────────────────
function PointsSelector({ value, onChange, locked, accent = '#2ecc71' }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
      <span style={{ fontSize: '11px', fontWeight: '700', color: '#888', alignSelf: 'center', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Points:</span>
      {[10, 20, 50].map(p => (
        <button
          key={p}
          onClick={() => !locked && onChange(p)}
          disabled={locked}
          style={{
            padding: '6px 16px',
            background: p === value ? `linear-gradient(135deg,${accent},${accent}cc)` : 'rgba(0,0,0,0.05)',
            color: p === value ? '#fff' : '#555',
            borderRadius: '20px', fontWeight: '800', fontSize: '12px',
            cursor: locked ? 'not-allowed' : 'pointer',
            border: `1.5px solid ${p === value ? accent : 'rgba(0,0,0,0.08)'}`,
            boxShadow: p === value ? `0 3px 10px ${accent}55` : 'none',
            transition: 'all 0.2s',
            opacity: locked ? 0.5 : 1,
          }}
        >{p} pts</button>
      ))}
    </div>
  )
}

// ── Locked Tag ────────────────────────────────────────────────────────────────
function LockedTag() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: '700', color: '#e74c3c',
      background: 'rgba(231,76,60,0.10)', border: '1px solid rgba(231,76,60,0.25)',
      padding: '3px 10px', borderRadius: '20px',
    }}>🔒 Locked</span>
  )
}

// ── Player Card ───────────────────────────────────────────────────────────────
function PlayerCard({ player, selected, locked, accent, onClick }) {
  const playerKey = typeof player === 'string' ? player : player.name
  const playerObj = typeof player === 'object' ? player : { name: player }
  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      title={playerKey}
      style={{
        padding: 0,
        border: selected ? `3px solid ${accent}` : '2px solid rgba(0,0,0,0.1)',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.92)',
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.6 : 1,
        overflow: 'hidden',
        transition: 'all 0.2s',
        boxShadow: selected ? `0 4px 12px ${accent}55` : 'none',
        display: 'flex', flexDirection: 'column', textAlign: 'center',
        transform: selected ? 'scale(1.04)' : 'scale(1)',
      }}
    >
      {(playerObj.imageUrl || playerObj.playerImg) ? (
        <img
          src={playerObj.imageUrl || playerObj.playerImg}
          alt={playerKey}
          style={{ width: '100%', height: '65px', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none' }}
        />
      ) : (
        <div style={{
          width: '100%', height: '55px',
          background: selected
            ? `linear-gradient(135deg, ${accent}, ${accent}99)`
            : 'linear-gradient(135deg, #667eea22, #764ba222)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px',
        }}>👤</div>
      )}
      <div style={{
        padding: '5px 4px',
        fontWeight: selected ? '700' : '600',
        fontSize: '9px',
        color: selected ? accent : '#1a1a1a',
        wordBreak: 'break-word', lineHeight: '1.2',
      }}>
        {playerKey}
      </div>
    </button>
  )
}

// ── Odds Display ──────────────────────────────────────────────────────────────
function OddsDisplay({ odds, accent }) {
  if (!odds || Object.keys(odds).length === 0) {
    return (
      <div style={{
        marginTop: '10px', padding: '8px 12px',
        background: 'rgba(0,0,0,0.03)', borderRadius: '8px',
        fontSize: '11px', color: '#888', textAlign: 'center'
      }}>
        No predictions yet
      </div>
    )
  }

  const total = Object.values(odds).reduce((sum, pts) => sum + pts, 0)
  const sortedEntries = Object.entries(odds).sort((a, b) => b[1] - a[1])

  return (
    <div style={{
      marginTop: '10px', padding: '10px',
      background: `${accent}08`, borderRadius: '8px',
      border: `1px solid ${accent}22`
    }}>
      <div style={{
        fontSize: '10px', fontWeight: '700', color: '#888',
        textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px'
      }}>📊 Current Odds</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {sortedEntries.map(([choice, points]) => {
          const percentage = total > 0 ? ((points / total) * 100).toFixed(1) : 0
          return (
            <div key={choice} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
              <div style={{ flex: 1, fontWeight: '600', color: '#1a1a1a' }}>{choice}</div>
              <div style={{ width: '80px', height: '16px', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${percentage}%`, background: `linear-gradient(90deg, ${accent}, ${accent}cc)`, transition: 'width 0.3s' }} />
              </div>
              <div style={{ width: '50px', textAlign: 'right', fontWeight: '700', color: accent }}>{percentage}%</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Predictions({ user, refreshTrigger }) {
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [upcomingMatches, setUpcomingMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('predict')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [playerOptionsByMatch, setPlayerOptionsByMatch] = useState({})
  // Per-match, per-tile expand state: { [matchId]: { mom: bool, bowler: bool } }
  const [expandedTiles, setExpandedTiles] = useState({})
  // Per-prediction points: { [matchId]: { toss: 10, mom: 10, bowler: 10 } }
  const [predPoints, setPredPoints] = useState({})
  const [oddsData, setOddsData] = useState({})

  useEffect(() => { fetchSeasons() }, [refreshTrigger])

  useEffect(() => {
    if (activeTab === 'predict') fetchUpcomingMatches()
    else fetchHistory()
  }, [activeTab, selectedSeason])

  async function fetchSeasons() {
    try {
      const r = await axios.get('/api/seasons', { headers: { 'x-user': user?.username } })
      setSeasons(r.data)
      if (!selectedSeason) setSelectedSeason('')
    } catch (e) { console.error('Error fetching seasons:', e) }
  }

  async function fetchUpcomingMatches() {
    try {
      setLoading(true)
      const r = await axios.get('/api/predictions/upcoming', {
        params: selectedSeason ? { season_id: selectedSeason } : {},
        headers: { 'x-user': user?.username }
      })
      setUpcomingMatches(r.data)

      const predResults = await Promise.all(
        r.data.map(m =>
          axios.get(`/api/predictions/${m.id}`, { headers: { 'x-user': user?.username } }).catch(() => ({ data: null }))
        )
      )
      const predMap = {}
      r.data.forEach((m, idx) => { if (predResults[idx]?.data) predMap[m.id] = predResults[idx].data })
      setPredictions(predMap)

      const savedPointsMap = {}
      Object.entries(predMap).forEach(([matchId, p]) => {
        savedPointsMap[matchId] = {
          toss: Number(p.toss_points) || 10,
          mom: Number(p.mom_points) || 10,
          bowler: Number(p.bowler_points) || 10,
        }
      })
      setPredPoints(savedPointsMap)

      const playerResults = await Promise.all(
        r.data.map(async m => {
          try {
            const pr = await axios.get(`/api/predictions/players-by-season/${m.season_id}`, {
              params: { team1: m.home_team, team2: m.away_team },
              headers: { 'x-user': user?.username }
            })
            return { matchId: m.id, players: Array.isArray(pr.data?.players) ? pr.data.players : [], teamSquads: pr.data?.teamSquads || {} }
          } catch { return { matchId: m.id, players: [], teamSquads: {} } }
        })
      )
      const playerMap = {}
      playerResults.forEach(item => { playerMap[item.matchId] = { players: item.players, teamSquads: item.teamSquads } })
      setPlayerOptionsByMatch(playerMap)

      const oddsResults = await Promise.all(
        r.data.map(async m => {
          try {
            const or = await axios.get(`/api/predictions/odds/${m.id}`, { headers: { 'x-user': user?.username } })
            return { matchId: m.id, odds: or.data }
          } catch { return { matchId: m.id, odds: {} } }
        })
      )
      const oddsMap = {}
      oddsResults.forEach(item => { oddsMap[item.matchId] = item.odds })
      setOddsData(oddsMap)
    } catch (e) { console.error('Error fetching upcoming matches:', e) }
    finally { setLoading(false) }
  }

  async function fetchHistory() {
    try {
      setLoading(true)
      const r = await axios.get('/api/predictions/user-history', {
        params: selectedSeason ? { season_id: selectedSeason } : {},
        headers: { 'x-user': user?.username }
      })
      setHistory(Array.isArray(r.data) ? r.data : [])
    } catch (e) { console.error('Error fetching prediction history:', e) }
    finally { setLoading(false) }
  }

  async function submitPrediction(matchId) {
    const pred = predictions[matchId] || {}
    try {
      await axios.post('/api/predictions', {
        match_id: matchId,
        toss_winner: pred.toss_winner || null,
        man_of_match: pred.man_of_match || null,
        best_bowler: pred.best_bowler || null,
        toss_points: getPredPts(matchId, 'toss'),
        mom_points: getPredPts(matchId, 'mom'),
        bowler_points: getPredPts(matchId, 'bowler'),
      }, { headers: { 'x-user': user?.username } })
      setMessage('✅ Prediction saved!')
      toast('success', 'Prediction Saved', 'Your prediction and points were updated')
      setTimeout(() => setMessage(''), 3000)
      fetchUpcomingMatches()
    } catch (e) {
      const errMsg = e.response?.data?.error || 'Failed to save prediction'
      setMessage(`❌ ${errMsg}`)
      toast('error', 'Prediction Failed', errMsg)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  function updatePrediction(matchId, field, value) {
    setPredictions(prev => ({ ...prev, [matchId]: { ...(prev[matchId] || {}), [field]: value } }))
  }

  function toggleTile(matchId, tile) {
    setExpandedTiles(prev => ({
      ...prev,
      [matchId]: { ...(prev[matchId] || {}), [tile]: !(prev[matchId]?.[tile]) }
    }))
  }

  function isTileExpanded(matchId, tile) {
    return !!(expandedTiles[matchId]?.[tile])
  }

  function setPredPts(matchId, tile, val) {
    setPredPoints(prev => ({ ...prev, [matchId]: { ...(prev[matchId] || {}), [tile]: val } }))
  }

  function getPredPts(matchId, tile) {
    const selected = predPoints[matchId]?.[tile]
    if (selected !== undefined && selected !== null) return Number(selected) || 10

    const saved = predictions[matchId]
    if (!saved) return 10
    if (tile === 'toss') return Number(saved.toss_points) || 10
    if (tile === 'mom') return Number(saved.mom_points) || 10
    if (tile === 'bowler') return Number(saved.bowler_points) || 10
    return 10
  }

  function parseMatchDateTime(value) {
    if (!value) return null
    const direct = new Date(value)
    if (!Number.isNaN(direct.getTime())) return direct
    const monthMap = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 }
    const parts = String(value).split('T')
    if (parts.length < 2) return null
    const [datePart, timePartRaw] = parts
    let year, monthIndex, day
    const isoDate = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (isoDate) {
      year = parseInt(isoDate[1], 10); monthIndex = parseInt(isoDate[2], 10) - 1; day = parseInt(isoDate[3], 10)
    } else {
      const dmy = datePart.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/)
      if (!dmy) return null
      day = parseInt(dmy[1], 10)
      const mKey = dmy[2].toLowerCase()
      if (monthMap[mKey] === undefined) return null
      monthIndex = monthMap[mKey]
      const yr = dmy[3]; year = yr.length === 2 ? 2000 + parseInt(yr, 10) : parseInt(yr, 10)
    }
    const tm = timePartRaw.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
    if (!tm) return null
    let hour = parseInt(tm[1], 10); const min = parseInt(tm[2], 10); const ap = tm[3] ? tm[3].toUpperCase() : null
    if (ap) { if (hour === 12) hour = 0; if (ap === 'PM') hour += 12 }
    return new Date(year, monthIndex, day, hour, min, 0, 0)
  }

  function formatDT(value) {
    if (!value) return 'TBD'
    const d = parseMatchDateTime(value)
    if (!d || Number.isNaN(d.getTime())) return value
    const dd = String(d.getDate()).padStart(2,'0')
    const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]
    let h = d.getHours()
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    const min = String(d.getMinutes()).padStart(2,'0')
    return `${dd}-${mon}-${d.getFullYear()} | ${h}:${min} ${ampm}`
  }

  function isPredictionOpen(scheduledAt) {
    const mt = parseMatchDateTime(scheduledAt)
    if (!mt || Number.isNaN(mt.getTime())) return false
    // Close predictions 30 minutes before match start (same as team voting)
    return new Date() < new Date(mt.getTime() - 60 * 60 * 1000)
  }

  function getAccuracyScore(pred) {
    let correct = 0, total = 0
    if (pred.actual_toss) { total++; if (pred.toss_winner === pred.actual_toss) correct++ }
    if (pred.actual_mom) { total++; if (pred.man_of_match === pred.actual_mom) correct++ }
    if (pred.actual_bowler) { total++; if (pred.best_bowler === pred.actual_bowler) correct++ }
    return total > 0 ? `${correct}/${total}` : 'N/A'
  }

  // Split players by team for a match
  function getTeamPlayers(matchId, team) {
    const data = playerOptionsByMatch[matchId]
    if (!data) return []
    const { players, teamSquads } = data
    
    // If teamSquads is available and has teams, try to find the matching team
    if (teamSquads && Object.keys(teamSquads).length > 0) {
      const normalize = n => String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const teamNorm = normalize(team)
      
      // First try exact match
      for (const [tName, tPlayers] of Object.entries(teamSquads)) {
        const tNorm = normalize(tName)
        if (tNorm === teamNorm) return tPlayers
      }
      
      // Then try partial match
      for (const [tName, tPlayers] of Object.entries(teamSquads)) {
        const tNorm = normalize(tName)
        if (tNorm.includes(teamNorm) || teamNorm.includes(tNorm)) return tPlayers
      }
      
      // No match found - squad data not available for this team yet
      console.log(`Squad data not available for ${team}`)
      return []
    }
    
    // No squad data at all - return empty
    return []
  }

  const safeHistory = Array.isArray(history) ? history : []

  return (
    <div style={{ padding: '20px', minHeight: '100vh' }}>

      {/* Page Header */}
      <div style={{ marginBottom: '20px' }}>
        <SectionPill icon="🔮" title="Match Predictions" subtitle="Predict toss, man of match & best bowler" gradient="linear-gradient(135deg,#667eea,#764ba2)" />
      </div>

      {/* Info Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
        border: '1px solid #9c27b0',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(156, 39, 176, 0.15)'
      }}>
        <div style={{ fontSize: '24px' }}>ℹ️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', fontSize: '14px', color: '#6a1b9a', marginBottom: '4px' }}>
            For Fun Only
          </div>
          <div style={{ fontSize: '12px', color: '#7b1fa2', lineHeight: '1.5', marginBottom: '6px' }}>
            Prediction points are for entertainment and do not affect your standings or balance. Only match winner votes count toward your rankings.
          </div>
          <div style={{ fontSize: '12px', color: '#7b1fa2', lineHeight: '1.5' }}>
            📅 Showing matches for the <strong>next 2 days</strong> (or next 2 upcoming matches if none available)
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '6px', marginBottom: '18px',
        background: 'rgba(10,20,35,0.75)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '14px', padding: '6px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      }}>
        {[['predict','🔮 Predict'],['history','📜 History']].map(([tab, label]) => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, height: '40px',
              background: activeTab === tab ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'transparent',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.55)',
              fontWeight: '700', cursor: 'pointer', fontSize: '13px', transition: 'all 0.25s ease',
              boxShadow: activeTab === tab ? '0 4px 12px rgba(102,126,234,0.4)' : 'none',
            }}
          >{label}</div>
        ))}
      </div>

      {/* Season filter */}
      {seasons.length > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>Season:</label>
          <select
            value={selectedSeason}
            onChange={e => setSelectedSeason(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '20px', border: '1px solid #ddd', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">All Seasons</option>
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {message && (
        <div style={{
          padding: '12px 18px', borderRadius: '10px', marginBottom: '16px',
          backgroundColor: message.includes('✅') ? '#e8f5e9' : '#ffebee',
          color: message.includes('✅') ? '#2e7d32' : '#c62828',
          border: `1px solid ${message.includes('✅') ? '#66bb6a' : '#ef5350'}`,
          fontSize: '14px',
        }}>{message}</div>
      )}

      {/* ── PREDICT TAB ── */}
      {activeTab === 'predict' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#667eea', fontSize: '14px' }}>⏳ Loading matches...</div>
          ) : upcomingMatches.length === 0 ? (
            <GlassCard style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏏</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#444' }}>No upcoming matches</div>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>Check back later or try a different season</div>
            </GlassCard>
          ) : (
            upcomingMatches.map(match => {
              const pred = predictions[match.id] || {}
              const isOpen = isPredictionOpen(match.scheduled_at)
              const momExpanded = isTileExpanded(match.id, 'mom')
              const bowlerExpanded = isTileExpanded(match.id, 'bowler')
              const homeTeamPlayers = getTeamPlayers(match.id, match.home_team)
              const awayTeamPlayers = getTeamPlayers(match.id, match.away_team)
              const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers]

              return (
                <GlassCard key={match.id} style={{ marginBottom: '20px', overflow: 'hidden' }}>
                  {/* Match Header */}
                  <div style={{
                    padding: '16px 18px',
                    background: 'linear-gradient(135deg, #1f2d4a 0%, #2d3b5f 100%)',
                    color: 'white',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px',
                  }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: "'Poppins',sans-serif" }}>
                        {match.home_team} <span style={{ opacity: 0.6, fontWeight: '400', fontSize: '16px' }}>vs</span> {match.away_team}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '4px' }}>
                        {match.season_name} · {formatDT(match.scheduled_at)}
                      </div>
                    </div>
                    {!isOpen ? <LockedTag /> : (
                      <span style={{
                        fontSize: '11px', fontWeight: '700', color: '#2ecc71',
                        background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.3)',
                        padding: '4px 12px', borderRadius: '20px',
                      }}>🟢 Open</span>
                    )}
                  </div>

                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    {/* ─── TILE 1: TOSS WINNER ─── */}
                    <GlassCard style={{ overflow: 'hidden', border: '1px solid #667eea33' }}>
                      <TileHeader
                        icon="🎯"
                        title="Toss Winner"
                        accent="#667eea"
                        badge={pred.toss_winner ? undefined : isOpen ? 'Required' : undefined}
                        selectedPreview={pred.toss_winner || null}
                      />
                      <div style={{ padding: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <RadioOption
                            label={match.home_team}
                            selected={pred.toss_winner === match.home_team}
                            locked={!isOpen}
                            accent="#667eea"
                            onClick={() => updatePrediction(match.id, 'toss_winner', match.home_team)}
                          />
                          <RadioOption
                            label={match.away_team}
                            selected={pred.toss_winner === match.away_team}
                            locked={!isOpen}
                            accent="#764ba2"
                            onClick={() => updatePrediction(match.id, 'toss_winner', match.away_team)}
                          />
                        </div>
                        <PointsSelector
                          value={getPredPts(match.id, 'toss')}
                          onChange={v => setPredPts(match.id, 'toss', v)}
                          locked={!isOpen}
                          accent="#667eea"
                        />
                        <OddsDisplay odds={oddsData[match.id]?.toss || {}} accent="#667eea" />
                      </div>
                    </GlassCard>

                    {/* ─── TILE 2: MAN OF THE MATCH (COLLAPSIBLE) ─── */}
                    <GlassCard style={{ overflow: 'hidden', border: '1px solid #f39c1233' }}>
                      <TileHeader
                        icon="⭐"
                        title="Man of the Match"
                        accent="#f39c12"
                        collapsible
                        expanded={momExpanded}
                        onToggle={() => toggleTile(match.id, 'mom')}
                        selectedPreview={pred.man_of_match || null}
                        badge={!momExpanded && !pred.man_of_match ? 'Tap to pick' : undefined}
                      />
                      {momExpanded && (
                        <div style={{ padding: '14px' }}>
                          {allPlayers.length > 0 ? (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                {[[match.home_team, homeTeamPlayers], [match.away_team, awayTeamPlayers]].map(([team, teamPlayers]) => (
                                  <div key={`mom-${match.id}-${team}`}>
                                    <div style={{
                                      background: 'linear-gradient(135deg, #2d3b5f 0%, #3d4b7f 100%)',
                                      color: 'white', padding: '8px 12px',
                                      borderRadius: '8px 8px 0 0', fontWeight: '700', fontSize: '12px',
                                    }}>{team}</div>
                                    <div style={{
                                      background: 'rgba(255,255,255,0.5)', padding: '10px',
                                      borderRadius: '0 0 8px 8px',
                                      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px',
                                    }}>
                                      {(teamPlayers.length > 0 ? teamPlayers : allPlayers.slice(0, 6)).map(player => {
                                        const pk = typeof player === 'string' ? player : player.name
                                        return (
                                          <PlayerCard
                                            key={`mom-${match.id}-${pk}`}
                                            player={player}
                                            selected={pred.man_of_match === pk}
                                            locked={!isOpen}
                                            accent="#f39c12"
                                            onClick={() => updatePrediction(match.id, 'man_of_match', pk)}
                                          />
                                        )
                                      })}
                                      <PlayerCard
                                        player={{ name: 'Other' }}
                                        selected={pred.man_of_match === 'Other'}
                                        locked={!isOpen}
                                        accent="#f39c12"
                                        onClick={() => updatePrediction(match.id, 'man_of_match', 'Other')}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '20px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                              No squad data available
                            </div>
                          )}
                          <PointsSelector
                            value={getPredPts(match.id, 'mom')}
                            onChange={v => setPredPts(match.id, 'mom', v)}
                            locked={!isOpen}
                            accent="#f39c12"
                          />
                          <OddsDisplay odds={oddsData[match.id]?.mom || {}} accent="#f39c12" />
                        </div>
                      )}
                    </GlassCard>

                    {/* ─── TILE 3: BEST BOWLER (COLLAPSIBLE) ─── */}
                    <GlassCard style={{ overflow: 'hidden', border: '1px solid #e74c3c33' }}>
                      <TileHeader
                        icon="🎳"
                        title="Best Bowler"
                        accent="#e74c3c"
                        collapsible
                        expanded={bowlerExpanded}
                        onToggle={() => toggleTile(match.id, 'bowler')}
                        selectedPreview={pred.best_bowler || null}
                        badge={!bowlerExpanded && !pred.best_bowler ? 'Tap to pick' : undefined}
                      />
                      {bowlerExpanded && (
                        <div style={{ padding: '14px' }}>
                          {allPlayers.length > 0 ? (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                {[[match.home_team, homeTeamPlayers], [match.away_team, awayTeamPlayers]].map(([team, teamPlayers]) => (
                                  <div key={`bowl-${match.id}-${team}`}>
                                    <div style={{
                                      background: 'linear-gradient(135deg, #2d3b5f 0%, #3d4b7f 100%)',
                                      color: 'white', padding: '8px 12px',
                                      borderRadius: '8px 8px 0 0', fontWeight: '700', fontSize: '12px',
                                    }}>{team}</div>
                                    <div style={{
                                      background: 'rgba(255,255,255,0.5)', padding: '10px',
                                      borderRadius: '0 0 8px 8px',
                                      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px',
                                    }}>
                                      {(teamPlayers.length > 0 ? teamPlayers : allPlayers.slice(0, 6)).map(player => {
                                        const pk = typeof player === 'string' ? player : player.name
                                        return (
                                          <PlayerCard
                                            key={`bowl-${match.id}-${pk}`}
                                            player={player}
                                            selected={pred.best_bowler === pk}
                                            locked={!isOpen}
                                            accent="#e74c3c"
                                            onClick={() => updatePrediction(match.id, 'best_bowler', pk)}
                                          />
                                        )
                                      })}
                                      <PlayerCard
                                        player={{ name: 'Other' }}
                                        selected={pred.best_bowler === 'Other'}
                                        locked={!isOpen}
                                        accent="#e74c3c"
                                        onClick={() => updatePrediction(match.id, 'best_bowler', 'Other')}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '20px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                              No squad data available
                            </div>
                          )}
                          <PointsSelector
                            value={getPredPts(match.id, 'bowler')}
                            onChange={v => setPredPts(match.id, 'bowler', v)}
                            locked={!isOpen}
                            accent="#e74c3c"
                          />
                          <OddsDisplay odds={oddsData[match.id]?.bowler || {}} accent="#e74c3c" />
                        </div>
                      )}
                    </GlassCard>

                    {/* ─── SUBMIT ─── */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      {isOpen ? (
                        <button
                          onClick={() => submitPrediction(match.id)}
                          style={{
                            padding: '11px 30px',
                            background: 'linear-gradient(135deg,#28a745,#218838)',
                            color: 'white', border: 'none', borderRadius: '24px',
                            fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(40,167,69,0.3)',
                            letterSpacing: '0.3px',
                          }}
                          onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                          onMouseOut={e => e.currentTarget.style.opacity = '1'}
                        >
                          {pred.id ? '✏️ Update Prediction' : '🚀 Submit Prediction'}
                        </button>
                      ) : (
                        <div style={{
                          padding: '11px 22px', background: '#e9ecef',
                          color: '#6c757d', borderRadius: '24px',
                          fontSize: '13px', fontWeight: '600',
                        }}>🔒 Predictions locked</div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              )
            })
          )}
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#667eea' }}>⏳ Loading...</div>
          ) : safeHistory.length === 0 ? (
            <GlassCard style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#444' }}>No prediction history</div>
            </GlassCard>
          ) : (
            <div style={{
              overflowX: 'auto', backgroundColor: 'white',
              borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid #e8e8e8',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                    {['Match', 'Toss', 'Man of Match', 'Best Bowler', 'Score'].map(h => (
                      <th key={h} style={{ padding: '14px 12px', textAlign: h === 'Score' ? 'center' : 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {safeHistory.map((h, idx) => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: idx % 2 === 0 ? '#fafbfc' : 'white' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <strong style={{ fontSize: '13px' }}>{h.home_team} vs {h.away_team}</strong>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{h.season_name}</div>
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: '13px' }}>
                        {h.toss_winner || '-'}
                        {h.actual_toss && (
                          <div style={{ fontSize: '10px', color: h.toss_winner === h.actual_toss ? '#2e7d32' : '#c62828', marginTop: '2px' }}>
                            {h.toss_winner === h.actual_toss ? '✅' : '❌'} {h.actual_toss}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: '13px' }}>
                        {h.man_of_match || '-'}
                        {h.actual_mom && (
                          <div style={{ fontSize: '10px', color: h.man_of_match === h.actual_mom ? '#2e7d32' : '#c62828', marginTop: '2px' }}>
                            {h.man_of_match === h.actual_mom ? '✅' : '❌'} {h.actual_mom}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: '13px' }}>
                        {h.best_bowler || '-'}
                        {h.actual_bowler && (
                          <div style={{ fontSize: '10px', color: h.best_bowler === h.actual_bowler ? '#2e7d32' : '#c62828', marginTop: '2px' }}>
                            {h.best_bowler === h.actual_bowler ? '✅' : '❌'} {h.actual_bowler}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: '700', fontSize: '14px' }}>
                        {getAccuracyScore(h)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Section Pill (reused from other components) ───────────────────────────────
function SectionPill({ icon, title, subtitle, gradient }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '12px',
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,0.72)',
      borderRadius: '14px', padding: '10px 18px 10px 10px',
      boxShadow: '0 3px 16px rgba(0,0,0,0.10)',
    }}>
      <div style={{
        width: '42px', height: '42px', background: gradient,
        borderRadius: '12px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '20px', flexShrink: 0,
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: '18px', fontWeight: '800', color: '#1a1a1a', fontFamily: "'Poppins',sans-serif", lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#444', fontWeight: '600', marginTop: '3px' }}>{subtitle}</div>
      </div>
    </div>
  )
}
