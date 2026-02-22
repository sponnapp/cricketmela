import React, { useState } from 'react'
import axios from 'axios'

export default function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (isSignup) {
      if (!username || !password || !displayName) return setError('Enter username, password, and display name')
      setLoading(true)
      try {
        await axios.post('/api/signup', { username, password, display_name: displayName })
        setLoading(false)
        setMessage('Signup submitted. Wait for admin approval.')
        setIsSignup(false)
        setPassword('')
      } catch (err) {
        setLoading(false)
        setError(err.response?.data?.error || 'Signup failed')
      }
      return
    }

    if (!username || !password) return setError('Enter username and password')
    setLoading(true)
    try {
      const res = await axios.post('/api/login', { username, password })
      setLoading(false)
      onLogin(res.data)
    } catch (err) {
      setLoading(false)
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #E91E8C 0%, #9B59B6 50%, #3498DB 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    },
    card: {
      background: 'white',
      borderRadius: '12px',
      padding: '50px 40px',
      maxWidth: '400px',
      width: '100%',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
      textAlign: 'center'
    },
    logo: {
      width: '80px',
      height: '80px',
      margin: '0 auto 30px',
      display: 'block'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '30px',
      letterSpacing: '1px'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    },
    inputWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    },
    icon: {
      position: 'absolute',
      left: '15px',
      fontSize: '18px',
      color: '#999',
      zIndex: 1
    },
    input: {
      width: '100%',
      padding: '12px 12px 12px 45px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: '#f5f5f5',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box',
      outline: 'none'
    },
    inputFocus: {
      backgroundColor: '#fff',
      borderColor: '#E91E8C',
      boxShadow: '0 0 0 3px rgba(233, 30, 140, 0.1)'
    },
    button: {
      padding: '12px',
      backgroundColor: '#E91E8C',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginTop: '10px',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    buttonHover: {
      backgroundColor: '#C71A70',
      transform: 'translateY(-2px)',
      boxShadow: '0 5px 20px rgba(233, 30, 140, 0.4)'
    },
    buttonDisabled: {
      opacity: 0.7,
      cursor: 'not-allowed'
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      margin: '20px 0',
      color: '#999',
      fontSize: '14px'
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      backgroundColor: '#ddd'
    },
    socialContainer: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'center',
      marginTop: '15px'
    },
    socialButton: {
      flex: 1,
      padding: '10px',
      border: '1px solid #ddd',
      backgroundColor: '#fff',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      color: '#333'
    },
    socialButtonHover: {
      backgroundColor: '#f5f5f5',
      borderColor: '#E91E8C'
    },
    error: {
      color: '#E74C3C',
      fontSize: '13px',
      marginTop: '-10px',
      textAlign: 'left'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '13px',
      color: '#666',
      marginTop: '5px',
      marginBottom: '10px'
    },
    checkboxInput: {
      marginRight: '8px',
      cursor: 'pointer',
      accentColor: '#E91E8C'
    },
    link: {
      color: '#E91E8C',
      textDecoration: 'none',
      cursor: 'pointer',
      fontWeight: 'bold'
    },
    footerText: {
      marginTop: '20px',
      fontSize: '13px',
      color: '#666'
    }
  }

  const [usernameInputFocused, setUsernameInputFocused] = useState(false)
  const [passwordInputFocused, setPasswordInputFocused] = useState(false)
  const [buttonHovered, setButtonHovered] = useState(false)
  const [facebookHovered, setFacebookHovered] = useState(false)
  const [googleHovered, setGoogleHovered] = useState(false)

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src="/cricket-mela-logo.svg" alt="Cricket Mela" style={styles.logo} />
        <h1 style={styles.title}>{isSignup ? 'SIGN UP' : 'LOGIN'}</h1>

        <form onSubmit={submit} style={styles.form}>
          {/* Username Input */}
          <div style={styles.inputWrapper}>
            <span style={styles.icon}>👤</span>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onFocus={() => setUsernameInputFocused(true)}
              onBlur={() => setUsernameInputFocused(false)}
              style={{
                ...styles.input,
                ...(usernameInputFocused ? styles.inputFocus : {})
              }}
            />
          </div>

          {/* Display Name Input (Signup only) */}
          {isSignup && (
            <div style={styles.inputWrapper}>
              <span style={styles.icon}>🏷️</span>
              <input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onFocus={() => setUsernameInputFocused(true)}
                onBlur={() => setUsernameInputFocused(false)}
                style={{
                  ...styles.input,
                  ...(usernameInputFocused ? styles.inputFocus : {})
                }}
              />
            </div>
          )}

          {/* Password Input */}
          <div style={styles.inputWrapper}>
            <span style={styles.icon}>🔒</span>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPasswordInputFocused(true)}
              onBlur={() => setPasswordInputFocused(false)}
              style={{
                ...styles.input,
                ...(passwordInputFocused ? styles.inputFocus : {})
              }}
            />
          </div>

          {/* Remember Me */}
          {!isSignup && (
            <label style={styles.checkbox}>
              <input type="checkbox" style={styles.checkboxInput} />
              Remember me
            </label>
          )}

          {/* Error/Message */}
          {error && <div style={styles.error}>✗ {error}</div>}
          {message && <div style={{color: '#27ae60', fontSize: '13px', textAlign: 'left'}}>{message}</div>}

          {/* Login/Signup Button */}
          <button
            type="submit"
            disabled={loading}
            onMouseEnter={() => setButtonHovered(true)}
            onMouseLeave={() => setButtonHovered(false)}
            style={{
              ...styles.button,
              ...(buttonHovered && !loading ? styles.buttonHover : {}),
              ...(loading ? styles.buttonDisabled : {})
            }}
          >
            {loading ? (isSignup ? 'SIGNING UP...' : 'LOGGING IN...') : (isSignup ? 'SIGN UP' : 'LOGIN')}
          </button>
        </form>

        {/* Social Login Divider */}
        {!isSignup && (
          <>
            <div style={styles.divider}>
              <div style={styles.dividerLine}></div>
              <span style={{padding: '0 10px'}}>Or login with</span>
              <div style={styles.dividerLine}></div>
            </div>

            {/* Social Login Buttons */}
            <div style={styles.socialContainer}>
              <button
                type="button"
                onMouseEnter={() => setFacebookHovered(true)}
                onMouseLeave={() => setFacebookHovered(false)}
                style={{
                  ...styles.socialButton,
                  ...(facebookHovered ? styles.socialButtonHover : {})
                }}
              >
                👥 Facebook
              </button>
              <button
                type="button"
                onMouseEnter={() => setGoogleHovered(true)}
                onMouseLeave={() => setGoogleHovered(false)}
                style={{
                  ...styles.socialButton,
                  ...(googleHovered ? styles.socialButtonHover : {})
                }}
              >
                🔍 Google
              </button>
            </div>
          </>
        )}

        {/* Footer Text */}
        <div style={styles.footerText}>
          {isSignup ? (
            <>Already have an account? <span style={styles.link} onClick={() => { setIsSignup(false); setError(null); setMessage(null) }}>Back to login</span></>
          ) : (
            <>Not a member? <span style={styles.link} onClick={() => { setIsSignup(true); setError(null); setMessage(null) }}>Sign up now</span></>
          )}
        </div>
      </div>
    </div>
  )
}
