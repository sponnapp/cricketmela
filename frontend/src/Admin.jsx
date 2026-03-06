import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Admin({ user, initialTab, onTabChange, addToast, refreshTrigger }) {
  // Create a local toast function that uses the prop
  const toast = (type, title, message, duration) => {
    if (addToast) addToast({ type, title, message, duration })
  }

  const [activeTab, setActiveTab] = useState(initialTab || 'season')

  // Notify parent when tab changes so it can update URL and nav state
  useEffect(() => {
    if (onTabChange) {
      onTabChange(activeTab)
    }
  }, [activeTab, onTabChange])
  const [seasons, setSeasons] = useState([])
  const [matches, setMatches] = useState([])
  const [allMatches, setAllMatches] = useState([])
  const [users, setUsers] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [newSeason, setNewSeason] = useState('')
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'picker', balance: 500, display_name: '', email: '', season_ids: [] })
  const [csvInput, setCsvInput] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('')
  const [winnerModal, setWinnerModal] = useState({show: false, matchId: null, team1: '', team2: '', selectedTeam: ''})
  const [editModal, setEditModal] = useState({show: false, match: null, formData: {}})
  const [editUserModal, setEditUserModal] = useState({show: false, user: null, formData: {}, assignedSeasons: [], authMethod: null, seasonBalances: {}})
  const [passwordResetModal, setPasswordResetModal] = useState({show: false, userId: null, username: '', newPassword: ''})
  const [approveUserModal, setApproveUserModal] = useState({show: false, user: null, formData: {balance: 1000}, selectedSeasons: []})
  const [editSeasonModal, setEditSeasonModal] = useState({show: false, season: null, formData: {}})
  const [emailSettings, setEmailSettings] = useState({ user: '', password: '', from: '' })
  const [emailMessage, setEmailMessage] = useState('')
  const [cricApiModal, setCricApiModal] = useState({
    show: false,
    step: 'series', // 'series' | 'matches' | 'importing'
    loading: false,
    error: '',
    searchQuery: '',
    seriesList: [],
    selectedSeries: null,
    matchesList: [],
    selectedMatches: [], // set of match ids or indices
    seasonName: ''
  })

  useEffect(() => {
    fetchSeasons()
    fetchUsers()
    fetchPendingUsers()
    fetchAllMatches()
    fetchEmailSettings()
  }, [refreshTrigger])

  async function fetchSeasons() {
    const r = await axios.get('/api/seasons', {
      headers: { 'x-user': user?.username || 'admin' }
    })
    setSeasons(r.data)
    if (r.data.length && !selectedSeason) setSelectedSeason(r.data[0].id)
  }

  async function fetchUsers() {
    try {
      const r = await axios.get('/api/admin/users', {
        headers: { 'x-user': user?.username || 'admin' }
      })
      setUsers(r.data)
    } catch (e) {
      console.log('Error fetching users:', e)
    }
  }

  async function fetchPendingUsers() {
    try {
      const r = await axios.get('/api/admin/pending-users', {
        headers: { 'x-user': user?.username || 'admin' }
      })
      setPendingUsers(r.data || [])
    } catch (e) {
      console.log('Error fetching pending users:', e)
    }
  }

  async function fetchMatches(sId) {
    if (!sId) return
    const r = await axios.get(`/api/seasons/${sId}/matches`)
    // Sort matches by date and time
    const sortedMatches = sortMatchesByDateTime(r.data)
    setMatches(sortedMatches)
  }

  // Helper function to parse match date/time for sorting
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

  // Sort matches by date and time
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

  async function fetchAllMatches() {
    try {
      const r = await axios.get('/api/matches', {
        headers: { 'x-user': user?.username || 'admin' }
      })
      // Sort matches by date and time
      const sortedMatches = sortMatchesByDateTime(r.data || [])
      setAllMatches(sortedMatches)
    } catch (e) {
      console.log('Error fetching all matches:', e)
    }
  }

  async function fetchEmailSettings() {
    try {
      const r = await axios.get('/api/admin/email-settings', {
        headers: { 'x-user': user?.username || 'admin' }
      })
      setEmailSettings(r.data)
    } catch (e) {
      console.log('Error fetching email settings:', e)
    }
  }

  // ── CricAPI Functions ─────────────────────────────────────────────────────

  function openCricApiModal() {
    setCricApiModal({
      show: true, step: 'series', loading: false, error: '',
      searchQuery: '', seriesList: [], selectedSeries: null,
      matchesList: [], selectedMatches: [], seasonName: ''
    })
  }

  async function fetchCricApiSeries(searchQuery = '') {
    setCricApiModal(prev => ({...prev, loading: true, error: ''}))
    try {
      const r = await axios.get(`/api/admin/cricapi/series?search=${encodeURIComponent(searchQuery)}`, {
        headers: { 'x-user': user?.username || 'admin' }
      })
      setCricApiModal(prev => ({...prev, loading: false, seriesList: r.data.series || [], step: 'series'}))
    } catch (e) {
      setCricApiModal(prev => ({...prev, loading: false, error: e.response?.data?.error || 'Failed to fetch series'}))
    }
  }

  async function fetchCricApiMatches(series) {
    setCricApiModal(prev => ({
      ...prev,
      loading: true,
      error: '',
      selectedSeries: series,
      seasonName: series.name || series.title || '',
      step: 'matches',
      matchesList: [],
      selectedMatches: []
    }))
    try {
      const r = await axios.get(`/api/admin/cricapi/series/${encodeURIComponent(series.id)}/matches`, {
        headers: { 'x-user': user?.username || 'admin' }
      })
      const rawMatches = r.data.matches || []
      const mapped = rawMatches.map((m, idx) => {
        const teams = m.teams || []
        const home_team = teams[0] || 'TBD'
        const away_team = teams[1] || 'TBD'
        const scheduled_at = m.dateTimeGMT || m.date || ''
        return {
          _idx: idx,
          _id: m.id,
          home_team,
          away_team,
          venue: m.venue || '',
          scheduled_at,
          matchType: m.matchType || '',
          name: m.name || `${home_team} vs ${away_team}`
        }
      })
      const allIdxs = mapped.map(m => m._idx)
      setCricApiModal(prev => ({...prev, loading: false, matchesList: mapped, selectedMatches: allIdxs}))
    } catch (e) {
      setCricApiModal(prev => ({
        ...prev,
        loading: false,
        error: e.response?.data?.error || 'Failed to fetch matches for this series'
      }))
    }
  }

  async function importCricApiSeason() {
    const { seasonName, matchesList, selectedMatches } = cricApiModal
    if (!seasonName.trim()) {
      setCricApiModal(prev => ({...prev, error: 'Please enter a season name'}))
      return
    }
    if (selectedMatches.length === 0) {
      setCricApiModal(prev => ({...prev, error: 'Please select at least one match'}))
      return
    }
    setCricApiModal(prev => ({...prev, step: 'importing', loading: true, error: ''}))
    const matchesToImport = matchesList
      .filter(m => selectedMatches.includes(m._idx))
      .map(m => ({
        home_team: m.home_team,
        away_team: m.away_team,
        venue: m.venue,
        scheduled_at: m.scheduled_at
      }))
    try {
      const r = await axios.post('/api/admin/cricapi/import-season',
        { seasonName: seasonName.trim(), matches: matchesToImport },
        { headers: { 'x-user': user?.username || 'admin' } }
      )
      setCricApiModal(prev => ({...prev, show: false, loading: false}))
      fetchSeasons()
      fetchAllMatches()
      alert(`✅ Season "${seasonName}" created with ${r.data.inserted} match(es) imported successfully!`)
    } catch (e) {
      setCricApiModal(prev => ({
        ...prev,
        step: 'matches',
        loading: false,
        error: e.response?.data?.error || 'Failed to import season'
      }))
    }
  }

  async function saveEmailSettings() {
    if (!emailSettings.user || !emailSettings.password) {
      return setEmailMessage('Email user and password are required')
    }
    try {
      setEmailMessage('Saving and testing email configuration...')
      const r = await axios.post('/api/admin/email-settings', emailSettings, {
        headers: { 'x-user': user?.username || 'admin' }
      })
      // The backend endpoint already tests the configuration
      setEmailMessage('✅ ' + r.data.message)
      // Clear message after 5 seconds
      setTimeout(() => setEmailMessage(''), 5000)
    } catch (e) {
      setEmailMessage(`❌ ${e.response?.data?.message || e.response?.data?.error || e.message}`)
    }
  }

  useEffect(() => { if (selectedSeason) fetchMatches(selectedSeason) }, [selectedSeason, refreshTrigger])

  async function addSeason() {
    if (!newSeason) return toast('warning', 'Missing Input', 'Enter season name')
    try {
      await axios.post('/api/admin/seasons', { name: newSeason }, {
        headers: { 'x-user': user?.username || 'admin' }
      })
      setNewSeason('')
      fetchSeasons()
      toast('success', 'Success', 'Season created successfully')
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Failed to create season')
    }
  }

  async function approveUser(userId) {
    const balanceStr = window.prompt('Enter starting points for this user', '500')
    if (balanceStr === null) return
    const balance = parseInt(balanceStr)
    if (Number.isNaN(balance)) {
      toast('error', 'Error', 'Invalid balance')
      return
    }
    try {
      await axios.post(`/api/admin/users/${userId}/approve`, { balance }, {
        headers: { 'x-user': user?.username || 'admin' }
      })
      fetchUsers()
      toast('success', 'Success', 'User approved')
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Failed to approve user')
    }
  }

  async function createUser() {
    if (!newUser.username) return toast('warning', 'Missing Input', 'Enter username')
    if (!newUser.password) return toast('warning', 'Missing Input', 'Enter password')
    if (!newUser.display_name) return toast('warning', 'Missing Input', 'Enter display name')
    try {
      await axios.post('/api/admin/users', newUser, {
        headers: { 'x-user': user?.username || 'admin' }
      })
      setNewUser({ username: '', password: '', role: 'picker', balance: 500, display_name: '', email: '', season_ids: [] })
      fetchUsers()
      toast('success', 'Success', 'User created successfully')
    } catch (e) {
    }
  }

  async function editUser(userObj) {
    try {
      // Fetch user's assigned seasons
      const seasonsRes = await axios.get(`/api/admin/users/${userObj.id}/seasons`, {
        headers: { 'x-user': user?.username || 'admin' }
      })

      // Fetch user's authentication method
      const authRes = await axios.get(`/api/users/${userObj.id}/auth-method`, {
        headers: { 'x-user': user?.username || 'admin' }
      })

      setEditUserModal({
        show: true,
        user: userObj,
        formData: {
          username: userObj.username,
          role: userObj.role,
          balance: userObj.balance,
          email: userObj.email || 'xyz@xyz.com'
        },
        assignedSeasons: seasonsRes.data || [],
        authMethod: authRes.data || null
      })
    } catch (e) {
      console.error('Error loading user data:', e)
      setEditUserModal({
        show: true,
        user: userObj,
        formData: {
          username: userObj.username,
          role: userObj.role,
          balance: userObj.balance,
          email: userObj.email || 'xyz@xyz.com'
        },
        assignedSeasons: [],
        authMethod: null
      })
    }
  }

  async function submitEditUser() {
    try {
      // Update user details
      await axios.put(`/api/admin/users/${editUserModal.user.id}`,
        editUserModal.formData,
        { headers: { 'x-user': user?.username || 'admin' } }
      )
      // Update season assignments
      await axios.put(`/api/admin/users/${editUserModal.user.id}/seasons`,
        { season_ids: editUserModal.assignedSeasons },
        { headers: { 'x-user': user?.username || 'admin' } }
      )
      toast('success', 'Success', 'User updated successfully')
      setEditUserModal({show: false, user: null, formData: {}, assignedSeasons: []})
      fetchUsers()
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Failed to update user')
    }
  }

  async function deleteUser(userId, username) {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone and will also delete all their votes.`)) {
      return
    }
    try {
      await axios.delete(`/api/admin/users/${userId}`,
        { headers: { 'x-user': user?.username || 'admin' } }
      )
      toast('success', 'Success', 'User deleted successfully')
      fetchUsers()
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Failed to delete user')
    }
  }

  function openPasswordResetModal(userId, username) {
    setPasswordResetModal({show: true, userId: userId, username: username, newPassword: ''})
  }

  async function submitPasswordReset() {
    if (!passwordResetModal.newPassword) return toast('warning', 'Missing Input', 'Enter new password')
    try {
      await axios.put(`/api/admin/users/${passwordResetModal.userId}/password`,
        { newPassword: passwordResetModal.newPassword },
        { headers: { 'x-user': user?.username || 'admin' } }
      )
      toast('success', 'Success', 'Password reset successfully. User can login with the new password.')
      setPasswordResetModal({show: false, userId: null, username: '', newPassword: ''})
      fetchUsers()
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Failed to reset password')
    }
  }

  function openApproveUserModal(pendingUser) {
    setApproveUserModal({show: true, user: pendingUser, formData: {balance: 1000}, selectedSeasons: []})
  }

  async function submitApproveUser() {
    try {
      const userId = approveUserModal.user.id
      const balance = approveUserModal.formData.balance || 1000

      // Approve the user with the specified balance
      await axios.post(`/api/admin/users/${userId}/approve`, { balance }, {
        headers: { 'x-user': user?.username || 'admin' }
      })

      // Assign seasons to the user
      if (approveUserModal.selectedSeasons.length > 0) {
        await axios.put(`/api/admin/users/${userId}/seasons`,
          { season_ids: approveUserModal.selectedSeasons },
          { headers: { 'x-user': user?.username || 'admin' } }
        )
      }

      toast('success', 'Success', 'User approved successfully')
      setApproveUserModal({show: false, user: null, formData: {balance: 1000}, selectedSeasons: []})
      fetchUsers()
      fetchPendingUsers()
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Failed to approve user')
    }
  }

  async function deleteSeason(seasonId, seasonName) {
    if (!window.confirm(`Are you sure you want to delete "${seasonName}"? This will also delete ALL matches and votes for this season! This action cannot be undone.`)) {
      return
    }
    try {
      await axios.delete(`/api/admin/seasons/${seasonId}`,
        { headers: { 'x-user': user?.username || 'admin' } }
      )
      toast('success', 'Success', 'Season deleted successfully')
      setSelectedSeason('')
      fetchSeasons()
      fetchAllMatches()
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to delete season')
    }
  }

  function editSeason(season) {
    setEditSeasonModal({
      show: true,
      season: season,
      formData: {
        name: season.name
      }
    })
  }

  async function submitEditSeason() {
    if (!editSeasonModal.formData.name) {
      toast('warning', 'Missing Input', 'Season name is required')
      return
    }
    try {
      await axios.put(`/api/admin/seasons/${editSeasonModal.season.id}`,
        { name: editSeasonModal.formData.name },
        { headers: { 'x-user': user?.username || 'admin' } }
      )
      toast('success', 'Success', 'Season updated successfully')
      setEditSeasonModal({show: false, season: null, formData: {}})
      fetchSeasons()
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Failed to update season')
    }
  }

  async function uploadCsv() {
    if (!csvInput || !selectedSeason) return toast('warning', 'Missing Input', 'Paste CSV and select season')
    try {
      const res = await axios.post('/api/admin/upload-matches', { csvData: csvInput, seasonId: selectedSeason }, {
        headers: { 'x-user': user?.username || 'admin' }
      })
      toast('success', 'Success', `Uploaded ${res.data.inserted} matches`)
      setCsvInput('')
      fetchMatches(selectedSeason)
      fetchAllMatches()
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Upload failed')
    }
  }

  async function setWinner(matchId, team1, team2) {
    setWinnerModal({show: true, matchId, team1, team2, selectedTeam: ''})
  }

  async function submitWinner() {
    if (!winnerModal.selectedTeam) {
      toast('warning', 'Missing Input', 'Please select a winning team')
      return
    }
    try {
      await axios.post(`/api/admin/matches/${winnerModal.matchId}/winner`,
        { winner: winnerModal.selectedTeam },
        { headers: { 'x-user': user?.username || 'admin' } }
      )
      toast('success', 'Success', 'Winner set successfully')
      setWinnerModal({show: false, matchId: null, team1: '', team2: '', selectedTeam: ''})
      fetchMatches(selectedSeason)
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Failed to set winner')
    }
  }

  async function editMatch(match) {
    setEditModal({
      show: true,
      match,
      formData: {
        home_team: match.home_team,
        away_team: match.away_team,
        venue: match.venue || '',
        scheduled_at: match.scheduled_at || ''
      }
    })
  }

  async function submitEditMatch() {
    try {
      await axios.put(`/api/admin/matches/${editModal.match.id}`,
        editModal.formData,
        { headers: { 'x-user': user?.username || 'admin' } }
      )
      toast('success', 'Success', 'Match updated successfully')
      setEditModal({show: false, match: null, formData: {}})
      fetchMatches(selectedSeason)
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Failed to update match')
    }
  }

  async function clearAllMatches() {
    if (!selectedSeason) {
      toast('warning', 'Missing Input', 'Please select a season first')
      return
    }
    if (!window.confirm('Are you sure? This will DELETE ALL MATCHES for this season! This action cannot be undone.')) {
      return
    }
    try {
      await axios.post('/api/admin/clear-matches',
        { seasonId: selectedSeason },
        { headers: { 'x-user': user?.username || 'admin' } }
      )
      toast('success', 'Success', 'All matches for this season cleared successfully!')
      fetchMatches(selectedSeason)
      fetchAllMatches()
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Failed to clear matches')
    }
  }

  async function clearMatchVotes(matchId, homeTeam, awayTeam) {
    if (!window.confirm(`Are you sure? This will clear all votes and odds for ${homeTeam} vs ${awayTeam}, and refund all user balances.`)) {
      return
    }
    try {
      const res = await axios.post(`/api/admin/matches/${matchId}/clear-votes`,
        {},
        { headers: { 'x-user': user?.username || 'admin' } }
      )
      toast('success', 'Success', `${res.data.message}`)
      fetchMatches(selectedSeason)
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Failed to clear match votes')
    }
  }

  async function clearWinner(matchId, homeTeam, awayTeam) {
    if (!window.confirm(`Are you sure? This will clear the winner for ${homeTeam} vs ${awayTeam} and revert all payout calculations.\n\nNote: Votes will remain, but winner payouts will be reversed.`)) {
      return
    }
    try {
      const res = await axios.post(`/api/admin/matches/${matchId}/clear-winner`,
        {},
        { headers: { 'x-user': user?.username || 'admin' } }
      )
      toast('success', 'Success', `${res.data.message}`)
      fetchMatches(selectedSeason)
      fetchUsers() // Refresh user balances
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Failed to clear winner')
    }
  }

  async function deleteMatch(matchId, homeTeam, awayTeam) {
    if (!window.confirm(`Are you sure you want to DELETE this match?\n\n${homeTeam} vs ${awayTeam}\n\nThis will refund all votes and remove the match permanently. This action cannot be undone.`)) {
      return
    }
    try {
      const res = await axios.delete(`/api/admin/matches/${matchId}`, {
        headers: { 'x-user': user?.username || 'admin' }
      })
      toast('success', 'Success', res.data.message || 'Match deleted successfully')
      fetchMatches(selectedSeason)
      fetchAllMatches()
    } catch (e) {
      toast('error', 'Error', e.response?.data?.error || 'Failed to delete match')
    }
  }

  const tabButtonStyle = (isActive) => ({
    backgroundColor: isActive ? '#2ecc71' : '#bdc3c7',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    boxShadow: isActive ? '0 4px 12px rgba(46, 204, 113, 0.3)' : 'none',
    flex: 1,
    textAlign: 'center'
  })

  const getTabIndex = () => {
    if (activeTab === 'season') return 0
    if (activeTab === 'users') return 1
    if (activeTab === 'matches') return 2
    if (activeTab === 'email') return 3
    return 0
  }

  const isActiveTab = (tabKey) => activeTab === tabKey

  // For superusers, only allow access to Matches tab
  const isSuperuser = user?.role === 'superuser'

  // Set default tab based on role
  useEffect(() => {
    if (isSuperuser && activeTab !== 'matches') {
      setActiveTab('matches')
    }
  }, [isSuperuser, activeTab])

  return (
    <div style={{padding: '20px', minHeight: '100vh'}}>
      <div style={{marginBottom: '28px'}}>

        {/* ── Tab Bar ── */}
        <div style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '20px',
          background: 'rgba(10,20,35,0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '14px',
          padding: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        }}>
          {!isSuperuser && (
            <div style={{
              flex: 1, height: '44px',
              background: isActiveTab('season')
                ? 'linear-gradient(135deg,#2ecc71,#27ae60)'
                : 'transparent',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isActiveTab('season') ? 'white' : 'rgba(255,255,255,0.55)',
              fontWeight: '700', cursor: 'pointer',
              transition: 'all 0.25s ease', fontSize: '13px',
              letterSpacing: '0.3px',
              boxShadow: isActiveTab('season') ? '0 4px 12px rgba(46,204,113,0.4)' : 'none',
              border: isActiveTab('season') ? 'none' : '1px solid rgba(255,255,255,0.06)',
            }}
            onClick={() => setActiveTab('season')}
            onMouseOver={e=>{ if(!isActiveTab('season')) e.currentTarget.style.background='rgba(255,255,255,0.08)' }}
            onMouseOut={e=>{ if(!isActiveTab('season')) e.currentTarget.style.background='transparent' }}
            >🏆 Season</div>
          )}
          {!isSuperuser && (
            <div style={{
              flex: 1, height: '44px',
              background: isActiveTab('users')
                ? 'linear-gradient(135deg,#2ecc71,#27ae60)'
                : 'transparent',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isActiveTab('users') ? 'white' : 'rgba(255,255,255,0.55)',
              fontWeight: '700', cursor: 'pointer',
              transition: 'all 0.25s ease', fontSize: '13px',
              letterSpacing: '0.3px',
              boxShadow: isActiveTab('users') ? '0 4px 12px rgba(46,204,113,0.4)' : 'none',
              border: isActiveTab('users') ? 'none' : '1px solid rgba(255,255,255,0.06)',
            }}
            onClick={() => setActiveTab('users')}
            onMouseOver={e=>{ if(!isActiveTab('users')) e.currentTarget.style.background='rgba(255,255,255,0.08)' }}
            onMouseOut={e=>{ if(!isActiveTab('users')) e.currentTarget.style.background='transparent' }}
            >👥 Users</div>
          )}
          <div style={{
            flex: 1, height: '44px',
            background: isActiveTab('matches')
              ? 'linear-gradient(135deg,#2ecc71,#27ae60)'
              : 'transparent',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isActiveTab('matches') ? 'white' : 'rgba(255,255,255,0.55)',
            fontWeight: '700', cursor: 'pointer',
            transition: 'all 0.25s ease', fontSize: '13px',
            letterSpacing: '0.3px',
            boxShadow: isActiveTab('matches') ? '0 4px 12px rgba(46,204,113,0.4)' : 'none',
            border: isActiveTab('matches') ? 'none' : '1px solid rgba(255,255,255,0.06)',
          }}
          onClick={() => setActiveTab('matches')}
          onMouseOver={e=>{ if(!isActiveTab('matches')) e.currentTarget.style.background='rgba(255,255,255,0.08)' }}
          onMouseOut={e=>{ if(!isActiveTab('matches')) e.currentTarget.style.background='transparent' }}
          >🎮 Matches</div>
          {!isSuperuser && (
            <div style={{
              flex: 1, height: '44px',
              background: isActiveTab('email')
                ? 'linear-gradient(135deg,#2ecc71,#27ae60)'
                : 'transparent',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isActiveTab('email') ? 'white' : 'rgba(255,255,255,0.55)',
              fontWeight: '700', cursor: 'pointer',
              transition: 'all 0.25s ease', fontSize: '13px',
              letterSpacing: '0.3px',
              boxShadow: isActiveTab('email') ? '0 4px 12px rgba(46,204,113,0.4)' : 'none',
              border: isActiveTab('email') ? 'none' : '1px solid rgba(255,255,255,0.06)',
            }}
            onClick={() => setActiveTab('email')}
            onMouseOver={e=>{ if(!isActiveTab('email')) e.currentTarget.style.background='rgba(255,255,255,0.08)' }}
            onMouseOut={e=>{ if(!isActiveTab('email')) e.currentTarget.style.background='transparent' }}
            >📧 Email</div>
          )}
        </div>

        {/* ── Admin Panel Title ── */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '12px',
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.70)',
          borderRadius: '14px',
          padding: '10px 18px 10px 10px',
          boxShadow: '0 3px 16px rgba(0,0,0,0.12)',
        }}>
          <div style={{
            width: '42px', height: '42px',
            background: 'linear-gradient(135deg,#2ecc71,#27ae60)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 4px 14px rgba(46,204,113,0.4)',
            flexShrink: 0,
          }}>⚙️</div>
          <div>
            <div style={{fontSize: '18px', fontWeight: '800', color: '#1a1a1a', fontFamily:"'Poppins',sans-serif", lineHeight: 1.2}}>Admin Panel</div>
            <div style={{fontSize: '12px', color: '#444', fontWeight: '700', marginTop: '3px', letterSpacing: '0.1px'}}>
              {activeTab === 'season' ? '🏆 Manage seasons' : activeTab === 'users' ? '👥 Manage users & approvals' : activeTab === 'matches' ? '🎮 Manage matches & voting' : '📧 Email settings'}
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'season' && (
        <>
          <section style={{background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '16px', padding: '22px', marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.55)'}}>
            <h3 style={{color: '#1a1a1a', marginTop: '0', marginBottom: '10px', fontSize: '18px', fontWeight: 'bold'}}>📡 Fetch Seasons from CricAPI</h3>
            <p style={{color: '#666', fontSize: '13px', marginBottom: '14px', marginTop: 0}}>Pull upcoming cricket series (next 6 months) from CricAPI and import matches directly into a new season.</p>
            <button
              onClick={() => { openCricApiModal(); fetchCricApiSeries('') }}
              style={{padding: '12px 30px', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 14px rgba(102,126,234,0.35)'}}
              onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={e => e.currentTarget.style.opacity = '1'}
            >
              🏏 Fetch Available Series
            </button>
          </section>

          <section style={{background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '16px', padding: '22px', marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.55)'}}>
            <h3 style={{color: '#1a1a1a', marginTop: '0', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold'}}>Create Season</h3>
            <div style={{display: 'flex', gap: '10px'}}>
              <input value={newSeason} onChange={e => setNewSeason(e.target.value)} placeholder="Season name" style={{flex: 1, padding: '12px 15px', border: '1px solid #ddd', borderRadius: '25px', fontSize: '14px', outline: 'none'}} onFocus={(e) => e.target.style.borderColor = '#2ecc71'} onBlur={(e) => e.target.style.borderColor = '#ddd'} />
              <button onClick={addSeason} style={{padding: '12px 30px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold'}} onMouseOver={(e) => e.target.style.backgroundColor = '#27ae60'} onMouseOut={(e) => e.target.style.backgroundColor = '#2ecc71'}>Create</button>
            </div>
          </section>

          <section style={{background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '16px', padding: '22px', marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.55)'}}>
            <h3 style={{color: '#1a1a1a', marginTop: '0', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold'}}>Manage Seasons</h3>
            {seasons.length === 0 ? <p>No seasons found</p> : (
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
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Season Name</th>
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Matches Count</th>
                      <th style={{padding: '14px 12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasons.map((s, idx) => (
                      <tr key={s.id} style={{
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: idx % 2 === 0 ? '#fafbfc' : 'white',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f7fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fafbfc' : 'white'}
                      >
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '13px', fontWeight: '500'}}><strong>{s.name}</strong></td>
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', color: '#4a5568'}}>{allMatches.filter(m => m.season_id === s.id).length}</td>
                        <td style={{padding: '14px 12px', textAlign: 'center'}}>
                          <div style={{display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap'}}>
                            <button
                              onClick={() => editSeason(s)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '11px',
                                backgroundColor: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#5568d3'}
                              onMouseOut={(e) => e.target.style.backgroundColor = '#667eea'}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteSeason(s.id, s.name)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '11px',
                                backgroundColor: '#e74c3c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#c0392b'}
                              onMouseOut={(e) => e.target.style.backgroundColor = '#e74c3c'}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'users' && (
        <>
          {/* Pending Approvals */}
          {users.some(u => u.approved === 0) && (
            <section style={{background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '16px', padding: '22px', marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.55)'}}>
              <h3 style={{color: '#1a1a1a', marginTop: '0', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold'}}>Pending Approvals</h3>
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
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Username</th>
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Display Name</th>
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Email</th>
                      <th style={{padding: '14px 12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => u.approved === 0).map((u, idx) => (
                      <tr key={u.id} style={{
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: idx % 2 === 0 ? '#fafbfc' : 'white',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f7fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fafbfc' : 'white'}
                      >
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '13px', fontWeight: '500'}}><strong>{u.username}</strong></td>
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', color: '#4a5568'}}>{u.display_name || u.username}</td>
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', color: '#4a5568'}}>{u.email || 'xyz@xyz.com'}</td>
                        <td style={{padding: '14px 12px', textAlign: 'center'}}>
                          <button
                            onClick={() => openApproveUserModal(u)}
                            style={{
                              padding: '6px 16px',
                              fontSize: '11px',
                              backgroundColor: '#2ecc71',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#27ae60'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#2ecc71'}
                          >
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section style={{background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '16px', padding: '22px', marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.55)'}}>
            <h3 style={{color: '#1a1a1a', marginTop: '0', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold'}}>Create New User</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 150px 120px', gap: '10px'}}>
              <input
                value={newUser.username}
                onChange={e => setNewUser({...newUser, username: e.target.value})}
                placeholder="Username"
                style={{padding: '12px 15px', border: '1px solid #ddd', borderRadius: '25px', fontSize: '14px', outline: 'none'}}
                onFocus={(e) => e.target.style.borderColor = '#2ecc71'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
              <input
                type="password"
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
                placeholder="Password"
                style={{padding: '12px 15px', border: '1px solid #ddd', borderRadius: '25px', fontSize: '14px', outline: 'none'}}
                onFocus={(e) => e.target.style.borderColor = '#2ecc71'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
              <input
                value={newUser.display_name || ''}
                onChange={e => setNewUser({...newUser, display_name: e.target.value})}
                placeholder="Display name"
                style={{padding: '12px 15px', border: '1px solid #ddd', borderRadius: '25px', fontSize: '14px', outline: 'none'}}
                onFocus={(e) => e.target.style.borderColor = '#2ecc71'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
              <select
                          onClick={() => approveUser(u.id)}
                onChange={e => setNewUser({...newUser, role: e.target.value})}
                style={{padding: '12px 15px', border: '1px solid #ddd', borderRadius: '25px', fontSize: '14px', outline: 'none', cursor: 'pointer'}}
              >
                <option value="picker">Picker</option>
                <option value="superuser">Superuser</option>
                <option value="admin">Admin</option>
              </select>
              <input
                type="number"
                value={newUser.balance}
                onChange={e => setNewUser({...newUser, balance: parseInt(e.target.value) || 0})}
                placeholder="Balance"
                style={{padding: '12px 15px', border: '1px solid #ddd', borderRadius: '25px', fontSize: '14px', outline: 'none'}}
                onFocus={(e) => e.target.style.borderColor = '#2ecc71'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>
            <div style={{marginTop: '15px'}}>
              <label style={{display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '14px'}}>Assign Seasons:</label>
              <div style={{border: '1px solid #ddd', borderRadius: '12px', padding: '12px', maxHeight: '120px', overflow: 'auto', backgroundColor: '#fafafa'}}>
                {seasons.length === 0 ? (
                  <p style={{margin: 0, color: '#666', fontSize: '12px'}}>No seasons available</p>
                ) : (
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                    {seasons.map(season => (
                      <label key={season.id} style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px'}}>
                        <input
                          type="checkbox"
                          checked={newUser.season_ids?.includes(season.id) || false}
                          onChange={e => {
                            const isChecked = e.target.checked
                            const newSeasonIds = isChecked
                              ? [...(newUser.season_ids || []), season.id]
                              : (newUser.season_ids || []).filter(sid => sid !== season.id)
                            setNewUser({...newUser, season_ids: newSeasonIds})
                          }}
                          style={{cursor: 'pointer'}}
                        />
                        <span>{season.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={createUser}
              style={{marginTop: '15px', padding: '12px 30px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold'}}
              onMouseOver={(e) => e.target.style.backgroundColor = '#27ae60'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#2ecc71'}
            >
              Create User
            </button>
          </section>

          <section style={{background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '16px', padding: '22px', marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.55)'}}>
            <h3 style={{color: '#1a1a1a', marginTop: '0', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold'}}>All Users</h3>
            {users.length === 0 ? <p>No users found</p> : (
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
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Username</th>
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Display Name</th>
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Email</th>
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Role</th>
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Balance</th>
                      <th style={{padding: '14px 12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => (
                      <tr key={u.id} style={{
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: idx % 2 === 0 ? '#fafbfc' : 'white',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f7fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fafbfc' : 'white'}
                      >
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '13px', fontWeight: '500'}}><strong>{u.username}</strong></td>
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', color: '#4a5568'}}>{u.display_name || u.username}</td>
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', color: '#4a5568'}}>{u.email || 'xyz@xyz.com'}</td>
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px'}}>
                          <span style={{backgroundColor: u.role === 'admin' ? '#dc3545' : u.role === 'superuser' ? '#ff9800' : '#28a745', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600'}}>{u.role}</span>
                        </td>
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', fontWeight: '500'}}>{Math.round(u.balance)}</td>
                        <td style={{padding: '14px 12px', textAlign: 'center'}}>
                          <div style={{display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap'}}>
                            <button
                              onClick={() => editUser(u)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '11px',
                                backgroundColor: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#5568d3'}
                              onMouseOut={(e) => e.target.style.backgroundColor = '#667eea'}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteUser(u.id, u.username)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '11px',
                                backgroundColor: '#e74c3c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#c0392b'}
                              onMouseOut={(e) => e.target.style.backgroundColor = '#e74c3c'}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'matches' && (
        <>
          {!isSuperuser && (
            <section style={{background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '16px', padding: '22px', marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.55)'}}>
              <h3 style={{color: '#1a1a1a', marginTop: '0', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold'}}>Bulk Upload CSV Matches</h3>
              <small style={{display: 'block', marginBottom: '10px', color: '#666'}}>Format: Date,Venue,Team 1,Team 2,Time</small>
              <textarea
                value={csvInput}
                onChange={e => setCsvInput(e.target.value)}
                placeholder="Date,Venue,Team 1,Team 2,Time"
                style={{width: '100%', height: 120, fontFamily: 'monospace', padding: '12px 15px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '15px', fontSize: '13px', outline: 'none'}}
                onFocus={(e) => e.target.style.borderColor = '#2ecc71'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
              <button
                onClick={uploadCsv}
                style={{padding: '12px 30px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold'}}
                onMouseOver={(e) => e.target.style.backgroundColor = '#27ae60'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#2ecc71'}
              >
                Upload CSV
              </button>
            </section>
          )}

          <section style={{background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '16px', padding: '22px', marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.55)'}}>
            <h3 style={{color: '#1a1a1a', marginTop: '0', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold'}}>Manage Matches</h3>
            <div style={{marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center'}}>
              <label style={{fontWeight: 'bold', color: '#1a1a1a'}}>Select Season:</label>
              <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} style={{padding: '12px 15px', border: '1px solid #ddd', borderRadius: '25px', fontSize: '14px', outline: 'none', cursor: 'pointer', flex: 1, maxWidth: '300px'}}>
                <option value="">-- Select Season --</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {!isSuperuser && (
                <button onClick={clearAllMatches} style={{padding: '12px 30px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold'}} onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'} onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}>Clear Matches</button>
              )}
            </div>
            {matches.length === 0 ? <p>No matches in this season</p> : (
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
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Match</th>
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Venue</th>
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Date/Time</th>
                      <th style={{padding: '14px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Winner</th>
                      <th style={{padding: '14px 12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, idx) => (
                      <tr key={m.id} style={{
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: idx % 2 === 0 ? '#fafbfc' : 'white',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f7fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fafbfc' : 'white'}
                      >
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '13px', fontWeight: '500'}}><strong>{m.home_team}</strong> vs <strong>{m.away_team}</strong></td>
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', color: '#4a5568'}}>{m.venue || 'N/A'}</td>
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px', color: '#4a5568'}}>{m.scheduled_at || 'N/A'}</td>
                        <td style={{padding: '14px 12px', borderRight: '1px solid #f0f0f0', fontSize: '12px'}}>
                          {m.winner ? <span style={{backgroundColor: '#2ecc71', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600'}}>{m.winner}</span> : <span style={{color: '#a0aec0', fontSize: '12px', fontWeight: '600'}}>TBD</span>}
                        </td>
                        <td style={{padding: '14px 12px', textAlign: 'center'}}>
                          <div style={{display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap'}}>
                            {!isSuperuser && (
                              <button
                                onClick={() => editMatch(m)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  backgroundColor: '#667eea',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#5568d3'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#667eea'}
                              >
                                Edit
                              </button>
                            )}
                            {(isSuperuser || user?.role === 'admin') && (
                              <button
                                onClick={() => setWinner(m.id, m.home_team, m.away_team)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  backgroundColor: '#2ecc71',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#27ae60'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#2ecc71'}
                              >
                                Set Winner
                              </button>
                            )}
                            {!isSuperuser && m.winner && (
                              <button
                                onClick={() => clearWinner(m.id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  backgroundColor: '#f39c12',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#e67e22'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#f39c12'}
                              >
                                Clear Winner
                              </button>
                            )}
                            {!isSuperuser && (
                              <button
                                onClick={() => clearMatchVotes(m.id, m.home_team, m.away_team)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  backgroundColor: '#FFA500',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#FF8C00'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#FFA500'}
                              >
                                Clear Votes
                              </button>
                            )}
                            {!isSuperuser && (
                              <button
                                onClick={() => deleteMatch(m.id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  backgroundColor: '#e74c3c',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#c0392b'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#e74c3c'}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'email' && (
        <>
          <section style={{background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '16px', padding: '22px', marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.55)'}}>
            <h3 style={{color: '#1a1a1a', marginTop: '0', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold'}}>Email Settings</h3>
            <p style={{color: '#666', fontSize: '14px', marginBottom: '20px'}}>Configure Gmail SMTP for sending signup notifications and approval emails to users.</p>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333', fontSize: '14px'}}>Gmail Address:</label>
                <input
                  type="email"
                  value={emailSettings.user}
                  onChange={e => setEmailSettings({...emailSettings, user: e.target.value})}
                  placeholder="your-email@gmail.com"
                  style={{width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '25px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'}}
                  onFocus={(e) => e.target.style.borderColor = '#2ecc71'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333', fontSize: '14px'}}>App Password:</label>
                <input
                  type="password"
                  value={emailSettings.password}
                  onChange={e => setEmailSettings({...emailSettings, password: e.target.value})}
                  placeholder="16-character app password"
                  style={{width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '25px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'}}
                  onFocus={(e) => e.target.style.borderColor = '#2ecc71'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              <div style={{gridColumn: '1 / -1'}}>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333', fontSize: '14px'}}>From Email Address:</label>
                <input
                  type="email"
                  value={emailSettings.from}
                  onChange={e => setEmailSettings({...emailSettings, from: e.target.value})}
                  placeholder="noreply@cricketmela.com (leave empty to use Gmail address)"
                  style={{width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '25px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'}}
                  onFocus={(e) => e.target.style.borderColor = '#2ecc71'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>
            </div>

            {emailMessage && (
              <div style={{
                padding: '12px 15px',
                borderRadius: '8px',
                marginBottom: '15px',
                backgroundColor: emailMessage.includes('❌') ? '#ffebee' : '#e8f5e9',
                color: emailMessage.includes('❌') ? '#c62828' : '#2e7d32',
                border: `1px solid ${emailMessage.includes('❌') ? '#ef5350' : '#66bb6a'}`,
                fontSize: '14px'
              }}>
                {emailMessage}
              </div>
            )}

            <div style={{display: 'flex', gap: '10px'}}>
              <button
                onClick={saveEmailSettings}
                style={{padding: '12px 30px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'}}
                onMouseOver={(e) => e.target.style.backgroundColor = '#27ae60'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#2ecc71'}
              >
                Save & Test Configuration
              </button>
            </div>

            <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', borderLeft: '4px solid #2ecc71'}}>
              <p style={{margin: '0 0 10px 0', fontWeight: 'bold', color: '#333', fontSize: '14px'}}>📝 How to set up Gmail:</p>
              <ul style={{margin: '0', paddingLeft: '20px', color: '#666', fontSize: '13px'}}>
                <li>Enable 2-Step Verification on your Google Account</li>
                <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{color: '#2ecc71', textDecoration: 'none'}}>myaccount.google.com/apppasswords</a></li>
                <li>Select "Mail" and "Windows Computer" (or your device type)</li>
                <li>Google will generate a 16-character password - copy and paste it above</li>
                <li>Click "Save & Test Configuration" to verify it works</li>
              </ul>
            </div>
          </section>
        </>
      )}

      {winnerModal.show && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div style={{background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '28px', borderRadius: '16px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.6)'}}>
            <h3 style={{marginTop: 0}}>Select Winning Team</h3>
            <div style={{margin: '20px 0'}}>
              <label style={{display: 'block', marginBottom: '15px', cursor: 'pointer'}}>
                <input type="radio" name="winner" value={winnerModal.team1} checked={winnerModal.selectedTeam === winnerModal.team1} onChange={e => setWinnerModal({...winnerModal, selectedTeam: e.target.value})} style={{marginRight: '10px'}} />
                <span style={{fontSize: '16px'}}>{winnerModal.team1}</span>
              </label>
              <label style={{display: 'block', marginBottom: '15px', cursor: 'pointer'}}>
                <input type="radio" name="winner" value={winnerModal.team2} checked={winnerModal.selectedTeam === winnerModal.team2} onChange={e => setWinnerModal({...winnerModal, selectedTeam: e.target.value})} style={{marginRight: '10px'}} />
                <span style={{fontSize: '16px'}}>{winnerModal.team2}</span>
              </label>
            </div>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
              <button onClick={() => setWinnerModal({show: false, matchId: null, team1: '', team2: '', selectedTeam: ''})} style={{padding: '8px 16px', backgroundColor: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>
              <button
                onClick={submitWinner}
                style={{padding: '8px 16px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal.show && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'}}>
            <h3 style={{marginTop: 0}}>Edit Match</h3>
            <div style={{margin: '15px 0'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Team 1:</label>
              <input type="text" value={editModal.formData.home_team} onChange={e => setEditModal({...editModal, formData: {...editModal.formData, home_team: e.target.value}})} style={{width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd'}} />
            </div>
            <div style={{margin: '15px 0'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Team 2:</label>
              <input type="text" value={editModal.formData.away_team} onChange={e => setEditModal({...editModal, formData: {...editModal.formData, away_team: e.target.value}})} style={{width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd'}} />
            </div>
            <div style={{margin: '15px 0'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Venue:</label>
              <input type="text" value={editModal.formData.venue} onChange={e => setEditModal({...editModal, formData: {...editModal.formData, venue: e.target.value}})} style={{width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd'}} />
            </div>
            <div style={{margin: '15px 0'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Date & Time:</label>
              <input type="text" value={editModal.formData.scheduled_at} onChange={e => setEditModal({...editModal, formData: {...editModal.formData, scheduled_at: e.target.value}})} placeholder="YYYY-MM-DDTHH:MM" style={{width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd'}} />
            </div>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
              <button onClick={() => setEditModal({show: false, match: null, formData: {}})} style={{padding: '8px 16px', backgroundColor: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>
              <button onClick={submitEditMatch} style={{padding: '8px 16px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Save</button>
            </div>
          </div>
        </div>
      )}

      {editUserModal.show && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxHeight: '80vh', overflow: 'auto'}}>
            <h3 style={{marginTop: 0}}>Edit User</h3>

            {/* Google OAuth Indicator */}
            {editUserModal.authMethod && editUserModal.authMethod.authMethod === 'google' && (
              <div style={{padding: '12px', background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', borderRadius: '8px', marginBottom: '15px', border: '1px solid #90caf9'}}>
                <p style={{margin: 0, fontWeight: '600', color: '#1565c0', fontSize: '13px'}}>
                  🔵 Google OAuth User - Password management not available
                </p>
              </div>
            )}

            {/* Dual Authentication Indicator */}
            {editUserModal.authMethod && editUserModal.authMethod.authMethod === 'both' && (
              <div style={{padding: '12px', background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ffb74d'}}>
                <p style={{margin: 0, fontWeight: '600', color: '#e65100', fontSize: '13px'}}>
                  🔐 Dual Authentication - Can login with Google or password
                </p>
              </div>
            )}

            <div style={{margin: '15px 0'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Username:</label>
              <input type="text" value={editUserModal.formData.username} disabled style={{width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#f5f5f5'}} />
            </div>
            <div style={{margin: '15px 0'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Email:</label>
              <input type="email" value={editUserModal.formData.email || ''} onChange={e => setEditUserModal({...editUserModal, formData: {...editUserModal.formData, email: e.target.value}})} placeholder="xyz@xyz.com" style={{width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd'}} />
            </div>
            <div style={{margin: '15px 0'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Role:</label>
              <select value={editUserModal.formData.role} onChange={e => setEditUserModal({...editUserModal, formData: {...editUserModal.formData, role: e.target.value}})} style={{width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd'}}>
                <option value="picker">Picker</option>
                <option value="superuser">Superuser</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{margin: '15px 0'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Balance:</label>
              <input type="number" value={editUserModal.formData.balance} onChange={e => setEditUserModal({...editUserModal, formData: {...editUserModal.formData, balance: parseInt(e.target.value) || 0}})} style={{width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd'}} />
            </div>
            <div style={{margin: '15px 0'}}>
              <label style={{display: 'block', marginBottom: '10px', fontWeight: 'bold'}}>Assigned Seasons:</label>
              <div style={{border: '1px solid #ddd', borderRadius: '4px', padding: '10px', maxHeight: '150px', overflow: 'auto'}}>
                {seasons.length === 0 ? (
                  <p style={{margin: 0, color: '#666'}}>No seasons available</p>
                ) : (
                  seasons.map(season => (
                    <div key={season.id} style={{marginBottom: '8px', display: 'flex', alignItems: 'center'}}>
                      <input
                        type="checkbox"
                        id={`season-${season.id}`}
                        checked={editUserModal.assignedSeasons.includes(season.id)}
                        onChange={e => {
                          const isChecked = e.target.checked
                          const newAssignedSeasons = isChecked
                            ? [...editUserModal.assignedSeasons, season.id]
                            : editUserModal.assignedSeasons.filter(sid => sid !== season.id)
                          setEditUserModal({...editUserModal, assignedSeasons: newAssignedSeasons})
                        }}
                        style={{marginRight: '8px', cursor: 'pointer'}}
                      />
                      <label htmlFor={`season-${season.id}`} style={{cursor: 'pointer', margin: 0}}>{season.name}</label>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', flexWrap: 'wrap'}}>
              <button onClick={() => setEditUserModal({show: false, user: null, formData: {}, assignedSeasons: [], authMethod: null, seasonBalances: {}})} style={{padding: '8px 16px', backgroundColor: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>

              {/* Only show Reset Password button if user can have password (not Google-only) */}
              {(!editUserModal.authMethod || editUserModal.authMethod.canChangePassword) && (
                <button onClick={() => openPasswordResetModal(editUserModal.user.id, editUserModal.user.username)} style={{padding: '8px 16px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Reset Password</button>
              )}

              <button onClick={submitEditUser} style={{padding: '8px 16px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Save</button>
            </div>
          </div>
        </div>
      )}

      {editSeasonModal.show && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div style={{background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '28px', borderRadius: '16px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.6)'}}>
            <h3 style={{marginTop: 0}}>Edit Season</h3>
            <div style={{margin: '15px 0'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Season Name:</label>
              <input type="text" value={editSeasonModal.formData.name} onChange={e => setEditSeasonModal({...editSeasonModal, formData: {...editSeasonModal.formData, name: e.target.value}})} style={{width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd'}} />
            </div>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
              <button onClick={() => setEditSeasonModal({show: false, season: null, formData: {}})} style={{padding: '8px 16px', backgroundColor: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>
              <button onClick={submitEditSeason} style={{padding: '8px 16px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Save</button>
            </div>
          </div>
        </div>
      )}

      {passwordResetModal.show && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div style={{background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '28px', borderRadius: '16px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.6)'}}>
            <h3 style={{marginTop: 0}}>Reset Password for {passwordResetModal.username}</h3>
            <div style={{margin: '15px 0'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>New Password:</label>
              <input type="password" value={passwordResetModal.newPassword} onChange={e => setPasswordResetModal({...passwordResetModal, newPassword: e.target.value})} placeholder="Enter new password" style={{width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd'}} />
            </div>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
              <button onClick={() => setPasswordResetModal({show: false, userId: null, username: '', newPassword: ''})} style={{padding: '8px 16px', backgroundColor: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>
              <button onClick={submitPasswordReset} style={{padding: '8px 16px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Reset</button>
            </div>
          </div>
        </div>
      )}

      {approveUserModal.show && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxHeight: '80vh', overflow: 'auto'}}>
            <h3 style={{marginTop: 0}}>Approve User: {approveUserModal.user?.display_name}</h3>
            <div style={{margin: '15px 0'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Initial Balance:</label>
              <input type="number" value={approveUserModal.formData.balance} onChange={e => setApproveUserModal({...approveUserModal, formData: {...approveUserModal.formData, balance: parseInt(e.target.value) || 0}})} style={{width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd'}} />
            </div>
            <div style={{margin: '15px 0'}}>
              <label style={{display: 'block', marginBottom: '10px', fontWeight: 'bold'}}>Assign Seasons:</label>
              <div style={{border: '1px solid #ddd', borderRadius: '4px', padding: '10px', maxHeight: '150px', overflow: 'auto'}}>
                {seasons.length === 0 ? (
                  <p style={{margin: 0, color: '#666'}}>No seasons available</p>
                ) : (
                  seasons.map(season => (
                    <div key={season.id} style={{marginBottom: '8px', display: 'flex', alignItems: 'center'}}>
                      <input
                        type="checkbox"
                        id={`approve-season-${season.id}`}
                        checked={approveUserModal.selectedSeasons.includes(season.id)}
                        onChange={e => {
                          const isChecked = e.target.checked
                          const newSeasons = isChecked
                            ? [...approveUserModal.selectedSeasons, season.id]
                            : approveUserModal.selectedSeasons.filter(sid => sid !== season.id)
                          setApproveUserModal({...approveUserModal, selectedSeasons: newSeasons})
                        }}
                        style={{marginRight: '8px', cursor: 'pointer'}}
                      />
                      <label htmlFor={`approve-season-${season.id}`} style={{cursor: 'pointer', margin: 0}}>{season.name}</label>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
              <button onClick={() => setApproveUserModal({show: false, user: null, formData: {balance: 1000}, selectedSeasons: []})} style={{padding: '8px 16px', backgroundColor: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>
              <button onClick={submitApproveUser} style={{padding: '8px 16px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CricAPI Import Modal ── */}
      {cricApiModal.show && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.6)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:2000}}>
          <div style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)',padding:'28px',borderRadius:'18px',maxWidth:'700px',width:'95%',boxShadow:'0 24px 64px rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.7)',maxHeight:'90vh',display:'flex',flexDirection:'column'}}>

            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
              <div>
                <h3 style={{margin:0,fontSize:'18px',fontWeight:'800',color:'#1a1a1a'}}>
                  {cricApiModal.step === 'series' ? '📡 Available Cricket Series' : cricApiModal.step === 'importing' ? '⏳ Importing Season…' : `🏏 Matches – ${cricApiModal.selectedSeries?.name || ''}`}
                </h3>
                <p style={{margin:'4px 0 0 0',fontSize:'12px',color:'#666'}}>
                  {cricApiModal.step === 'series' ? 'Select a series to view and import its matches' : cricApiModal.step === 'matches' ? 'Choose matches to include. Uncheck any you want to skip.' : 'Creating season and inserting matches…'}
                </p>
              </div>
              <button onClick={() => setCricApiModal(prev => ({...prev, show: false}))} style={{background:'none',border:'none',fontSize:'22px',cursor:'pointer',color:'#666',lineHeight:1}}>✕</button>
            </div>

            {/* Error */}
            {cricApiModal.error && (
              <div style={{padding:'10px 14px',background:'#ffebee',color:'#c62828',borderRadius:'8px',fontSize:'13px',marginBottom:'14px',border:'1px solid #ef5350'}}>
                ❌ {cricApiModal.error}
              </div>
            )}

            {/* ── Step: Series ── */}
            {cricApiModal.step === 'series' && (
              <>
                <div style={{display:'flex',gap:'10px',marginBottom:'14px'}}>
                  <input
                    type="text"
                    value={cricApiModal.searchQuery}
                    onChange={e => setCricApiModal(prev => ({...prev, searchQuery: e.target.value}))}
                    onKeyDown={e => { if (e.key === 'Enter') fetchCricApiSeries(cricApiModal.searchQuery) }}
                    placeholder="Search series… (e.g. IPL, India)"
                    style={{flex:1,padding:'10px 15px',border:'1px solid #ddd',borderRadius:'25px',fontSize:'14px',outline:'none'}}
                    onFocus={e => e.target.style.borderColor='#667eea'}
                    onBlur={e => e.target.style.borderColor='#ddd'}
                  />
                  <button
                    onClick={() => fetchCricApiSeries(cricApiModal.searchQuery)}
                    disabled={cricApiModal.loading}
                    style={{padding:'10px 22px',background:'linear-gradient(135deg,#667eea,#764ba2)',color:'white',border:'none',borderRadius:'25px',cursor:'pointer',fontWeight:'bold',fontSize:'13px',opacity:cricApiModal.loading?0.6:1}}
                  >
                    {cricApiModal.loading ? '🔄 Loading…' : '🔍 Search'}
                  </button>
                </div>

                {cricApiModal.loading ? (
                  <div style={{textAlign:'center',padding:'40px',color:'#667eea',fontSize:'14px'}}>🔄 Fetching series from CricAPI…</div>
                ) : cricApiModal.seriesList.length === 0 ? (
                  <div style={{textAlign:'center',padding:'40px',color:'#999',fontSize:'14px'}}>No series found. Try searching for "IPL" or "T20".</div>
                ) : (
                  <div style={{overflowY:'auto',flex:1}}>
                    {cricApiModal.seriesList.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        onClick={() => fetchCricApiMatches(s)}
                        style={{padding:'13px 15px',marginBottom:'8px',borderRadius:'10px',border:'1px solid #e8e8e8',cursor:'pointer',transition:'all 0.2s',backgroundColor:'#fafbfc'}}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor='#eef1ff'; e.currentTarget.style.borderColor='#667eea'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor='#fafbfc'; e.currentTarget.style.borderColor='#e8e8e8'; }}
                      >
                        <div style={{fontWeight:'700',fontSize:'14px',color:'#1a1a1a'}}>{s.name || s.title}</div>
                        <div style={{fontSize:'12px',color:'#666',marginTop:'4px',display:'flex',gap:'14px',flexWrap:'wrap'}}>
                          {s.startDate && <span>📅 {s.startDate}{s.endDate ? ` → ${s.endDate}` : ''}</span>}
                          {s.odi && <span>ODI: {s.odi}</span>}
                          {s.t20 && <span>T20: {s.t20}</span>}
                          {s.test && <span>Test: {s.test}</span>}
                          {s.squads && <span>Squads: {s.squads}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Step: Matches ── */}
            {cricApiModal.step === 'matches' && (
              <>
                {/* Season name input */}
                <div style={{marginBottom:'14px',display:'flex',gap:'10px',alignItems:'center'}}>
                  <label style={{fontWeight:'700',fontSize:'13px',color:'#333',whiteSpace:'nowrap'}}>Season Name:</label>
                  <input
                    type="text"
                    value={cricApiModal.seasonName}
                    onChange={e => setCricApiModal(prev => ({...prev, seasonName: e.target.value}))}
                    style={{flex:1,padding:'10px 15px',border:'1px solid #ddd',borderRadius:'25px',fontSize:'14px',outline:'none'}}
                    onFocus={e => e.target.style.borderColor='#667eea'}
                    onBlur={e => e.target.style.borderColor='#ddd'}
                  />
                </div>

                {/* Select all / none */}
                <div style={{display:'flex',gap:'10px',marginBottom:'10px',alignItems:'center'}}>
                  <span style={{fontSize:'12px',color:'#666'}}>{cricApiModal.selectedMatches.length} of {cricApiModal.matchesList.length} selected</span>
                  <button onClick={() => setCricApiModal(prev => ({...prev, selectedMatches: prev.matchesList.map(m => m._idx)}))} style={{padding:'4px 12px',fontSize:'11px',backgroundColor:'#667eea',color:'white',border:'none',borderRadius:'20px',cursor:'pointer',fontWeight:'600'}}>Select All</button>
                  <button onClick={() => setCricApiModal(prev => ({...prev, selectedMatches: []}))} style={{padding:'4px 12px',fontSize:'11px',backgroundColor:'#bdc3c7',color:'white',border:'none',borderRadius:'20px',cursor:'pointer',fontWeight:'600'}}>Clear All</button>
                  <button onClick={() => setCricApiModal(prev => ({...prev, step:'series'}))} style={{padding:'4px 12px',fontSize:'11px',backgroundColor:'transparent',color:'#667eea',border:'1px solid #667eea',borderRadius:'20px',cursor:'pointer',fontWeight:'600',marginLeft:'auto'}}>← Back</button>
                </div>

                {cricApiModal.loading ? (
                  <div style={{textAlign:'center',padding:'40px',color:'#667eea',fontSize:'14px'}}>🔄 Fetching matches…</div>
                ) : cricApiModal.matchesList.length === 0 ? (
                  <div style={{textAlign:'center',padding:'40px',color:'#999',fontSize:'14px'}}>No matches found for this series.</div>
                ) : (
                  <div style={{overflowY:'auto',flex:1,border:'1px solid #e8e8e8',borderRadius:'10px'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontFamily:'Inter,sans-serif',fontSize:'12px'}}>
                      <thead>
                        <tr style={{background:'linear-gradient(135deg,#667eea,#764ba2)',color:'white'}}>
                          <th style={{padding:'10px 12px',textAlign:'center',width:'40px'}}>✓</th>
                          <th style={{padding:'10px 12px',textAlign:'left'}}>Match</th>
                          <th style={{padding:'10px 12px',textAlign:'left'}}>Date/Time</th>
                          <th style={{padding:'10px 12px',textAlign:'left'}}>Venue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cricApiModal.matchesList.map((m, idx) => {
                          const isSelected = cricApiModal.selectedMatches.includes(m._idx)
                          return (
                            <tr key={m._idx}
                              style={{borderBottom:'1px solid #f0f0f0',backgroundColor:isSelected?(idx%2===0?'#eef1ff':'#f0f3ff'):(idx%2===0?'#fafbfc':'white'),cursor:'pointer'}}
                              onClick={() => {
                                setCricApiModal(prev => ({
                                  ...prev,
                                  selectedMatches: isSelected
                                    ? prev.selectedMatches.filter(i => i !== m._idx)
                                    : [...prev.selectedMatches, m._idx]
                                }))
                              }}
                            >
                              <td style={{padding:'10px 12px',textAlign:'center'}}>
                                <input type="checkbox" checked={isSelected} onChange={() => {}} style={{cursor:'pointer',width:'15px',height:'15px'}} />
                              </td>
                              <td style={{padding:'10px 12px',fontWeight:'600',color:'#1a1a1a'}}>
                                {m.home_team} <span style={{color:'#888',fontWeight:'400'}}>vs</span> {m.away_team}
                              </td>
                              <td style={{padding:'10px 12px',color:'#4a5568'}}>
                                {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString('en-IN', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'TBD'}
                              </td>
                              <td style={{padding:'10px 12px',color:'#4a5568'}}>{m.venue || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Footer buttons */}
                <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'16px'}}>
                  <button onClick={() => setCricApiModal(prev => ({...prev, show: false}))} style={{padding:'10px 20px',backgroundColor:'#ccc',border:'none',borderRadius:'25px',cursor:'pointer',fontWeight:'600'}}>Cancel</button>
                  <button
                    onClick={importCricApiSeason}
                    disabled={cricApiModal.selectedMatches.length === 0 || !cricApiModal.seasonName.trim()}
                    style={{padding:'10px 26px',background:'linear-gradient(135deg,#2ecc71,#27ae60)',color:'white',border:'none',borderRadius:'25px',cursor:'pointer',fontWeight:'700',fontSize:'14px',opacity:(cricApiModal.selectedMatches.length===0||!cricApiModal.seasonName.trim())?0.5:1}}
                  >
                    ✅ Import {cricApiModal.selectedMatches.length} Match{cricApiModal.selectedMatches.length !== 1 ? 'es' : ''}
                  </button>
                </div>
              </>
            )}

            {/* ── Step: Importing ── */}
            {cricApiModal.step === 'importing' && (
              <div style={{textAlign:'center',padding:'50px 20px'}}>
                <div style={{fontSize:'48px',marginBottom:'16px'}}>⏳</div>
                <p style={{fontSize:'16px',fontWeight:'700',color:'#333'}}>Creating season and importing matches…</p>
                <p style={{fontSize:'13px',color:'#666'}}>Please wait</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}












