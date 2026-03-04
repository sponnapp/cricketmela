import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function Profile({ user, refreshUser }) {
  const [displayName, setDisplayName] = useState(user?.display_name || user?.displayName || user?.username || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [authMethod, setAuthMethod] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check user's authentication method
    async function checkAuthMethod() {
      try {
        const res = await axios.get(`/api/users/${user.id}/auth-method`, {
          headers: { 'x-user': user.username }
        })
        setAuthMethod(res.data)
      } catch (err) {
        console.error('Error checking auth method:', err)
        // Fallback: assume regular password user if API fails (production proxy/CORS issues)
        // Backend still enforces Google-only restrictions server-side
        setAuthMethod({ authMethod: 'password', canChangePassword: true })
      } finally {
        setLoading(false)
      }
    }
    checkAuthMethod()
  }, [user.id, user.username])

  async function submit(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!displayName) {
      setError('Display name is required')
      return
    }

    // If changing password, require current password
    if (password && !currentPassword) {
      setError('Current password is required to change password')
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

    // Check if new password is same as current
    if (password && password === currentPassword) {
      setError('New password must be different from current password')
      return
    }

    setSaving(true)
    try {
      const payload = {
        display_name: displayName,
        password: password || null,
        current_password: currentPassword || null
      }
      const res = await axios.put(`/api/users/${user.id}/profile`,
        payload,
        { headers: { 'x-user': user.username } }
      )
      setSaving(false)
      setMessage(res.data?.message || 'Profile updated')
      const me = await axios.get('/api/me', { headers: { 'x-user': user.username } })
      refreshUser(me.data)
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setSaving(false)
      setError(err.response?.data?.error || 'Failed to update profile')
    }
  }

  return (
    <div style={{padding: '20px', fontFamily: 'Inter, sans-serif'}}>
      {/* Title pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '12px',
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.70)',
        borderRadius: '14px',
        padding: '10px 18px 10px 10px',
        boxShadow: '0 3px 16px rgba(0,0,0,0.12)',
        marginBottom: '22px',
      }}>
        <div style={{
          width: '42px', height: '42px',
          background: 'linear-gradient(135deg,#667eea,#764ba2)',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
          boxShadow: '0 4px 14px rgba(102,126,234,0.4)',
          flexShrink: 0,
        }}>👤</div>
        <div>
          <div style={{fontSize: '18px', fontWeight: '800', color: '#1a1a1a', fontFamily:"'Poppins',sans-serif", lineHeight: 1.2}}>Profile</div>
          <div style={{fontSize: '12px', color: '#444', fontWeight: '700', marginTop: '3px'}}>Update your display name &amp; password</div>
        </div>
      </div>

      {loading ? (
        <div style={{maxWidth: '500px', padding: '30px', textAlign: 'center'}}>Loading...</div>
      ) : (
        <form onSubmit={submit} style={{maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '18px', background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', border: '1px solid rgba(255,255,255,0.6)'}}>

          {/* Authentication Method Indicator */}
          {authMethod && authMethod.authMethod === 'google' && (
            <div style={{padding: '15px', background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', borderRadius: '10px', marginBottom: '10px', border: '1px solid #90caf9'}}>
              <p style={{margin: '0 0 8px 0', fontWeight: '600', color: '#1565c0', fontSize: '14px'}}>
                🔵 Google Authentication
              </p>
              <p style={{margin: 0, color: '#1976d2', fontSize: '13px'}}>
                You sign in with your Google account. Password management is not available.
              </p>
            </div>
          )}

          {authMethod && authMethod.authMethod === 'both' && (
            <div style={{padding: '15px', background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)', borderRadius: '10px', marginBottom: '10px', border: '1px solid #ffb74d'}}>
              <p style={{margin: '0 0 8px 0', fontWeight: '600', color: '#e65100', fontSize: '14px'}}>
                🔐 Dual Authentication
              </p>
              <p style={{margin: 0, color: '#ef6c00', fontSize: '13px'}}>
                You can sign in with Google OR username/password.
              </p>
            </div>
          )}

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

        {/* Only show password fields if user can change password (not Google-only) */}
        {(!authMethod || authMethod.canChangePassword) && (
          <>
            <div>
              <label style={{fontWeight: '600', fontSize: '13px', color: '#4a5568', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Current Password</label>
              <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="Enter current password to change"
            style={{padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s'}}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
          <small style={{fontSize: '11px', color: '#718096', marginTop: '4px', display: 'block'}}>Required only if changing password</small>
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
          </>
        )}

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
      )}
    </div>
  )
}
