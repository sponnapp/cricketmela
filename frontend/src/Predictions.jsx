import React, { useState } from 'react'

// ── Reusable Glass Card ───────────────────────────────────────────────────────
function GlassCard({ children, style = {} }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.78)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,0.65)',
      borderRadius: '18px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Section Title Pill ────────────────────────────────────────────────────────
function SectionPill({ icon, title, subtitle, gradient }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '12px',
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,0.72)',
      borderRadius: '14px', padding: '10px 18px 10px 10px',
      boxShadow: '0 3px 16px rgba(0,0,0,0.10)',
      marginBottom: '18px',
    }}>
      <div style={{
        width: '42px', height: '42px',
        background: gradient,
        borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px', flexShrink: 0,
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: '18px', fontWeight: '800', color: '#1a1a1a', fontFamily: "'Poppins',sans-serif", lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#444', fontWeight: '700', marginTop: '3px' }}>{subtitle}</div>
      </div>
    </div>
  )
}

// ── Category Header ───────────────────────────────────────────────────────────
function CategoryHeader({ emoji, label, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      marginBottom: '14px', marginTop: '6px',
    }}>
      <span style={{ fontSize: '22px' }}>{emoji}</span>
      <span style={{
        fontFamily: "'Poppins',sans-serif", fontWeight: '800',
        fontSize: '16px', color,
      }}>{label}</span>
      <div style={{ flex: 1, height: '2px', background: `${color}44`, borderRadius: '2px' }} />
      <span style={{
        fontSize: '11px', fontWeight: '700', color: 'white',
        background: color, padding: '3px 10px', borderRadius: '20px',
        letterSpacing: '0.5px', textTransform: 'uppercase',
      }}>COMING SOON</span>
    </div>
  )
}

// ── Radio Option ──────────────────────────────────────────────────────────────
function RadioOption({ label, sublabel, selected, locked, accent = '#2ecc71' }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 14px',
      background: selected ? `${accent}18` : 'rgba(0,0,0,0.03)',
      border: `1.5px solid ${selected ? accent : 'rgba(0,0,0,0.08)'}`,
      borderRadius: '10px',
      cursor: locked ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s',
      opacity: locked ? 0.55 : 1,
    }}>
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
        border: `2.5px solid ${selected ? accent : '#ccc'}`,
        background: selected ? accent : 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: selected ? `0 0 0 3px ${accent}33` : 'none',
        transition: 'all 0.2s',
      }}>
        {selected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{sublabel}</div>}
      </div>
    </label>
  )
}

// ── Odds Badge ────────────────────────────────────────────────────────────────
function OddsBadge({ label, odds, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 16px',
      background: `${color}15`,
      border: `1.5px solid ${color}44`,
      borderRadius: '12px', flex: 1,
    }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: '900', color, fontFamily: "'Poppins',sans-serif", marginTop: '4px' }}>{odds}</div>
    </div>
  )
}

// ── Points Selector Mock ──────────────────────────────────────────────────────
function PointsSelector({ value, accent = '#2ecc71' }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {[10, 20, 50].map(p => (
        <div key={p} style={{
          padding: '8px 18px',
          background: p === value ? `linear-gradient(135deg,${accent},${accent}cc)` : 'rgba(0,0,0,0.05)',
          color: p === value ? '#fff' : '#555',
          borderRadius: '20px', fontWeight: '800', fontSize: '13px',
          cursor: 'pointer', border: `1.5px solid ${p === value ? accent : 'rgba(0,0,0,0.08)'}`,
          boxShadow: p === value ? `0 3px 10px ${accent}55` : 'none',
          transition: 'all 0.2s',
        }}>{p} pts</div>
      ))}
    </div>
  )
}

// ── Vote Button Mock ──────────────────────────────────────────────────────────
function VoteButton({ label, gradient, disabled }) {
  return (
    <button style={{
      padding: '11px 28px',
      background: disabled ? '#e0e0e0' : gradient,
      color: disabled ? '#aaa' : '#fff',
      border: 'none', borderRadius: '24px',
      fontWeight: '800', fontSize: '13px',
      fontFamily: "'Poppins',sans-serif",
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : '0 4px 16px rgba(0,0,0,0.18)',
      letterSpacing: '0.3px',
    }}>{label}</button>
  )
}

// ── Locked Overlay Tag ────────────────────────────────────────────────────────
function LockedTag() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: '700', color: '#e74c3c',
      background: 'rgba(231,76,60,0.10)', border: '1px solid rgba(231,76,60,0.25)',
      padding: '3px 10px', borderRadius: '20px',
    }}>🔒 Voting Closed</span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Predictions({ user }) {
  const [activeTab, setActiveTab] = useState('match')

  const tabs = [
    { key: 'match',  label: '🏏 Match',   color: '#2ecc71' },
    { key: 'score',  label: '📊 Scores',  color: '#3498db' },
    { key: 'special',label: '🎯 Special', color: '#9b59b6' },
    { key: 'season', label: '🏆 Season',  color: '#e67e22' },
  ]

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Page Title ── */}
      <SectionPill
        icon="🔮"
        title="Predictions"
        subtitle="Pick your predictions & win bonus points"
        gradient="linear-gradient(135deg,#9b59b6,#764ba2)"
      />

      {/* ── Tab Bar ── */}
      <div style={{
        display: 'flex', gap: '6px', marginBottom: '22px',
        background: 'rgba(10,20,35,0.75)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '14px', padding: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      }}>
        {tabs.map(t => {
          const active = activeTab === t.key
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flex: 1, height: '42px',
              background: active ? `linear-gradient(135deg,${t.color},${t.color}bb)` : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.55)',
              border: active ? 'none' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px', cursor: 'pointer',
              fontWeight: '700', fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.22s ease',
              boxShadow: active ? `0 4px 14px ${t.color}55` : 'none',
              letterSpacing: '0.2px',
            }}
            onMouseOver={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            onMouseOut={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >{t.label}</button>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1 — MATCH PREDICTIONS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'match' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* 1. Toss Winner */}
          <GlassCard>
            <div style={{ padding: '20px' }}>
              <CategoryHeader emoji="🪙" label="Toss Winner" color="#2ecc71" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>
                Predict which team wins the toss · <strong>Match: CSK vs MI · Apr 6, 2026</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                <RadioOption label="Chennai Super Kings" sublabel="CSK" selected={true} accent="#f7b731" />
                <RadioOption label="Mumbai Indians" sublabel="MI" selected={false} accent="#2ecc71" />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <OddsBadge label="CSK" odds="1.8×" color="#f7b731" />
                <OddsBadge label="MI" odds="2.1×" color="#0047ab" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <PointsSelector value={20} accent="#f7b731" />
                <VoteButton label="🪙 Lock Toss Pick" gradient="linear-gradient(135deg,#f7b731,#f0932b)" />
              </div>
            </div>
          </GlassCard>

          {/* 2. Top Batsman */}
          <GlassCard>
            <div style={{ padding: '20px' }}>
              <CategoryHeader emoji="🏏" label="Top Batsman" color="#3498db" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>
                Who scores the most runs in this match?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                <RadioOption label="Virat Kohli" sublabel="RCB · Avg 52.1" selected={true} accent="#3498db" />
                <RadioOption label="Rohit Sharma" sublabel="MI · Avg 48.6" selected={false} accent="#3498db" />
                <RadioOption label="MS Dhoni" sublabel="CSK · Avg 41.3" selected={false} accent="#3498db" />
                <RadioOption label="KL Rahul" sublabel="LSG · Avg 45.8" selected={false} accent="#3498db" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <PointsSelector value={50} accent="#3498db" />
                <VoteButton label="🏏 Pick Batsman" gradient="linear-gradient(135deg,#3498db,#2980b9)" />
              </div>
            </div>
          </GlassCard>

          {/* 3. Top Bowler */}
          <GlassCard>
            <div style={{ padding: '20px' }}>
              <CategoryHeader emoji="🎳" label="Top Bowler (Most Wickets)" color="#9b59b6" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>
                Who takes the most wickets in this match?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                <RadioOption label="Jasprit Bumrah" sublabel="MI · Econ 6.8" selected={false} accent="#9b59b6" />
                <RadioOption label="Ravindra Jadeja" sublabel="CSK · Econ 7.1" selected={true} accent="#9b59b6" />
                <RadioOption label="Rashid Khan" sublabel="GT · Econ 6.5" selected={false} accent="#9b59b6" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <PointsSelector value={20} accent="#9b59b6" />
                <VoteButton label="🎳 Pick Bowler" gradient="linear-gradient(135deg,#9b59b6,#764ba2)" />
              </div>
            </div>
          </GlassCard>

          {/* 4. Man of the Match */}
          <GlassCard>
            <div style={{ padding: '20px' }}>
              <CategoryHeader emoji="⭐" label="Man of the Match" color="#e67e22" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>
                Predict who wins the MOM award · <LockedTag />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', opacity: 0.6 }}>
                <RadioOption label="Rohit Sharma" sublabel="MI" selected={false} locked={true} accent="#e67e22" />
                <RadioOption label="Virat Kohli" sublabel="RCB" selected={false} locked={true} accent="#e67e22" />
                <RadioOption label="Hardik Pandya" sublabel="MI" selected={false} locked={true} accent="#e67e22" />
              </div>
              <VoteButton label="⭐ Pick MOM" gradient="#ccc" disabled={true} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2 — SCORE PREDICTIONS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'score' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* 1. Total Runs Range */}
          <GlassCard>
            <div style={{ padding: '20px' }}>
              <CategoryHeader emoji="🎯" label="Total Team Score Range" color="#3498db" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>
                What will CSK score in their innings?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {[
                  { range: 'Under 140', sublabel: '0 – 139 runs', odds: '3.5×' },
                  { range: '140 – 159', sublabel: '140 to 159 runs', odds: '2.1×' },
                  { range: '160 – 179', sublabel: '160 to 179 runs', odds: '1.8×' },
                  { range: '180 – 199', sublabel: '180 to 199 runs', odds: '2.4×' },
                  { range: '200+',      sublabel: '200 or more runs', odds: '4.2×' },
                ].map((r, i) => (
                  <div key={r.range} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <RadioOption label={r.range} sublabel={r.sublabel} selected={i === 2} accent="#3498db" />
                    </div>
                    <div style={{
                      fontSize: '12px', fontWeight: '800', color: '#3498db',
                      background: 'rgba(52,152,219,0.12)', padding: '4px 10px',
                      borderRadius: '8px', border: '1px solid rgba(52,152,219,0.25)',
                      minWidth: '44px', textAlign: 'center',
                    }}>{r.odds}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <PointsSelector value={20} accent="#3498db" />
                <VoteButton label="🎯 Lock Score Range" gradient="linear-gradient(135deg,#3498db,#2980b9)" />
              </div>
            </div>
          </GlassCard>

          {/* 2. Powerplay Runs */}
          <GlassCard>
            <div style={{ padding: '20px' }}>
              <CategoryHeader emoji="⚡" label="First 6 Overs (Powerplay) Score" color="#f7b731" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>
                How many runs in the powerplay?
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                {['Under 40', '40 – 50', '51 – 60', '61+'].map((r, i) => (
                  <RadioOption key={r} label={r} selected={i === 1} accent="#f7b731" />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <PointsSelector value={10} accent="#f7b731" />
                <VoteButton label="⚡ Lock Powerplay" gradient="linear-gradient(135deg,#f7b731,#f0932b)" />
              </div>
            </div>
          </GlassCard>

          {/* 3. Winning Margin */}
          <GlassCard>
            <div style={{ padding: '20px' }}>
              <CategoryHeader emoji="📏" label="Winning Margin" color="#1abc9c" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>
                By how much will the winner win?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                <RadioOption label="1 – 10 runs / 1 – 3 wickets" sublabel="Very close" selected={false} accent="#1abc9c" />
                <RadioOption label="11 – 30 runs / 4 – 6 wickets" sublabel="Comfortable" selected={true} accent="#1abc9c" />
                <RadioOption label="30+ runs / 7+ wickets" sublabel="Dominant" selected={false} accent="#1abc9c" />
                <RadioOption label="Super Over" sublabel="Tie, goes to Super Over" selected={false} accent="#e74c3c" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <PointsSelector value={20} accent="#1abc9c" />
                <VoteButton label="📏 Lock Margin" gradient="linear-gradient(135deg,#1abc9c,#16a085)" />
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3 — SPECIAL EVENTS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'special' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Yes/No style cards in a grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>

            {/* Super Over */}
            <GlassCard style={{ padding: '20px' }}>
              <CategoryHeader emoji="⚡" label="Super Over?" color="#e74c3c" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>Will this match go to a Super Over?</div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <RadioOption label="✅ Yes" selected={false} accent="#2ecc71" />
                <RadioOption label="❌ No" selected={true} accent="#e74c3c" />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <OddsBadge label="YES" odds="8.5×" color="#2ecc71" />
                <OddsBadge label="NO" odds="1.1×" color="#e74c3c" />
              </div>
              <PointsSelector value={10} accent="#e74c3c" />
            </GlassCard>

            {/* Most Sixes */}
            <GlassCard style={{ padding: '20px' }}>
              <CategoryHeader emoji="💥" label="Most Sixes" color="#9b59b6" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>Which team hits more sixes?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                <RadioOption label="CSK" sublabel="Avg 8 sixes/game" selected={true} accent="#f7b731" />
                <RadioOption label="MI" sublabel="Avg 10 sixes/game" selected={false} accent="#0047ab" />
                <RadioOption label="Equal" sublabel="Same count" selected={false} accent="#9b59b6" />
              </div>
              <PointsSelector value={10} accent="#9b59b6" />
            </GlassCard>

            {/* 50+ Score */}
            <GlassCard style={{ padding: '20px' }}>
              <CategoryHeader emoji="🔥" label="Any 50+ Score?" color="#e67e22" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>Will any batsman score 50+ runs?</div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <RadioOption label="✅ Yes" selected={true} accent="#2ecc71" />
                <RadioOption label="❌ No" selected={false} accent="#e74c3c" />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <OddsBadge label="YES" odds="1.4×" color="#2ecc71" />
                <OddsBadge label="NO" odds="3.2×" color="#e74c3c" />
              </div>
              <PointsSelector value={20} accent="#e67e22" />
            </GlassCard>

            {/* Century */}
            <GlassCard style={{ padding: '20px' }}>
              <CategoryHeader emoji="💯" label="Century in Match?" color="#3498db" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>Will any batsman score 100+ runs?</div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <RadioOption label="✅ Yes" selected={false} accent="#2ecc71" />
                <RadioOption label="❌ No" selected={true} accent="#e74c3c" />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <OddsBadge label="YES" odds="6.5×" color="#2ecc71" />
                <OddsBadge label="NO" odds="1.2×" color="#e74c3c" />
              </div>
              <PointsSelector value={10} accent="#3498db" />
            </GlassCard>

          </div>

          {/* Submit Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <VoteButton label="🎯 Submit All Special Picks" gradient="linear-gradient(135deg,#9b59b6,#764ba2)" />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 4 — SEASON PREDICTIONS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'season' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Season Champion */}
          <GlassCard>
            <div style={{ padding: '20px' }}>
              <CategoryHeader emoji="🏆" label="Season Champion" color="#e67e22" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>
                Pick the IPL 2026 winner · <strong>One-time pick per season</strong>
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '11px', fontWeight: '700', color: '#2ecc71',
                background: 'rgba(46,204,113,0.10)', border: '1px solid rgba(46,204,113,0.3)',
                padding: '3px 10px', borderRadius: '20px', marginBottom: '14px',
              }}>🟢 Voting Open — closes Apr 10</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                {[
                  { name: 'Mumbai Indians', short: 'MI', color: '#0047ab' },
                  { name: 'Chennai Super Kings', short: 'CSK', color: '#f7b731' },
                  { name: 'Royal Challengers', short: 'RCB', color: '#e74c3c' },
                  { name: 'Kolkata Knight Riders', short: 'KKR', color: '#5e2d79' },
                  { name: 'Gujarat Titans', short: 'GT', color: '#1abc9c' },
                  { name: 'Rajasthan Royals', short: 'RR', color: '#ff69b4' },
                  { name: 'Delhi Capitals', short: 'DC', color: '#3498db' },
                  { name: 'Sunrisers Hyderabad', short: 'SRH', color: '#e67e22' },
                ].map((t, i) => (
                  <RadioOption key={t.short} label={t.name} sublabel={t.short} selected={i === 1} accent={t.color} />
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', fontWeight: '600', marginBottom: '4px' }}>SEASON BET POINTS</div>
                  <PointsSelector value={50} accent="#e67e22" />
                </div>
                <VoteButton label="🏆 Lock Season Pick" gradient="linear-gradient(135deg,#e67e22,#d35400)" />
              </div>
            </div>
          </GlassCard>

          {/* Orange & Purple Cap */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>

            <GlassCard style={{ padding: '20px' }}>
              <CategoryHeader emoji="🟠" label="Orange Cap (Top Run Scorer)" color="#e67e22" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>Who finishes with most runs in IPL 2026?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                <RadioOption label="Virat Kohli" sublabel="RCB" selected={true} accent="#e67e22" />
                <RadioOption label="Rohit Sharma" sublabel="MI" selected={false} accent="#e67e22" />
                <RadioOption label="KL Rahul" sublabel="LSG" selected={false} accent="#e67e22" />
                <RadioOption label="Ruturaj Gaikwad" sublabel="CSK" selected={false} accent="#e67e22" />
              </div>
              <PointsSelector value={20} accent="#e67e22" />
            </GlassCard>

            <GlassCard style={{ padding: '20px' }}>
              <CategoryHeader emoji="🟣" label="Purple Cap (Top Wicket Taker)" color="#9b59b6" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>Who takes the most wickets in IPL 2026?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                <RadioOption label="Jasprit Bumrah" sublabel="MI" selected={false} accent="#9b59b6" />
                <RadioOption label="Rashid Khan" sublabel="GT" selected={true} accent="#9b59b6" />
                <RadioOption label="Yuzvendra Chahal" sublabel="RR" selected={false} accent="#9b59b6" />
                <RadioOption label="Ravichandran Ashwin" sublabel="CSK" selected={false} accent="#9b59b6" />
              </div>
              <PointsSelector value={20} accent="#9b59b6" />
            </GlassCard>

          </div>

          {/* Playoff Teams */}
          <GlassCard>
            <div style={{ padding: '20px' }}>
              <CategoryHeader emoji="🎟️" label="Playoff Qualifier Teams (Pick 4)" color="#3498db" />
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px' }}>
                Pick the 4 teams you think will qualify for playoffs · <strong>All 4 must be correct to win</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                {[
                  { name: 'MI', selected: true, color: '#0047ab' },
                  { name: 'CSK', selected: true, color: '#f7b731' },
                  { name: 'GT', selected: false, color: '#1abc9c' },
                  { name: 'KKR', selected: true, color: '#5e2d79' },
                  { name: 'RCB', selected: false, color: '#e74c3c' },
                  { name: 'SRH', selected: false, color: '#e67e22' },
                  { name: 'DC', selected: false, color: '#3498db' },
                  { name: 'RR', selected: true, color: '#ff69b4' },
                ].map(t => (
                  // Checkbox style for multi-select
                  <div key={t.name} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px',
                    background: t.selected ? `${t.color}18` : 'rgba(0,0,0,0.03)',
                    border: `1.5px solid ${t.selected ? t.color : 'rgba(0,0,0,0.08)'}`,
                    borderRadius: '10px', cursor: 'pointer',
                  }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '4px',
                      border: `2.5px solid ${t.selected ? t.color : '#ccc'}`,
                      background: t.selected ? t.color : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {t.selected && <span style={{ color: 'white', fontSize: '11px', fontWeight: '900' }}>✓</span>}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: t.selected ? t.color : '#555' }}>{t.name}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <PointsSelector value={50} accent="#3498db" />
                <VoteButton label="🎟️ Lock Playoff Picks" gradient="linear-gradient(135deg,#3498db,#2980b9)" />
              </div>
            </div>
          </GlassCard>

        </div>
      )}

      {/* ── Coming Soon Banner ── */}
      <GlassCard style={{ padding: '20px', marginTop: '22px', textAlign: 'center' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>🚧</div>
        <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a1a1a', fontFamily: "'Poppins',sans-serif", marginBottom: '6px' }}>
          Predictions — Design Preview
        </div>
        <div style={{ fontSize: '13px', color: '#666', maxWidth: '420px', margin: '0 auto' }}>
          This is a <strong>layout preview</strong>. All interactions are mocked.
          Once you approve this design, the backend endpoints and real data will be wired up.
        </div>
      </GlassCard>

    </div>
  )
}

