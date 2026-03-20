import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { celebrateVictory, celebrateBigWin, celebrateStreak, celebrateQuick } from './celebrations';

export default function Analytics({ user, refreshTrigger }) {
  const [overview, setOverview] = useState(null);
  const [teams, setTeams] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [streaks, setStreaks] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [hasCelebrated, setHasCelebrated] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all');

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') {
      fetchAdminUsers();
    }
    fetchAllAnalytics();
  }, [user, refreshTrigger, selectedUser]);

  async function fetchAdminUsers() {
    try {
      const response = await axios.get('/api/admin/users', {
        headers: { 'x-user': user.username }
      });
      setUsers((response.data || []).filter(entry => entry.role !== 'admin'));
    } catch (err) {
      console.error('Failed to fetch analytics users:', err);
      setUsers([]);
    }
  }

  async function fetchAllAnalytics() {
    setLoading(true);
    try {
      const headers = { 'x-user': user.username };
      if (user.role === 'admin') {
        const query = selectedUser === 'all' ? '' : `?userId=${selectedUser}`;
        const response = await axios.get(`/api/admin/analytics${query}`, { headers });
        setOverview(response.data?.overview || null);
        setTeams(response.data?.teams || []);
        setTimeline(response.data?.timeline || []);
        setStreaks(response.data?.streaks || null);
        setPatterns(response.data?.patterns || null);
        return;
      }

      const [overviewRes, teamsRes, timelineRes, streaksRes, patternsRes] = await Promise.all([
        axios.get(`/api/analytics/overview/${user.id}`, { headers }),
        axios.get(`/api/analytics/teams/${user.id}`, { headers }),
        axios.get(`/api/analytics/timeline/${user.id}`, { headers }),
        axios.get(`/api/analytics/streaks/${user.id}`, { headers }),
        axios.get(`/api/analytics/patterns/${user.id}`, { headers })
      ]);

      setOverview(overviewRes.data);
      setTeams(teamsRes.data);
      setTimeline(timelineRes.data);
      setStreaks(streaksRes.data);
      setPatterns(patternsRes.data);

      // Celebrate on first load if user has good stats
      if (!hasCelebrated && overviewRes.data) {
        setTimeout(() => {
          if (overviewRes.data.net_profit >= 100) {
            celebrateBigWin();
          } else if (overviewRes.data.net_profit > 0 && overviewRes.data.win_rate >= 50) {
            celebrateVictory();
          }
          
          if (streaksRes.data?.current_streak >= 3) {
            setTimeout(() => celebrateStreak(streaksRes.data.current_streak), 1000);
          }
          setHasCelebrated(true);
        }, 500);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', color: '#1a1a1a' }}>
          📊 Analytics Dashboard
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          {user?.role === 'admin' ? 'View overall betting analytics or inspect a specific user' : 'Deep insights into your betting performance'}
        </p>
      </div>

      {user?.role === 'admin' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '20px',
          background: 'rgba(255,255,255,0.86)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '12px',
          padding: '12px 14px',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#555' }}>👤 User:</span>
          <select
            value={selectedUser}
            onChange={event => setSelectedUser(event.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              border: '1px solid #ddd',
              background: 'white',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              color: '#333',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
            }}
          >
            <option value="all">All Users</option>
            {users.map(entry => (
              <option key={entry.id} value={entry.id}>{entry.display_name || entry.username}</option>
            ))}
          </select>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>
            {selectedUser === 'all' ? 'Showing combined analytics for all non-admin users' : 'Showing analytics for the selected user'}
          </span>
        </div>
      )}

      {/* View Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '24px',
        background: 'rgba(10,20,35,0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '14px',
        padding: '6px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        overflowX: 'auto'
      }}>
        {[
          { key: 'overview', label: '📈 Overview' },
          { key: 'teams', label: '🏏 Teams' },
          { key: 'trends', label: '📉 Trends' },
          { key: 'patterns', label: '🔍 Patterns' }
        ].map(tab => (
          <div
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            style={{
              flex: 1,
              minWidth: '120px',
              height: '40px',
              background: activeView === tab.key ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'transparent',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeView === tab.key ? 'white' : 'rgba(255,255,255,0.55)',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.25s ease',
              boxShadow: activeView === tab.key ? '0 4px 12px rgba(102,126,234,0.4)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Content */}
      {activeView === 'overview' && <OverviewView overview={overview} streaks={streaks} />}
      {activeView === 'teams' && <TeamsView teams={teams} />}
      {activeView === 'trends' && <TrendsView timeline={timeline} />}
      {activeView === 'patterns' && <PatternsView patterns={patterns} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OVERVIEW VIEW
// ═══════════════════════════════════════════════════════════════

function OverviewView({ overview, streaks }) {
  if (!overview) return null;

  const stats = [
    { label: 'Total Votes', value: overview.total_votes, icon: '🎯', color: '#3b82f6' },
    { label: 'Won', value: overview.won, icon: '✅', color: '#10b981' },
    { label: 'Lost', value: overview.lost, icon: '❌', color: '#ef4444' },
    { label: 'Pending', value: overview.pending, icon: '⏳', color: '#fb923c' },
    { label: 'Win Rate', value: `${overview.win_rate}%`, icon: '📊', color: '#8b5cf6' },
    { label: 'Total Bet', value: overview.total_bet, icon: '💰', color: '#f59e0b' },
    { label: 'Net Profit', value: overview.net_profit, icon: overview.net_profit >= 0 ? '📈' : '📉', color: overview.net_profit >= 0 ? '#10b981' : '#ef4444' },
    { label: 'Avg Bet', value: overview.avg_bet, icon: '⚖️', color: '#6366f1' },
    { label: 'ROI', value: `${overview.roi}%`, icon: '💹', color: parseFloat(overview.roi) >= 0 ? '#10b981' : '#ef4444' }
  ];

  return (
    <div>
      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Streaks */}
      {streaks && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>🔥 Streaks</h3>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Current Winning Streak</div>
              <div style={{ fontSize: '32px', fontWeight: '800' }}>{streaks.current_streak}</div>
            </div>
            <div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Best Winning Streak</div>
              <div style={{ fontSize: '32px', fontWeight: '800' }}>{streaks.best_winning_streak}</div>
            </div>
            {streaks.current_losing_streak > 0 && (
              <div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Current Losing Streak</div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#fca5a5' }}>{streaks.current_losing_streak}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Message */}
      {overview.total_votes > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1a1a1a' }}>
            📝 Performance Summary
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#666', margin: 0 }}>
            You've placed <strong>{overview.total_votes}</strong> votes with a win rate of <strong>{overview.win_rate}%</strong>.
            {overview.net_profit >= 0 ? (
              <> You're up <strong style={{ color: '#10b981' }}>+{overview.net_profit}</strong> points with an ROI of <strong style={{ color: '#10b981' }}>{overview.roi}%</strong>. Great job! 🎉</>
            ) : (
              <> You're down <strong style={{ color: '#ef4444' }}>{overview.net_profit}</strong> points with an ROI of <strong style={{ color: '#ef4444' }}>{overview.roi}%</strong>. Keep analyzing trends to improve! 💪</>
            )}
          </p>
        </div>
      )}

      {overview.total_votes === 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '40px 20px',
          textAlign: 'center',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#666', marginBottom: '8px' }}>
            No Voting Activity Yet
          </h3>
          <p style={{ fontSize: '14px', color: '#999' }}>
            Start voting on matches to see your analytics!
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const handleClick = () => {
    // Trigger celebration based on card type
    if (label === 'Won' && value > 0) {
      celebrateVictory();
    } else if (label === 'Net Profit' && value >= 50) {
      celebrateBigWin();
    } else if (label === 'Net Profit' && value > 0) {
      celebrateQuick();
    } else if ((label === 'Win Rate' || label === 'ROI') && parseFloat(value) >= 50) {
      celebrateVictory();
    } else if (label === 'Total Votes' && value >= 50) {
      celebrateQuick();
    }
  };

  return (
    <div 
      onClick={handleClick}
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: '800', color }}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEAMS VIEW
// ═══════════════════════════════════════════════════════════════

function TeamsView({ teams }) {
  if (!teams || teams.length === 0) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px 20px',
        textAlign: 'center',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏏</div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#666', marginBottom: '8px' }}>
          No Team Data Yet
        </h3>
        <p style={{ fontSize: '14px', color: '#999' }}>
          Vote on matches to see team-wise performance!
        </p>
      </div>
    );
  }

  const sortedTeams = [...teams].sort((a, b) => b.net_profit - a.net_profit);
  const bestTeam = sortedTeams[0];
  const worstTeam = sortedTeams[sortedTeams.length - 1];

  return (
    <div>
      {/* Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {bestTeam && bestTeam.net_profit !== 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '12px',
            padding: '20px',
            color: 'white'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>🏆 Best Performing Team</div>
            <div style={{ fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>{bestTeam.team}</div>
            <div style={{ fontSize: '16px' }}>
              {bestTeam.net_profit > 0 ? '+' : ''}{bestTeam.net_profit} points • {bestTeam.win_rate}% win rate
            </div>
          </div>
        )}

        {worstTeam && worstTeam.net_profit !== 0 && bestTeam !== worstTeam && (
          <div style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            borderRadius: '12px',
            padding: '20px',
            color: 'white'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>📉 Needs Improvement</div>
            <div style={{ fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>{worstTeam.team}</div>
            <div style={{ fontSize: '16px' }}>
              {worstTeam.net_profit} points • {worstTeam.win_rate}% win rate
            </div>
          </div>
        )}
      </div>

      {/* Teams Table */}
      <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '14px' }}>Team</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '700', fontSize: '14px' }}>Votes</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '700', fontSize: '14px' }}>W/L</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '700', fontSize: '14px' }}>Win Rate</th>
                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>Net Profit</th>
                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>ROI</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px', fontWeight: '600' }}>{team.team}</td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#666' }}>{team.votes}</td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                    <span style={{ color: '#10b981', fontWeight: '600' }}>{team.won}</span>
                    {' / '}
                    <span style={{ color: '#ef4444', fontWeight: '600' }}>{team.lost}</span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{
                      background: parseFloat(team.win_rate) >= 50 ? '#d1fae5' : '#fee2e2',
                      color: parseFloat(team.win_rate) >= 50 ? '#065f46' : '#991b1b',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      {team.win_rate}%
                    </span>
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontWeight: '700',
                    fontSize: '16px',
                    color: team.net_profit >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {team.net_profit >= 0 ? '+' : ''}{team.net_profit}
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: parseFloat(team.roi) >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {parseFloat(team.roi) >= 0 ? '+' : ''}{team.roi}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRENDS VIEW
// ═══════════════════════════════════════════════════════════════

function TrendsView({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px 20px',
        textAlign: 'center',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📉</div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#666', marginBottom: '8px' }}>
          No Timeline Data Yet
        </h3>
        <p style={{ fontSize: '14px', color: '#999' }}>
          Vote on matches over time to see trends!
        </p>
      </div>
    );
  }

  // Cumulative balance calculation
  const cumulativeData = [];
  let balance = 0;
  
  timeline.forEach(month => {
    balance += month.net_profit || 0;
    cumulativeData.push({
      month: month.month,
      balance,
      profit: month.net_profit,
      votes: month.votes,
      won: month.won
    });
  });

  return (
    <div>
      {/* Balance Over Time */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>📈 Balance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" style={{ fontSize: '12px' }} stroke="#666" />
            <YAxis style={{ fontSize: '12px' }} stroke="#666" />
            <Tooltip 
              contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              labelStyle={{ fontWeight: '700', color: '#1a1a1a' }}
            />
            <Legend />
            <Line type="monotone" dataKey="balance" stroke="#667eea" strokeWidth={3} name="Balance" dot={{ fill: '#667eea', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Performance */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>📊 Monthly Activity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" style={{ fontSize: '12px' }} stroke="#666" />
            <YAxis style={{ fontSize: '12px' }} stroke="#666" />
            <Tooltip 
              contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              labelStyle={{ fontWeight: '700', color: '#1a1a1a' }}
            />
            <Legend />
            <Bar dataKey="votes" fill="#3b82f6" name="Total Votes" />
            <Bar dataKey="won" fill="#10b981" name="Won" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PATTERNS VIEW
// ═══════════════════════════════════════════════════════════════

function PatternsView({ patterns }) {
  if (!patterns || (!patterns.by_points?.length && !patterns.by_day?.length)) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px 20px',
        textAlign: 'center',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#666', marginBottom: '8px' }}>
          No Pattern Data Yet
        </h3>
        <p style={{ fontSize: '14px', color: '#999' }}>
          Vote on matches to discover your betting patterns!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* By Points */}
      {patterns.by_points && patterns.by_points.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>💰 Performance by Bet Size</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={patterns.by_points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="points" 
                label={{ value: 'Points', position: 'insideBottom', offset: -5, style: { fill: '#666' } }}
                style={{ fontSize: '12px' }}
                stroke="#666"
              />
              <YAxis style={{ fontSize: '12px' }} stroke="#666" />
              <Tooltip 
                contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                labelStyle={{ fontWeight: '700', color: '#1a1a1a' }}
              />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Total Bets" />
              <Bar dataKey="won" fill="#10b981" name="Won" />
            </BarChart>
          </ResponsiveContainer>

          {/* Insights */}
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            {patterns.by_points.map((p, idx) => (
              <div key={idx} style={{
                padding: '12px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a1a' }}>{p.points} pts</div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {p.count} bets • {p.win_rate}% win
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Day of Week */}
      {patterns.by_day && patterns.by_day.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>📅 Performance by Day of Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={patterns.by_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" style={{ fontSize: '12px' }} stroke="#666" />
              <YAxis style={{ fontSize: '12px' }} stroke="#666" />
              <Tooltip 
                contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                labelStyle={{ fontWeight: '700', color: '#1a1a1a' }}
              />
              <Legend />
              <Bar dataKey="votes" fill="#8b5cf6" name="Votes" />
              <Bar dataKey="won" fill="#10b981" name="Won" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
