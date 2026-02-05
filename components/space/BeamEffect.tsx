'use client'

// =============================================================================
// BEAM EFFECT - Animated SVG beams for hero sections
// =============================================================================
// Converging light beams creating depth and energy

import { motion } from 'framer-motion'

export default function BeamEffect() {
  const beams = [
    { x1: '10%', y1: '0%', x2: '40%', y2: '100%', delay: 0, color: '#8b5cf6', opacity: 0.15 },
    { x1: '30%', y1: '0%', x2: '50%', y2: '100%', delay: 0.5, color: '#3b82f6', opacity: 0.12 },
    { x1: '60%', y1: '0%', x2: '55%', y2: '100%', delay: 1, color: '#06b6d4', opacity: 0.1 },
    { x1: '80%', y1: '0%', x2: '60%', y2: '100%', delay: 1.5, color: '#8b5cf6', opacity: 0.08 },
    { x1: '90%', y1: '0%', x2: '50%', y2: '100%', delay: 2, color: '#ec4899', opacity: 0.06 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {beams.map((beam, i) => (
            <linearGradient key={`grad-${i}`} id={`beam-grad-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={beam.color} stopOpacity="0" />
              <stop offset="30%" stopColor={beam.color} stopOpacity={beam.opacity} />
              <stop offset="70%" stopColor={beam.color} stopOpacity={beam.opacity * 0.5} />
              <stop offset="100%" stopColor={beam.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {beams.map((beam, i) => (
          <motion.line
            key={i}
            x1={beam.x1}
            y1={beam.y1}
            x2={beam.x2}
            y2={beam.y2}
            stroke={`url(#beam-grad-${i})`}
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: [0, 1, 1, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 4,
              delay: beam.delay,
              repeat: Infinity,
              repeatDelay: 2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </svg>
    </div>
  )
}
