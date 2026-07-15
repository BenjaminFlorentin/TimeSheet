import { useEffect, useState } from 'react';

const INTRO_TOTAL_MS = 2600;
const SPARKLE_COUNT = 12;

/**
 * Launch animation: a golden snitch hovers at the center of a starry
 * night, flaps its wings, then darts off to the top-right leaving a
 * trail of gold dust. Pure CSS/SVG, tap to skip, honours
 * prefers-reduced-motion.
 */
export default function SnitchIntro() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), INTRO_TOTAL_MS);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  const sparkles = Array.from({ length: SPARKLE_COUNT }, (_, i) => {
    const progress = (i + 1) / SPARKLE_COUNT;
    return (
      <span
        key={i}
        className="snitch-sparkle"
        style={{
          left: `calc(50% + ${progress * 42}vw)`,
          top: `calc(50% - ${progress * 38}vh)`,
          width: `${8 - progress * 5}px`,
          height: `${8 - progress * 5}px`,
          // The flight easing starts slow and accelerates, so the dust must
          // appear late and bunched toward the end of the path to stay in
          // the snitch's wake rather than ahead of it.
          animationDelay: `${1.45 + progress * progress * 0.6}s`,
        }}
      />
    );
  });

  return (
    <div
      className="snitch-overlay starry-night"
      onClick={() => setVisible(false)}
      role="presentation"
      aria-hidden="true"
    >
      <div className="snitch-flight">
        <svg
          viewBox="-70 -34 140 68"
          width="140"
          height="68"
          className="drop-shadow-[0_0_12px_rgba(232,185,35,0.55)]"
        >
          <defs>
            <radialGradient id="snitchBody" cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#f9e08a" />
              <stop offset="55%" stopColor="#e8b923" />
              <stop offset="100%" stopColor="#9a7414" />
            </radialGradient>
          </defs>
          <g className="snitch-wing snitch-wing-left">
            <path
              d="M-11,0 C-26,-16 -48,-20 -64,-11 C-50,-7 -45,-3 -38,0 C-48,3 -55,8 -60,15 C-44,15 -25,9 -11,3 Z"
              fill="#efe6c8"
              opacity="0.92"
              stroke="#d4c48a"
              strokeWidth="1"
            />
          </g>
          <g className="snitch-wing snitch-wing-right">
            <path
              d="M11,0 C26,-16 48,-20 64,-11 C50,-7 45,-3 38,0 C48,3 55,8 60,15 C44,15 25,9 11,3 Z"
              fill="#efe6c8"
              opacity="0.92"
              stroke="#d4c48a"
              strokeWidth="1"
            />
          </g>
          <circle r="13" fill="url(#snitchBody)" stroke="#9a7414" strokeWidth="1" />
          <path
            d="M-13,0 A13,13 0 0 1 13,0"
            fill="none"
            stroke="#9a7414"
            strokeWidth="1"
            opacity="0.7"
          />
          <path
            d="M-9,-9 A13,13 0 0 1 9,-9"
            fill="none"
            stroke="#f9e08a"
            strokeWidth="1"
            opacity="0.8"
          />
        </svg>
      </div>
      {sparkles}
    </div>
  );
}
