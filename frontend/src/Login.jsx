import React, { useState } from 'react'
import axios from 'axios'

// ── IPL Team Logos - Load from /public/logos/ directory ───────────────────────
// Place PNG files in frontend/public/logos/ with these names:
// csk.png, dc.png, gt.png, kkr.png, lsg.png, mi.png, pbks.png, rr.png, rcb.png, srh.png
const IPL_SVG = {
  CSK: '/logos/csk.png',
  DC: '/logos/dc.png',
  GT: '/logos/gt.png',
  KKR: '/logos/kkr.png',
  LSG: '/logos/lsg.png',
  MI: '/logos/mi.png',
  PBKS: '/logos/pbks.png',
  RR: '/logos/rr.png',
  RCB: '/logos/rcb.png',
  SRH: '/logos/srh.png',
}

const IPL_TEAMS = [
  { abbr: 'CSK',  name: 'Chennai Super Kings',   ring: '#D4AF37' },
  { abbr: 'DC',   name: 'Delhi Capitals',         ring: '#EF1C25' },
  { abbr: 'GT',   name: 'Gujarat Titans',         ring: '#C8A951' },
  { abbr: 'KKR',  name: 'Kolkata Knight Riders',  ring: '#F2C75C' },
  { abbr: 'LSG',  name: 'Lucknow Super Giants',   ring: '#A0C4E8' },
  { abbr: 'MI',   name: 'Mumbai Indians',         ring: '#D1AB3E' },
  { abbr: 'PBKS', name: 'Punjab Kings',           ring: '#A7A9AC' },
  { abbr: 'RR',   name: 'Rajasthan Royals',       ring: '#EA1A85' },
  { abbr: 'RCB',  name: 'Royal Challengers',      ring: '#FFD700' },
  { abbr: 'SRH',  name: 'Sunrisers Hyderabad',    ring: '#FF8C00' },
]

// White-circle IPL badge with image logo inside
function IplBadge({ team, size = 72 }) {
  return (
    <div title={team.name} style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      background: '#fff',
      border: `3px solid ${team.ring}`,
      boxShadow: `0 4px 18px rgba(0,0,0,0.55), 0 0 10px ${team.ring}88`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0, cursor: 'default',
      transition: 'transform 0.22s, box-shadow 0.22s',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform='scale(1.18)'; e.currentTarget.style.boxShadow=`0 8px 28px rgba(0,0,0,0.65), 0 0 18px ${team.ring}` }}
    onMouseLeave={e => { e.currentTarget.style.transform='scale(1)';    e.currentTarget.style.boxShadow=`0 4px 18px rgba(0,0,0,0.55), 0 0 10px ${team.ring}88` }}
    >
      <img
        src={IPL_SVG[team.abbr]}
        alt={team.name}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover',
          borderRadius: '50%',
        }}
        onError={(e) => {
          // Fallback: display team name if image fails to load
          e.target.style.display = 'none'
        }}
      />
    </div>
  )
}

// Coloured circle badge for international teams (flag colours)
function IntlBadge({ team }) {
  return (
    <div title={team.name} style={{
      width: '62px', height: '62px', borderRadius: '50%',
      background: `radial-gradient(circle at 38% 35%, ${team.bg}ee 0%, ${team.bg} 100%)`,
      border: `2.5px solid ${team.ring}`,
      boxShadow: `0 3px 14px rgba(0,0,0,0.45), 0 0 8px ${team.ring}55`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      cursor: 'default', flexShrink: 0,
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform='scale(1.15)'; e.currentTarget.style.boxShadow=`0 6px 20px rgba(0,0,0,0.55), 0 0 14px ${team.ring}` }}
    onMouseLeave={e => { e.currentTarget.style.transform='scale(1)';    e.currentTarget.style.boxShadow=`0 3px 14px rgba(0,0,0,0.45), 0 0 8px ${team.ring}55` }}
    >
      <span style={{ fontSize: team.abbr.length > 3 ? '8px' : '11px', fontWeight:'900',
        color: team.fg, textShadow:'0 1px 3px rgba(0,0,0,0.8)',
        fontFamily:"'Poppins',sans-serif", lineHeight:1, textAlign:'center' }}>
        {team.abbr}
      </span>
      <span style={{ fontSize:'5px', color:team.fg, opacity:0.85, marginTop:'2px',
        fontFamily:"'Inter',sans-serif", letterSpacing:'0.3px', textAlign:'center', padding:'0 4px' }}>
        {team.name.toUpperCase()}
      </span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const [isReset,  setIsReset]  = useState(false)
  const [resetToken, setResetToken] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email,    setEmail]    = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [error,    setError]    = useState(null)
  const [message,  setMessage]  = useState(null)
  const [loading,  setLoading]  = useState(false)

  // Check URL for reset token on mount
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const page = params.get('page')
    const token = params.get('token')
    if (page === 'reset-password' && token) {
      setResetToken(token)
      setIsReset(true)
      // Validate token with backend
      axios.get(`/api/reset-password/validate/${token}`)
        .then(res => {
          if (!res.data.valid) {
            setIsReset(false)
            setError(res.data.error || 'Invalid or expired reset link. Please request a new one.')
          }
        })
        .catch(() => {
          setIsReset(false)
          setError('Invalid or expired reset link. Please request a new one.')
        })
    }
  }, [])

  function goToLogin() {
    setIsSignup(false); setIsForgot(false); setIsReset(false)
    setError(null); setMessage(null)
    setForgotEmail(''); setNewPassword(''); setConfirmPassword('')
  }

  // Google Sign-In handler
  const handleGoogleLogin = () => {
    window.location.href = '/auth/google';
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setError(null); setMessage(null)
    if (!forgotEmail) return setError('Please enter your email address')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) return setError('Enter a valid email address')
    setLoading(true)
    try {
      const res = await axios.post('/api/forgot-password', { email: forgotEmail })
      setLoading(false)
      setMessage(res.data.message || 'If that email is registered, a reset link has been sent.')
    } catch (err) {
      setLoading(false)
      setError(err.response?.data?.error || 'Failed to send reset email. Try again.')
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError(null); setMessage(null)
    if (!newPassword) return setError('Enter a new password')
    if (newPassword.length < 6) return setError('Password must be at least 6 characters')
    if (newPassword !== confirmPassword) return setError('Passwords do not match')
    setLoading(true)
    try {
      const res = await axios.post(`/api/reset-password/${resetToken}`, { password: newPassword })
      setLoading(false)
      setMessage(res.data.message || 'Password reset successfully!')
      // Clear URL params and go back to login after 2 seconds
      setTimeout(() => {
        window.history.replaceState({}, '', '/')
        goToLogin()
      }, 2500)
    } catch (err) {
      setLoading(false)
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.')
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError(null); setMessage(null)
    if (isSignup) {
      if (!username || !password) return setError('Enter username and password')
      if (!email) return setError('Enter email address')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address')
      setLoading(true)
      try {
        await axios.post('/api/signup', { username, password, email })
        setLoading(false)
        setMessage('Signup submitted! Wait for admin approval.')
        setIsSignup(false); setPassword(''); setEmail('')
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
      setLoading(false); onLogin(res.data)
    } catch (err) {
      setLoading(false)
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100%', boxSizing: 'border-box',
      padding: '24px 16px 70px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Inter', sans-serif",
      background: 'linear-gradient(170deg, #0a0a1a 0%, #0d2137 30%, #0a3320 60%, #1a0a08 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Stadium spotlight glows */}
      <div style={{ position:'absolute', top:'-80px', left:'50%', transform:'translateX(-50%)',
        width:'700px', height:'400px',
        background:'radial-gradient(ellipse, rgba(255,200,50,0.1) 0%, transparent 70%)',
        pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'220px',
        background:'radial-gradient(ellipse at 50% 100%, rgba(0,180,80,0.12) 0%, transparent 70%)',
        pointerEvents:'none', zIndex:0 }} />

      {/* ── TITLE ── */}
      <div style={{ textAlign:'center', marginBottom:'40px', position:'relative', zIndex:1 }}>
        <h1 style={{
          fontFamily:"'Poppins', sans-serif", margin:0,
          fontSize:'clamp(28px, 5vw, 46px)', fontWeight:'900', letterSpacing:'3px', lineHeight:1.1,
          background:'linear-gradient(180deg, #FFD700 0%, #FF8C00 50%, #FF4500 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          filter:'drop-shadow(0 2px 10px rgba(255,160,0,0.6))',
        }}>🏏 CRICKET MELA</h1>
        <div style={{ fontSize:'clamp(11px, 2vw, 13px)', color:'#acd8ff',
          letterSpacing:'4px', textTransform:'uppercase', marginTop:'5px', fontWeight:'600' }}>
          IPL &amp; International Prediction Game
        </div>
        <div style={{ margin:'10px auto 0', width:'140px', height:'2px',
          background:'linear-gradient(90deg, transparent, #FFD700, transparent)' }} />
      </div>

      {/* ── MAIN CONTAINER: Logos Left + Login Card Right ── */}
      <div style={{
        position:'relative', zIndex:1,
        width:'100%', maxWidth:'1100px',
        display:'flex',
        alignItems:'flex-start',
        justifyContent:'space-around',
        gap:'20px',
        flexWrap: window.innerWidth > 768 ? 'nowrap' : 'wrap',
      }}>

        {/* ── LEFT SIDE: GRID LOGO ARRANGEMENT ── */}
        <div style={{
          position:'relative',
          flex: window.innerWidth > 768 ? '0 0 auto' : '1 1 100%',
          minWidth: '300px',
          maxWidth:'480px',
        }}>
          {/* Title for logos section */}
          <div style={{
            fontSize:'13px', color:'rgba(255,200,50,0.75)', textAlign:'center',
            letterSpacing:'2px', textTransform:'uppercase', marginBottom:'20px', fontWeight:'700',
            position:'relative', zIndex:2,
          }}>
          </div>

          {/* Grid layout container */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 80px)',
            gridTemplateRows: 'repeat(4, 100px)',
            gap: '30px 0px',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}>
            {/* Row 1: 3 logos (SRH, DC, GT) - columns 1, 3, 5 */}
            <div style={{ gridColumn: '1', gridRow: '1', justifySelf: 'center' }}>
              <IplBadge team={IPL_TEAMS[9]} size={100} />
            </div>
            <div style={{ gridColumn: '3', gridRow: '1', justifySelf: 'center' }}>
              <IplBadge team={IPL_TEAMS[1]} size={100} />
            </div>
            <div style={{ gridColumn: '5', gridRow: '1', justifySelf: 'center' }}>
              <IplBadge team={IPL_TEAMS[2]} size={100} />
            </div>

            {/* Row 2: 2 logos (RR, PBKS) - columns 2, 4 (between Row 1) */}
            <div style={{ gridColumn: '2', gridRow: '2', justifySelf: 'center' }}>
              <IplBadge team={IPL_TEAMS[7]} size={100} />
            </div>
            <div style={{ gridColumn: '4', gridRow: '2', justifySelf: 'center' }}>
              <IplBadge team={IPL_TEAMS[6]} size={100} />
            </div>

            {/* Row 3: 3 logos (MI, CSK, KKR) - columns 1, 3, 5 (same as Row 1) */}
            <div style={{ gridColumn: '1', gridRow: '3', justifySelf: 'center' }}>
              <IplBadge team={IPL_TEAMS[5]} size={100} />
            </div>
            <div style={{ gridColumn: '3', gridRow: '3', justifySelf: 'center' }}>
              <IplBadge team={IPL_TEAMS[0]} size={100} />
            </div>
            <div style={{ gridColumn: '5', gridRow: '3', justifySelf: 'center' }}>
              <IplBadge team={IPL_TEAMS[3]} size={100} />
            </div>

            {/* Row 4: 2 logos (LSG, RCB) - columns 2, 4 (between Row 3, same as Row 2) */}
            <div style={{ gridColumn: '2', gridRow: '4', justifySelf: 'center' }}>
              <IplBadge team={IPL_TEAMS[4]} size={100} />
            </div>
            <div style={{ gridColumn: '4', gridRow: '4', justifySelf: 'center' }}>
              <IplBadge team={IPL_TEAMS[8]} size={100} />
            </div>
          </div>
        </div>

      {/* ── RIGHT SIDE: LOGIN CARD ── */}
      <div style={{
        position:'relative', zIndex:1,
        flex: window.innerWidth > 768 ? '0 0 auto' : '1 1 100%',
        minWidth: '280px',
        maxWidth:'380px',
        background:'rgba(255,255,255,0.07)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        borderRadius:'20px',
        border:'1px solid rgba(255,220,80,0.3)',
        boxShadow:'0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        padding:'28px 28px 22px',
      }}>
        {/* Card icon — fancy cricket bat SVG, no external image */}
        <div style={{ textAlign:'center', marginBottom:'20px' }}>
          <div style={{
            width:'60px', height:'60px', margin:'0 auto 10px', borderRadius:'50%',
            background:'linear-gradient(135deg, #1a3a2a 0%, #0d2137 100%)',
            border:'2px solid rgba(255,200,50,0.55)',
            boxShadow:'0 0 18px rgba(255,160,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="14" y="3" width="5" height="18" rx="2.5" fill="#D4A847" transform="rotate(15 14 3)"/>
              <rect x="13" y="19" width="6" height="4" rx="1" fill="#8B5E1A" transform="rotate(15 13 19)"/>
              <circle cx="8" cy="25" r="5" fill="#C8102E"/>
              <path d="M5 22 Q8 26 11 22" stroke="#fff" strokeWidth="1" fill="none"/>
              <path d="M5 28 Q8 24 11 28" stroke="#fff" strokeWidth="1" fill="none"/>
            </svg>
          </div>
          <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:'17px', fontWeight:'800', color:'#fff', letterSpacing:'1px' }}>
            {isReset ? '🔐 RESET PASSWORD' : isForgot ? '📧 FORGOT PASSWORD' : isSignup ? '📝 SIGN UP' : '🔐 LOGIN'}
          </div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.5)', marginTop:'2px' }}>
            {isReset ? 'Enter your new password' : isForgot ? 'We\'ll send you a reset link' : isSignup ? 'Create your account' : 'Welcome back, champion!'}
          </div>
        </div>

        {/* ── FORGOT PASSWORD FORM ── */}
        {isForgot && (
          <form onSubmit={handleForgotPassword} style={{ display:'flex', flexDirection:'column', gap:'11px' }}>
            <Field icon="✉️" type="email" placeholder="Your registered email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
            {error && (
              <>
                <Alert type="error">{error}</Alert>
                {/* If error mentions Google, show a Sign in with Google shortcut */}
                {error.toLowerCase().includes('google') && (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    style={{
                      padding:'10px', background:'white', color:'#5f6368',
                      border:'1px solid #dadce0', borderRadius:'10px',
                      fontSize:'13px', fontWeight:'600', cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    Sign in with Google instead
                  </button>
                )}
              </>
            )}
            {message && <Alert type="success">{message}</Alert>}
            {!message && (
              <button type="submit" disabled={loading} style={{
                marginTop:'4px', padding:'12px',
                background: loading ? 'rgba(120,120,120,0.4)' : 'linear-gradient(90deg, #e65c00 0%, #f9d423 50%, #e65c00 100%)',
                color: loading ? '#aaa' : '#1a0a00',
                border:'none', borderRadius:'10px',
                fontSize:'15px', fontWeight:'900',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing:'1.5px',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(230,92,0,0.5)',
                fontFamily:"'Poppins', sans-serif",
              }}>
                {loading ? '⏳ Sending…' : '📧 SEND RESET LINK'}
              </button>
            )}
            <div style={{ textAlign:'center', fontSize:'13px', color:'rgba(255,255,255,0.6)', marginTop:'4px' }}>
              <span onClick={goToLogin} style={{ color:'#f9d423', fontWeight:'700', cursor:'pointer', textDecoration:'underline' }}>
                ← Back to Login
              </span>
            </div>
          </form>
        )}

        {/* ── RESET PASSWORD FORM ── */}
        {isReset && (
          <form onSubmit={handleResetPassword} style={{ display:'flex', flexDirection:'column', gap:'11px' }}>
            <Field icon="🔒" type="password" placeholder="New password (min 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <Field icon="🔒" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            {error   && <Alert type="error">{error}</Alert>}
            {message && <Alert type="success">{message}</Alert>}
            {!message && (
              <button type="submit" disabled={loading} style={{
                marginTop:'4px', padding:'12px',
                background: loading ? 'rgba(120,120,120,0.4)' : 'linear-gradient(90deg, #e65c00 0%, #f9d423 50%, #e65c00 100%)',
                color: loading ? '#aaa' : '#1a0a00',
                border:'none', borderRadius:'10px',
                fontSize:'15px', fontWeight:'900',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing:'1.5px',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(230,92,0,0.5)',
                fontFamily:"'Poppins', sans-serif",
              }}>
                {loading ? '⏳ Resetting…' : '🔐 RESET PASSWORD'}
              </button>
            )}
            <div style={{ textAlign:'center', fontSize:'13px', color:'rgba(255,255,255,0.6)', marginTop:'4px' }}>
              <span onClick={goToLogin} style={{ color:'#f9d423', fontWeight:'700', cursor:'pointer', textDecoration:'underline' }}>
                ← Back to Login
              </span>
            </div>
          </form>
        )}

        {/* ── LOGIN / SIGNUP FORM ── */}
        {!isForgot && !isReset && (
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'11px' }}>
          {/* Google Sign-In Button (only show for login, not signup) */}
          {!isSignup && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'white',
                  color: '#5f6368',
                  border: '1px solid #dadce0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#f8f9fa'
                  e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'white'
                  e.target.style.boxShadow = 'none'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Sign in with Google
              </button>

              <div style={{
                textAlign: 'center',
                margin: '8px 0',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '1px'
              }}>
                OR
              </div>
            </>
          )}

          <Field icon="👤" type="text"     placeholder="Username"     value={username} onChange={e => setUsername(e.target.value)} />
          <Field icon="🔒" type="password" placeholder="Password"     value={password} onChange={e => setPassword(e.target.value)} />
          {isSignup && <Field icon="✉️" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />}

          {/* Forgot password link — only on login form */}
          {!isSignup && (
            <div style={{ textAlign:'right', marginTop:'-4px' }}>
              <span
                onClick={() => { setIsForgot(true); setError(null); setMessage(null) }}
                style={{ fontSize:'12px', color:'rgba(200,200,255,0.7)', cursor:'pointer', textDecoration:'underline' }}
              >
                Forgot password?
              </span>
            </div>
          )}

          {error   && <Alert type="error">{error}</Alert>}
          {message && <Alert type="success">{message}</Alert>}

          <button type="submit" disabled={loading} style={{
            marginTop:'4px', padding:'12px',
            background: loading ? 'rgba(120,120,120,0.4)' : 'linear-gradient(90deg, #e65c00 0%, #f9d423 50%, #e65c00 100%)',
            color: loading ? '#aaa' : '#1a0a00',
            border:'none', borderRadius:'10px',
            fontSize:'15px', fontWeight:'900',
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing:'1.5px',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(230,92,0,0.5)',
            fontFamily:"'Poppins', sans-serif",
          }}>
            {loading ? '⏳ Please wait…' : isSignup ? '🚀 CREATE ACCOUNT' : "🏏 LET'S PLAY!"}
          </button>
        </form>
        )}

        {!isForgot && !isReset && (
        <div style={{ marginTop:'14px', textAlign:'center', fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>
          {isSignup ? (
            <>Already have an account?{' '}
              <span onClick={() => { setIsSignup(false); setError(null); setMessage(null); setEmail('') }}
                style={{ color:'#f9d423', fontWeight:'700', cursor:'pointer', textDecoration:'underline' }}>
                Back to Login
              </span>
            </>
          ) : (
            <>Not a member?{' '}
              <span onClick={() => { setIsSignup(true); setError(null); setMessage(null) }}
                style={{ color:'#f9d423', fontWeight:'700', cursor:'pointer', textDecoration:'underline' }}>
                Sign up now
              </span>
            </>
          )}
        </div>
        )}

        {/* Disclaimer */}
        <div style={{
          marginTop:'16px', padding:'9px 12px',
          background:'rgba(0,0,0,0.38)', borderRadius:'8px',
          border:'1px solid rgba(255,200,50,0.22)',
          fontSize:'10.5px', color:'rgba(255,240,180,0.8)', lineHeight:'1.6', textAlign:'center',
        }}>
          ⚠️ <strong style={{ color:'#f9d423' }}>Disclaimer:</strong> Cricket Mela is a{' '}
          <strong>fun prediction game only</strong>. No real money involved.
          Points are virtual with no monetary value. Must{' '}
          <strong style={{ color:'#ff7070' }}>not</strong> be used for real-money gambling.
        </div>
      </div>
      </div>

      {/* Green pitch line at bottom */}
      <div style={{ position:'absolute', bottom:'48px', left:0, right:0, height:'3px',
        background:'linear-gradient(90deg, transparent 0%, rgba(0,160,50,0.4) 20%, rgba(0,220,70,0.8) 50%, rgba(0,160,50,0.4) 80%, transparent 100%)',
        pointerEvents:'none' }} />
    </div>
  )
}

// ── Reusable field ─────────────────────────────────────────────────────────────
function Field({ icon, type, placeholder, value, onChange }) {
  return (
    <div style={{ position:'relative' }}>
      <span style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', fontSize:'15px', lineHeight:1 }}>{icon}</span>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} style={{
        width:'100%', padding:'11px 13px 11px 42px', boxSizing:'border-box',
        background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.22)',
        borderRadius:'9px', fontSize:'14px', color:'#fff', outline:'none',
        fontFamily:"'Inter', sans-serif",
      }} />
    </div>
  )
}

// ── Reusable alert ─────────────────────────────────────────────────────────────
function Alert({ type, children }) {
  const isErr = type === 'error'
  return (
    <div style={{
      background: isErr ? 'rgba(220,50,50,0.22)' : 'rgba(40,180,80,0.22)',
      border:`1px solid ${isErr ? 'rgba(255,100,100,0.5)' : 'rgba(80,200,80,0.5)'}`,
      borderRadius:'8px', padding:'8px 12px',
      fontSize:'12.5px', color: isErr ? '#ffaaaa' : '#aaffbb', textAlign:'center',
    }}>
      {isErr ? '⚠️' : '✅'} {children}
    </div>
  )
}
