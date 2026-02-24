import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Standings() {
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStandings()
  }, [])

  async function fetchStandings() {
    setLoading(true)
    try {
      const r = await axios.get('/api/standings')
      const filtered = (r.data || []).filter(user => user.role !== 'admin')
      // Sort by balance descending
      const sorted = filtered.sort((a, b) => b.balance - a.balance)
      setStandings(sorted)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching standings:', err)
      setStandings([])
      setLoading(false)
    }
  }

  return (
    <div style={{padding: '20px', fontFamily: 'Inter, sans-serif'}}>
      <h2 style={{fontFamily: 'Poppins, sans-serif', fontSize: '28px', fontWeight: '600', letterSpacing: '-0.5px', marginBottom: '25px'}}>🏆 User Standings</h2>

      {loading ? (
        <p style={{fontSize: '14px', color: '#718096'}}>Loading standings...</p>
      ) : standings.length === 0 ? (
        <p style={{fontSize: '14px', color: '#718096'}}>No users found</p>
      ) : (
        <div style={{overflowX: 'auto', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', border: '1px solid #e8e8e8'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white'}}>
                <th style={{padding: '14px 12px', textAlign: 'center', width: '80px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Rank</th>
                <th style={{padding: '14px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Display Name</th>
                <th style={{padding: '14px 12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Role</th>
                <th style={{padding: '14px 12px', textAlign: 'center', width: '150px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Total Points</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((user, idx) => (
                <tr key={user.id} style={{borderBottom: '1px solid #f0f0f0', backgroundColor: idx % 2 === 0 ? '#fafbfc' : 'white'}}>
                  <td style={{padding: '14px 12px', textAlign: 'center', fontWeight: '700', fontSize: '16px'}}>
                    {idx === 0 && <span style={{fontSize: '24px'}}>🥇</span>}
                    {idx === 1 && <span style={{fontSize: '24px'}}>🥈</span>}
                    {idx === 2 && <span style={{fontSize: '24px'}}>🥉</span>}
                    {idx > 2 && <span style={{color: '#667eea'}}>{idx + 1}</span>}
                  </td>
                  <td style={{padding: '14px 12px', fontSize: '14px', fontWeight: '600', color: '#2d3748'}}>{user.display_name || user.username}</td>
                  <td style={{padding: '14px 12px', textAlign: 'center'}}>
                    <span style={{backgroundColor: user.role === 'admin' ? '#E91E8C' : '#667eea', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                      {user.role === 'admin' ? 'Admin' : 'Player'}
                    </span>
                  </td>
                  <td style={{padding: '14px 12px', textAlign: 'center', fontWeight: '700', fontSize: '20px', color: '#667eea'}}>
                    {Math.round(user.balance)}
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
