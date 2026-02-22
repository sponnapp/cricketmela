import React, { useState } from 'react'
import axios from 'axios'

export default function Profile({ user, refreshUser }) {
  const [displayName, setDisplayName] = useState(user?.display_name || user?.displayName || user?.username || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!displayName) {
      setError('Display name is required')
      return
    }

    if (password && password.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }

    if (password && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)
    try {
      const payload = { display_name: displayName, password: password || null }
      const res = await axios.put(`/api/users/${user.id}/profile`,
        payload,
        { headers: { 'x-user': user.username } }
      )
      setSaving(false)
      setMessage(res.data?.message || 'Profile updated')
      const me = await axios.get('/api/me', { headers: { 'x-user': user.username } })
      refreshUser(me.data)
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setSaving(false)
      setError(err.response?.data?.error || 'Failed to update profile')
    }
  }

  return (
    <div style={{padding: '20px', fontFamily: 'Inter, sans-serif'}}>
      <h2 style={{fontFamily: 'Poppins, sans-serif', fontSize: '28px', fontWeight: '600', letterSpacing: '-0.5px', marginBottom: '25px'}}>👤 Profile</h2>
      <form onSubmit={submit} style={{maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '18px', backgroundColor: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e8e8e8'}}>
        <div>
          <label style={{fontWeight: '600', fontSize: '13px', color: '#4a5568', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Username (read-only)</label>
          <input
            type="text"
            value={user?.username || ''}
            disabled
            style={{padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', backgroundColor: '#f7fafc', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', color: '#718096'}}
          />
        </div>

        <div>
          <label style={{fontWeight: '600', fontSize: '13px', color: '#4a5568', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Display name"
            style={{padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s'}}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        <div>
          <label style={{fontWeight: '600', fontSize: '13px', color: '#4a5568', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px'}}>New Password (optional)</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="New password"
            style={{padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s'}}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        <div>
          <label style={{fontWeight: '600', fontSize: '13px', color: '#4a5568', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            style={{padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s'}}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        {error && <div style={{color: '#e53e3e', fontSize: '13px', fontWeight: '500'}}>{error}</div>}
        {message && <div style={{color: '#38a169', fontSize: '13px', fontWeight: '500'}}>{message}</div>}

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '14px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: 'Inter, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            if (!saving) {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)'
            }
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
