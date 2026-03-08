import React, { useEffect, useState, useCallback, useRef } from 'react'
import Login from './Login'
import Seasons from './Seasons'
import Matches from './Matches'
import Predictions from './Predictions'
import Admin from './Admin'
import VoteHistory from './VoteHistory'
import Standings from './Standings'
import Profile from './Profile'
import ToastContainer, { setToastHandler, toast } from './Toast'
import useVersionCheck from './useVersionCheck'
import './styles.css'

// ── User Avatar ───────────────────────────────────────────────────────────────
function UserAvatar({ name, size = 38 }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) : '?'
  const colours = ['#e74c3c','#e67e22','#f39c12','#2ecc71','#1abc9c','#3498db','#9b59b6','#e91e8c']
  const idx = name ? [...name].reduce((a,c)=>a+c.charCodeAt(0),0) % colours.length : 0
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background:`radial-gradient(circle at 35% 35%, ${colours[idx]}dd, ${colours[idx]}99)`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:"'Poppins',sans-serif", fontWeight:'900',
      fontSize: Math.round(size*0.37)+'px', color:'#fff', flexShrink:0,
      boxShadow:`0 0 0 2px rgba(255,255,255,0.6), 0 4px 14px rgba(0,0,0,0.25)`,
      letterSpacing:'0.5px', userSelect:'none',
    }}>{initials}</div>
  )
}

const NAV_ICONS = {seasons:'🏏',admin:'⚙️',history:'📋',standings:'🏆',predictions:'🔮',profile:'👤'}
const NAV_STATE_KEY = 'cm_nav_state'
const VALID_PAGES = new Set(['seasons','matches','admin','history','standings','predictions','profile'])

function readNavState() {
  try {
    const raw = localStorage.getItem(NAV_STATE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!VALID_PAGES.has(parsed?.page)) return null
    return { page: parsed.page, seasonId: Number(parsed.seasonId) || null, adminTab: parsed.adminTab || null }
  } catch {
    return null
  }
}

function writeNavState(page, seasonId, adminTab) {
  try {
    localStorage.setItem(NAV_STATE_KEY, JSON.stringify({ page, seasonId: seasonId || null, adminTab: adminTab || null }))
  } catch {
    // ignore storage failures
  }
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { const u=localStorage.getItem('user'); return u?JSON.parse(u):null } catch{return null}
  })

  // Read initial page & seasonId from URL so hard-refresh restores position
  const [page, setPage] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('page')
    if (p && p !== 'reset-password' && VALID_PAGES.has(p)) return p
    const saved = readNavState()
    return saved?.page || 'seasons'
  })

  const [seasonId, setSeasonId] = useState(() => {
    const s = new URLSearchParams(window.location.search).get('season')
    if (s) return Number(s) || null
    const saved = readNavState()
    return saved?.seasonId || null
  })

  const [adminTab, setAdminTab] = useState(() => {
    const urlTab = new URLSearchParams(window.location.search).get('adminTab')
    if (urlTab) return urlTab
    const saved = readNavState()
    return saved?.adminTab || 'season'
  })

  const [toasts, setToasts] = useState([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Auto-refresh callback triggered every 30 seconds
  const handleAutoRefresh = useCallback(() => {
    // Only refresh if user is logged in
    if (user) {
      setRefreshTrigger(prev => prev + 1)
    }
  }, [user])

  const { updateAvailable, lastRefresh } = useVersionCheck(handleAutoRefresh)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const addToast = useCallback((t) => setToasts(prev=>[...prev,{...t,id:Date.now()+Math.random()}]),[])
  useEffect(()=>{ setToastHandler(addToast) },[addToast])
  const removeToast = useCallback((id)=>setToasts(prev=>prev.filter(t=>t.id!==id)),[])

  // Persist user in localStorage
  useEffect(()=>{
    if(user) localStorage.setItem('user',JSON.stringify(user))
    else localStorage.removeItem('user')
  },[user])

  // Persist nav state so hard refresh can recover even if URL is reset externally
  useEffect(() => {
    writeNavState(page, seasonId, page === 'admin' ? adminTab : null)
  }, [page, seasonId, adminTab])

  const isMounted = useRef(false)

  // Write page + seasonId into the URL every time they change
  // This means hard-refresh will land back on the same page
  useEffect(()=>{
    // Don't overwrite special one-time auth/reset URLs
    const cur = new URLSearchParams(window.location.search)
    if(cur.get('auth')==='success' || cur.get('error') || cur.get('page')==='reset-password') return

    const params = new URLSearchParams()
    if(page && page !== 'seasons') params.set('page', page)
    if(page === 'matches' && seasonId) params.set('season', String(seasonId))
    if(page === 'admin' && adminTab) params.set('adminTab', adminTab)
    const newSearch = params.toString() ? '?' + params.toString() : '/'
    const current = window.location.pathname + window.location.search

    if(current !== newSearch){
      if(!isMounted.current){
        // First render — use replaceState so we don't add a history entry
        window.history.replaceState({ page, seasonId: seasonId || null, adminTab }, '', newSearch)
      } else {
        window.history.pushState({ page, seasonId: seasonId || null, adminTab }, '', newSearch)
      }
    }
    isMounted.current = true
  }, [page, seasonId, adminTab])

  // Handle browser Back / Forward buttons
  useEffect(()=>{
    function onPopState(e){
      const p = e.state?.page || new URLSearchParams(window.location.search).get('page') || 'seasons'
      const s = e.state?.seasonId || (Number(new URLSearchParams(window.location.search).get('season')) || null)
      const tab = e.state?.adminTab || new URLSearchParams(window.location.search).get('adminTab') || 'season'
      setPage(p)
      setSeasonId(s)
      setAdminTab(tab)
    }
    window.addEventListener('popstate', onPopState)
    return ()=> window.removeEventListener('popstate', onPopState)
  }, [])

  // Handle auth callback / error params
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search)
    if(params.get('page')==='reset-password'&&params.get('token')){ localStorage.removeItem('user');setUser(null);return }
    if(params.get('auth')==='success'){
      try{
        const parsed=JSON.parse(decodeURIComponent(params.get('user')||''))
        localStorage.setItem('user',JSON.stringify(parsed));setUser(parsed)
        window.history.replaceState({ page:'seasons', seasonId:null, adminTab:'season' },'','/')
        toast('success',`Welcome, ${parsed.display_name||parsed.username}! 🏏`,'Ready to make your picks?')
      }catch(e){console.error(e)}
    }
    if(params.get('error')==='pending_approval'){
      toast('info','Account Pending ⏳','Your account needs admin approval. You\'ll get an email once approved.')
      window.history.replaceState({ page:'seasons', seasonId:null, adminTab:'season' },'','/')
    }
    if(params.get('error')==='auth_failed'){
      toast('error','Auth Failed','Google sign-in failed. Try again or use username/password.')
      window.history.replaceState({ page:'seasons', seasonId:null, adminTab:'season' },'','/')
    }
  },[])

  useEffect(()=>{
    if(user) document.body.classList.add('with-cricket-bg')
    else document.body.classList.remove('with-cricket-bg')
    return ()=>document.body.classList.remove('with-cricket-bg')
  },[user])

  function navigate(p){ if(p==='seasons') setSeasonId(null); setPage(p) }

  const navTabs=[
    {key:'seasons',     label:'Seasons'      },
    {key:'admin',       label:'Admin',       adminOnly:true},
    {key:'history',     label:'Vote History' },
    {key:'standings',   label:'Standings'    },
    {key:'predictions', label:'Predictions'  },
    {key:'profile',     label:'Profile'      },
  ].filter(t=>!t.adminOnly||(user?.role==='admin'||user?.role==='superuser'))

  return (
    <div className="container">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── New-version banner ───────────────────────────────────────────── */}
      {updateAvailable && !bannerDismissed && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, zIndex:9999,
          background:'linear-gradient(90deg,#f39c12,#e67e22)',
          color:'#fff', textAlign:'center',
          padding:'10px 16px', fontSize:'14px', fontFamily:"'Poppins',sans-serif",
          display:'flex', alignItems:'center', justifyContent:'center', gap:'12px',
          boxShadow:'0 2px 12px rgba(0,0,0,0.35)'
        }}>
          <span>🚀 <strong>New update available!</strong> Refresh when ready — your session won't be interrupted until you do.</span>
          <button
            onClick={() => { window.location.reload() }}
            style={{
              background:'#fff', color:'#e67e22', border:'none',
              borderRadius:'20px', padding:'4px 16px', fontWeight:'700',
              fontSize:'13px', cursor:'pointer', fontFamily:"'Poppins',sans-serif",
              whiteSpace:'nowrap'
            }}
          >
            Refresh now
          </button>
          <button
            onClick={() => setBannerDismissed(true)}
            style={{
              background:'transparent', color:'rgba(255,255,255,0.8)',
              border:'1px solid rgba(255,255,255,0.4)', borderRadius:'50%',
              width:'22px', height:'22px', cursor:'pointer',
              fontSize:'13px', lineHeight:'1', padding:0, flexShrink:0
            }}
            aria-label="Dismiss"
          >✕</button>
        </div>
      )}

      {user && (
        <header style={{
          position:'sticky', top:0, zIndex:100,
          marginBottom:'20px',
          background:'rgba(10,20,35,0.82)',
          backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)',
          border:'1px solid rgba(255,255,255,0.10)',
          borderRadius:'16px',
          boxShadow:'0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
          padding:'12px 18px',
        }}>
          {/* ── Top row: brand + user chip ── */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',gap:'12px'}}>

            {/* Brand */}
            <div style={{display:'flex',alignItems:'center',gap:'8px',whiteSpace:'nowrap'}}>
              <span style={{fontSize:'clamp(20px,3.5vw,28px)',lineHeight:1,filter:'drop-shadow(0 0 6px rgba(255,180,0,0.5))'}}>🏏</span>
              <span style={{
                fontFamily:"'Poppins',sans-serif",
                fontSize:'clamp(18px,3.5vw,26px)',
                fontWeight:'900', letterSpacing:'-0.5px',
                background:'linear-gradient(90deg,#FFD700 0%,#ffaa00 55%,#ff6600 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                backgroundClip:'text', color:'transparent',
                filter:'drop-shadow(0 0 10px rgba(255,180,0,0.4))',
                lineHeight:1.2,
              }}>Cricket Mela</span>
            </div>

            {/* User chip */}
            <div style={{
              display:'flex', alignItems:'center', gap:'10px',
              background:'rgba(255,255,255,0.07)',
              border:'1px solid rgba(255,255,255,0.13)',
              borderRadius:'40px',
              padding:'5px 6px 5px 5px',
              backdropFilter:'blur(6px)',
            }}>
              <UserAvatar name={user.display_name||user.username} size={34}/>
              <div style={{lineHeight:1.3, paddingRight:'4px'}}>
                <div style={{
                  fontSize:'13px', fontWeight:'700', color:'#fff',
                  fontFamily:"'Poppins',sans-serif", letterSpacing:'0.2px',
                  maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                }}>
                  {user.display_name||user.username}
                </div>
                <div style={{fontSize:'11px', color:'rgba(255,215,0,0.85)', fontWeight:'600'}}>
                  {user.role==='admin' ? (
                    <span style={{
                      fontSize:'10px', fontWeight:'700',
                      background:'rgba(231,76,60,0.2)', color:'#e74c3c',
                      padding:'1px 6px', borderRadius:'8px',
                      border:'1px solid rgba(231,76,60,0.3)',
                      textTransform:'uppercase', letterSpacing:'0.5px',
                    }}>Admin</span>
                  ) : (
                    <span style={{
                      fontSize:'10px', fontWeight:'700',
                      background:'rgba(46,204,113,0.2)', color:'#2ecc71',
                      padding:'1px 6px', borderRadius:'8px',
                      border:'1px solid rgba(46,204,113,0.3)',
                      textTransform:'uppercase', letterSpacing:'0.5px',
                    }}>{user.role}</span>
                  )}
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={()=>{ setUser(null); setPage('seasons'); setSeasonId(null); setAdminTab('season'); localStorage.removeItem(NAV_STATE_KEY); window.history.replaceState({page:'seasons',seasonId:null,adminTab:'season'},'','/'); toast('info','Logged out 👋','See you next match!') }}
                style={{
                  background:'linear-gradient(135deg,#c0392b,#e74c3c)',
                  color:'#fff', border:'none', borderRadius:'20px',
                  padding:'6px 14px', cursor:'pointer',
                  fontSize:'11px', fontWeight:'800',
                  fontFamily:'Inter,sans-serif',
                  letterSpacing:'0.8px', textTransform:'uppercase',
                  boxShadow:'0 3px 10px rgba(231,76,60,0.45)',
                  transition:'all 0.2s ease', flexShrink:0,
                }}
                onMouseOver={e=>{ e.currentTarget.style.background='linear-gradient(135deg,#e74c3c,#c0392b)'; e.currentTarget.style.boxShadow='0 5px 16px rgba(231,76,60,0.65)'; e.currentTarget.style.transform='translateY(-1px)' }}
                onMouseOut={e=>{ e.currentTarget.style.background='linear-gradient(135deg,#c0392b,#e74c3c)'; e.currentTarget.style.boxShadow='0 3px 10px rgba(231,76,60,0.45)'; e.currentTarget.style.transform='translateY(0)' }}
              >Logout</button>
            </div>
          </div>

          {/* ── Nav tabs ── */}
          <nav style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
            {navTabs.map(tab => {
              const active = page === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={()=>navigate(tab.key)}
                  style={{
                    flex:1, minWidth:'65px', padding:'8px 6px',
                    background: active
                      ? 'linear-gradient(135deg,#2ecc71,#27ae60)'
                      : 'rgba(255,255,255,0.06)',
                    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                    border: active ? '1px solid rgba(46,204,113,0.6)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius:'10px', cursor:'pointer',
                    fontWeight:'700', fontSize:'12px',
                    fontFamily:'Inter,sans-serif',
                    transition:'all 0.2s ease',
                    boxShadow: active ? '0 4px 14px rgba(46,204,113,0.4)' : 'none',
                    letterSpacing:'0.3px',
                  }}
                  onMouseOver={e=>{ if(!active){ e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.color='#fff' }}}
                  onMouseOut={e=>{ if(!active){ e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(255,255,255,0.6)' }}}
                >
                  {NAV_ICONS[tab.key]} {tab.label}
                </button>
              )
            })}
          </nav>
        </header>
      )}

      <main>
        {!user ? (
          <Login onLogin={u=>{ setUser(u); toast('success',`Welcome, ${u.display_name||u.username}! 🏏`,'Ready to make your picks?') }}/>
        ):(
          <>
            {page==='seasons'    && <Seasons user={user} onSelect={id=>{setSeasonId(id);setPage('matches')}} refreshTrigger={refreshTrigger}/>}
            {page==='matches'    && seasonId && <Matches seasonId={seasonId} user={user} refreshUser={u=>setUser(u)} refreshTrigger={refreshTrigger}/>}
            {page==='admin'      && <Admin user={user} initialTab={adminTab} onTabChange={setAdminTab} addToast={addToast} refreshTrigger={refreshTrigger}/>}
            {page==='history'    && <VoteHistory user={user} refreshTrigger={refreshTrigger}/>}
            {page==='standings'  && <Standings user={user} refreshTrigger={refreshTrigger}/>}
            {page==='predictions'&& <Predictions user={user} refreshTrigger={refreshTrigger}/>}
            {page==='profile'    && <Profile user={user} refreshUser={u=>setUser(u)}/>}
          </>
        )}
      </main>

      <footer className="disclaimer-ribbon">
        <span style={{color:'#ffe082',fontWeight:'bold'}}>⚠️ Disclaimer:</span>{' '}
        Cricket Mela is a <strong style={{color:'#fff'}}>fun prediction game only</strong> — no real money involved.
        Virtual points have no monetary value and cannot be exchanged for cash.
        This platform must <strong style={{color:'#ff6b6b'}}>not</strong> be used for real-money gambling.
        &nbsp;|&nbsp; 🏏 Play responsibly &amp; enjoy the game!
      </footer>
    </div>
  )
}

