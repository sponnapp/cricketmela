import React, { useEffect, useState } from 'react'
import axios from 'axios'

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 40 }) {
  const initials = name ? name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) : '?'
  const colours = ['#e74c3c','#e67e22','#f39c12','#2ecc71','#1abc9c','#3498db','#9b59b6','#e91e8c']
  const idx = name ? [...name].reduce((a,c)=>a+c.charCodeAt(0),0) % colours.length : 0
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background:`radial-gradient(circle at 35% 35%, ${colours[idx]}ee, ${colours[idx]}99)`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:"'Poppins',sans-serif", fontWeight:'900',
      fontSize:Math.round(size*0.36)+'px', color:'#fff', flexShrink:0,
      boxShadow:`0 3px 10px rgba(0,0,0,0.22)`, userSelect:'none',
    }}>{initials}</div>
  )
}

// ── Podium Card ───────────────────────────────────────────────────────────────
function PodiumCard({ u, rank, isMe }) {
  const medals  = ['🥇','🥈','🥉']
  const heights = ['130px','100px','80px']
  const displayOrder = [1, 0, 2]   // centre=gold, left=silver, right=bronze
  const colours = [
    'linear-gradient(160deg,#FFD700,#FFA500)',
    'linear-gradient(160deg,#D0D0D0,#A8A8A8)',
    'linear-gradient(160deg,#CD7F32,#9A5B1A)',
  ]
  const glows = [
    '0 6px 28px rgba(255,215,0,0.55)',
    '0 4px 18px rgba(192,192,192,0.45)',
    '0 4px 18px rgba(205,127,50,0.45)',
  ]

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      order: displayOrder[rank],
      flex: rank===0 ? '0 0 150px' : '0 0 120px',
    }}>
      <div style={{fontSize:rank===0?'32px':'22px', marginBottom:'6px', filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}}>{medals[rank]}</div>

      <div style={{marginBottom:'8px', transform:rank===0?'scale(1.12)':'scale(1)', transition:'transform 0.3s'}}>
        <Avatar name={u.display_name||u.username} size={rank===0?58:44}/>
      </div>

      <div style={{
        fontSize:rank===0?'14px':'12px', fontWeight:'800',
        color: isMe ? '#4a3ea8' : '#1a1a1a',
        marginBottom:'4px', textAlign:'center',
        fontFamily:"'Poppins',sans-serif",
        maxWidth:'130px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
      }}>
        {u.display_name||u.username}{isMe?' (You)':''}
      </div>

      <div style={{
        fontSize:rank===0?'17px':'13px', fontWeight:'900',
        color:'#333', marginBottom:'10px',
        fontFamily:"'Poppins',sans-serif",
      }}>
        {Math.round(u.balance)} <span style={{fontSize:'10px',fontWeight:'600',color:'#777'}}>pts</span>
      </div>

      {/* Podium block */}
      <div style={{
        width:'100%', height:heights[rank],
        background: colours[rank],
        borderRadius:'10px 10px 0 0',
        boxShadow: isMe ? `0 0 0 3px #667eea, ${glows[rank]}` : glows[rank],
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all 0.3s',
      }}>
        <span style={{
          fontFamily:"'Poppins',sans-serif", fontWeight:'900',
          fontSize:'22px', color:'rgba(255,255,255,0.75)',
        }}>#{rank+1}</span>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Standings({ user: currentUser }) {
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/standings')
      .then(r => {
        const filtered = (r.data||[]).filter(u=>u.role!=='admin').sort((a,b)=>b.balance-a.balance)
        setStandings(filtered)
        setLoading(false)
      })
      .catch(() => { setStandings([]); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{padding:'40px', textAlign:'center'}}>
      <div style={{fontSize:'40px', marginBottom:'12px', animation:'spin 1s linear infinite'}}>🏏</div>
      <div style={{color:'#555', fontFamily:'Inter,sans-serif', fontSize:'14px'}}>Loading standings…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (standings.length === 0) return (
    <div style={{padding:'40px', textAlign:'center', color:'#666'}}>No players yet.</div>
  )

  const top3   = standings.slice(0, 3)
  const rest   = standings.slice(3)
  const leader = standings[0]?.balance || 1
  const myRank = currentUser ? standings.findIndex(u => u.username === currentUser.username) : -1

  return (
    <div style={{padding:'20px', fontFamily:'Inter,sans-serif'}}>

      {/* Title */}
      <h2 style={{
        fontFamily:"'Poppins',sans-serif", fontSize:'26px', fontWeight:'800',
        marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px',
      }}>
        <span>🏆</span>
        <span style={{
          background:'linear-gradient(90deg,#FFD700,#ff8c00)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          backgroundClip:'text', color:'transparent',
        }}>Leaderboard</span>
      </h2>

      {/* Your rank banner */}
      {myRank >= 0 && (
        <div style={{
          marginBottom:'20px', padding:'10px 18px',
          background:'rgba(255,255,255,0.88)',
          backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
          border:'1px solid rgba(102,126,234,0.35)', borderRadius:'12px',
          fontSize:'13px', fontWeight:'700', color:'#4a3ea8',
          display:'inline-flex', alignItems:'center', gap:'8px',
          boxShadow:'0 3px 12px rgba(102,126,234,0.18)',
        }}>
          👤 You are ranked
          <strong style={{fontSize:'17px', color:'#667eea'}}>#{myRank+1}</strong>
          {myRank === 0 && <span style={{color:'#e67e22'}}>🔥 You&apos;re leading!</span>}
          {myRank === 1 && <span style={{color:'#7f8c8d'}}>⚡ So close to #1!</span>}
        </div>
      )}

      {/* Podium */}
      {top3.length >= 1 && (
        <div style={{
          background:'rgba(255,255,255,0.65)',
          backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
          borderRadius:'16px', padding:'28px 20px 0',
          marginBottom:'20px',
          boxShadow:'0 4px 24px rgba(0,0,0,0.08)',
          border:'1px solid rgba(255,255,255,0.6)',
        }}>
          <div style={{display:'flex', justifyContent:'center', alignItems:'flex-end', gap:'10px', flexWrap:'wrap'}}>
            {top3.map((u, rank) => (
              <PodiumCard
                key={u.id} u={u} rank={rank}
                isMe={currentUser?.username === u.username}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rest of table */}
      {rest.length > 0 && (
        <div style={{
          background:'rgba(255,255,255,0.72)',
          backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
          borderRadius:'14px', overflow:'hidden',
          boxShadow:'0 4px 16px rgba(0,0,0,0.08)',
          border:'1px solid rgba(255,255,255,0.6)',
        }}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'linear-gradient(135deg,#667eea,#764ba2)', color:'white'}}>
                <th style={{padding:'12px 16px', textAlign:'center', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', width:'60px'}}>Rank</th>
                <th style={{padding:'12px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px'}}>Player</th>
                <th style={{padding:'12px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px'}}>Progress</th>
                <th style={{padding:'12px 16px', textAlign:'right', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', width:'100px'}}>Points</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((u, i) => {
                const rank  = i + 4
                const isMe  = currentUser?.username === u.username
                const pct   = Math.max(5, Math.round((u.balance / leader) * 100))
                const evenBg = isMe ? 'rgba(102,126,234,0.08)' : (i%2===0 ? 'rgba(255,255,255,0.55)' : 'rgba(248,249,252,0.55)')
                return (
                  <tr key={u.id}
                    style={{borderBottom:'1px solid rgba(0,0,0,0.04)', background:evenBg, transition:'background 0.2s'}}
                    onMouseOver={e=>e.currentTarget.style.background='rgba(102,126,234,0.07)'}
                    onMouseOut={e=>e.currentTarget.style.background=evenBg}
                  >
                    <td style={{padding:'12px 16px', textAlign:'center', fontWeight:'700', fontSize:'15px', color:'#667eea'}}>#{rank}</td>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <Avatar name={u.display_name||u.username} size={32}/>
                        <span style={{fontWeight:'700', fontSize:'13px', color: isMe ? '#4a3ea8' : '#2d3748'}}>
                          {u.display_name||u.username}{isMe?' (You)':''}
                        </span>
                      </div>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{background:'rgba(0,0,0,0.08)', borderRadius:'99px', height:'6px', overflow:'hidden'}}>
                        <div style={{
                          height:'100%', borderRadius:'99px', width:pct+'%',
                          background:'linear-gradient(90deg,#667eea,#764ba2)',
                          transition:'width 0.6s ease',
                        }}/>
                      </div>
                    </td>
                    <td style={{padding:'12px 16px', textAlign:'right', fontWeight:'800', fontSize:'15px', color:'#667eea', fontFamily:"'Poppins',sans-serif"}}>
                      {Math.round(u.balance)}
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
