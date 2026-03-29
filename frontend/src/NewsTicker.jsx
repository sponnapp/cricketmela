import React from 'react';

const DEFAULT_NEWS = [
  '🏏 Welcome to Cricket Mela — Place your bets wisely!',
  '🔥 T20 season is heating up — don\'t miss a match!',
  '💰 Vote early for maximum points potential',
  '⚡ Voting closes 30 minutes before match start',
  '⚠️ Miss a match? -10 points auto-deducted for not voting!',
  '🏆 Check the Standings to see who\'s leading the pack',
  '📊 Analyze vote patterns in the Analytics tab',
  '🎯 Every point counts — choose your team carefully!',
  '📋 View your full vote history anytime in Vote History',
];

export default function NewsTicker({ news = DEFAULT_NEWS }) {
  const items = news.length > 0 ? news : DEFAULT_NEWS;

  return (
    <div className="ticker-wrap">
      <div className="ticker-content">
        {items.map((item, index) => (
          <span key={index} className="ticker-item">
            {item}
          </span>
        ))}
        {/* Duplicate for seamless infinite scrolling */}
        {items.map((item, index) => (
          <span key={`dup-${index}`} className="ticker-item">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
