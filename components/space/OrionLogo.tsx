'use client'

// =============================================================================
// ORION LOGO - Constellation with connecting lines and glow
// =============================================================================

import { motion } from 'framer-motion'

interface OrionLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const dims = { sm: 28, md: 36, lg: 56, xl: 80 }

export default function OrionLogo({ size = 'md' }: OrionLogoProps) {
  const d = dims[size]
  const starScale = d / 36

  // Star positions (relative to 36x36 viewbox) - Orion's belt diagonal
  const stars = [
    { cx: 5, cy: 6, r: 2.5 * starScale, delay: 0, name: 'Alnitak' },
    { cx: 18, cy: 16, r: 3.5 * starScale, delay: 0.3, name: 'Alnilam', bright: true },
    { cx: 31, cy: 28, r: 2.5 * starScale, delay: 0.6, name: 'Mintaka' },
  ]

  return (
    <div className="relative" style={{ width: d, height: d }}>
      {/* Connection lines */}
      <svg className="absolute inset-0" width={d} height={d} viewBox="0 0 36 36">
        <motion.line
          x1="5" y1="6" x2="18" y2="16"
          stroke="rgba(139,92,246,0.3)"
          strokeWidth="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        <motion.line
          x1="18" y1="16" x2="31" y2="28"
          stroke="rgba(139,92,246,0.3)"
          strokeWidth="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
        />
      </svg>

      {/* Stars */}
      {stars.map((star) => (
        <motion.div
          key={star.name}
          animate={{
            boxShadow: star.bright ? [
              '0 0 8px 2px rgba(165,216,255,0.6), 0 0 16px 4px rgba(139,92,246,0.4)',
              '0 0 14px 4px rgba(165,216,255,0.9), 0 0 28px 8px rgba(139,92,246,0.6)',
              '0 0 8px 2px rgba(165,216,255,0.6), 0 0 16px 4px rgba(139,92,246,0.4)',
            ] : [
              '0 0 6px 1px rgba(139,92,246,0.5), 0 0 12px 3px rgba(139,92,246,0.2)',
              '0 0 10px 2px rgba(139,92,246,0.7), 0 0 20px 5px rgba(139,92,246,0.3)',
              '0 0 6px 1px rgba(139,92,246,0.5), 0 0 12px 3px rgba(139,92,246,0.2)',
            ],
          }}
          transition={{ duration: 2 + star.delay, repeat: Infinity }}
          className="absolute rounded-full"
          style={{
            width: star.r * 2,
            height: star.r * 2,
            left: (star.cx / 36) * d - star.r,
            top: (star.cy / 36) * d - star.r,
            background: star.bright
              ? 'linear-gradient(135deg, #fff 0%, #a5d8ff 100%)'
              : '#ffffff',
          }}
        />
      ))}
    </div>
  )
}
