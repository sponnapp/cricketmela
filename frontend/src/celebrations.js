import confetti from 'canvas-confetti';

// ═══════════════════════════════════════════════════════════════
// CELEBRATION ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Victory confetti - for wins and achievements
 */
export function celebrateVictory() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
}

/**
 * Big win explosion - for large profits
 */
export function celebrateBigWin() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999
  };

  function fire(particleRatio, opts) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio)
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });

  fire(0.2, {
    spread: 60,
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

/**
 * Streak celebration - for winning streaks
 */
export function celebrateStreak(streakCount) {
  const colors = ['#FFD700', '#FFA500', '#FF6347'];
  
  confetti({
    particleCount: streakCount * 10,
    spread: 70,
    origin: { y: 0.6 },
    colors: colors,
    zIndex: 9999
  });

  // Add emoji explosion for big streaks
  if (streakCount >= 5) {
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { y: 0.6 },
        shapes: ['circle'],
        colors: ['#FFD700'],
        scalar: 2,
        zIndex: 9999
      });
    }, 300);
  }
}

/**
 * Podium celebration - for top 3 positions
 */
export function celebratePodium(position) {
  let colors;
  let particleCount;

  switch(position) {
    case 1: // Gold
      colors = ['#FFD700', '#FFA500'];
      particleCount = 150;
      break;
    case 2: // Silver
      colors = ['#C0C0C0', '#D3D3D3'];
      particleCount = 100;
      break;
    case 3: // Bronze
      colors = ['#CD7F32', '#B87333'];
      particleCount = 80;
      break;
    default:
      colors = ['#667eea', '#764ba2'];
      particleCount = 50;
  }

  confetti({
    particleCount,
    spread: 70,
    origin: { y: 0.6 },
    colors,
    zIndex: 9999
  });
}

/**
 * Achievement unlock - for milestones
 */
export function celebrateAchievement() {
  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    shapes: ['star'],
    colors: ['#FFD700', '#FFA500', '#FF6347', '#667eea', '#764ba2'],
    zIndex: 9999
  };

  function shoot() {
    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      shapes: ['star']
    });

    confetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75,
      shapes: ['circle']
    });
  }

  setTimeout(shoot, 0);
  setTimeout(shoot, 100);
  setTimeout(shoot, 200);
}

/**
 * Quick burst - for small wins
 */
export function celebrateQuick() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#10b981', '#3b82f6', '#8b5cf6'],
    zIndex: 9999
  });
}

/**
 * School pride - for fun moments
 */
export function celebrateSchoolPride() {
  const end = Date.now() + (2 * 1000);
  const colors = ['#667eea', '#764ba2', '#FFD700'];

  (function frame() {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
      zIndex: 9999
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
      zIndex: 9999
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
}

/**
 * Balance increase animation with sparkles
 */
export function celebrateBalanceIncrease(amount) {
  if (amount >= 100) {
    celebrateBigWin();
  } else if (amount >= 50) {
    celebrateVictory();
  } else if (amount > 0) {
    celebrateQuick();
  }
}
