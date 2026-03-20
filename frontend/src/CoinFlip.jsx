import React, { useEffect, useState } from 'react';
import './CoinFlip.css';

/**
 * CoinFlip Animation Component
 * Shows a spinning coin animation with team name on it
 */
export default function CoinFlip({ teamName, onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Animation duration: 1.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="coin-flip-overlay">
      <div className="coin-flip-container">
        <div className="coin">
          <div className="coin-face coin-heads">
            <div className="coin-team-name">{teamName}</div>
            <div className="coin-icon">🏏</div>
          </div>
          <div className="coin-face coin-tails">
            <div className="coin-team-name">{teamName}</div>
            <div className="coin-icon">✨</div>
          </div>
        </div>
        <div className="coin-flip-text">Placing your bet...</div>
      </div>
    </div>
  );
}
