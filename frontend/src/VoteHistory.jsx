import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function VoteHistory({ user }) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    if (user.role === 'admin') {
      setVotes([])
      setLoading(false)
      return
    }
    setLoading(true)
    axios.get(`/api/users/${user.id}/votes`)
      .then(r => { setVotes(r.data); setLoading(false) })
      .catch(() => { setVotes([]); setLoading(false) })
  }, [user])

  return (
    <div style={{padding: '20px', fontFamily: 'Inter, sans-serif'}}>
      <h2 style={{fontFamily: 'Poppins, sans-serif', fontSize: '28px', fontWeight: '600', letterSpacing: '-0.5px', marginBottom: '25px'}}>📊 Your Vote History</h2>
      <div style={{marginBottom: '20px', fontSize: '14px'}}>
        <strong style={{fontSize: '16px', color: '#667eea'}}>Current Balance: {Math.round(user?.balance ?? 0)} points</strong>
      </div>
      {user?.role === 'admin' ? (
        <p style={{fontSize: '14px', color: '#718096'}}>Admin accounts do not participate in voting.</p>
      ) : loading ? (
        <p style={{fontSize: '14px', color: '#718096'}}>Loading votes...</p>
      ) : votes.length === 0 ? (
        <p style={{fontSize: '14px', color: '#718096'}}>No votes yet.</p>
      ) : (
        <div style={{overflowX: 'auto', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', border: '1px solid #e8e8e8'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white'}}>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Match</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Your Vote</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Points Voted</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Winner</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Result</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Total Payout</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Net</th>
              </tr>
            </thead>
            <tbody>
              {votes.map((v, idx) => (
                <tr key={v.id} style={{borderBottom: '1px solid #f0f0f0', backgroundColor: idx % 2 === 0 ? '#fafbfc' : 'white'}}>
                  <td style={{padding: '14px 12px', fontSize: '13px', color: '#2d3748'}}>{v.home_team} vs {v.away_team}</td>
                  <td style={{padding: '14px 12px', fontSize: '13px', fontWeight: '600', color: '#667eea'}}>{v.team}</td>
                  <td style={{padding: '14px 12px', fontSize: '13px', fontWeight: '600', color: '#4a5568'}}>{v.points}</td>
                  <td style={{padding: '14px 12px', fontSize: '13px', color: '#2d3748'}}>{v.winner || 'TBD'}</td>
                  <td style={{padding: '14px 12px', fontSize: '13px', fontWeight: '600'}}>
                    {!v.winner ? <span style={{color: '#ed8936'}}>⏳ Pending</span> : v.team === v.winner ? <span style={{color: '#38a169'}}>✅ Won</span> : <span style={{color: '#e53e3e'}}>❌ Lost</span>}
                  </td>
                  <td style={{padding: '14px 12px', fontSize: '13px', fontWeight: '600'}}>
                    {v.total_payout === null || v.total_payout === undefined ? (
                      <span style={{color: '#a0aec0'}}>—</span>
                    ) : (
                      <span style={{color: v.total_payout > 0 ? '#2d3748' : '#718096'}}>{Math.round(v.total_payout)}</span>
                    )}
                  </td>
                  <td style={{padding: '14px 12px', fontSize: '13px', fontWeight: '600'}}>
                    {v.net_points === null || v.net_points === undefined ? (
                      <span style={{color: '#a0aec0'}}>—</span>
                    ) : v.net_points >= 0 ? (
                      <span style={{color: '#38a169'}}>+{Math.round(v.net_points)}</span>
                    ) : (
                      <span style={{color: '#e53e3e'}}>{Math.round(v.net_points)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
