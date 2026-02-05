'use client'

// =============================================================================
// GLOWING CARD - Aceternity-inspired hover glow effect
// =============================================================================
// Card that reveals animated stars and glow on hover

import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

interface GlowingCardProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
}

export default function GlowingCard({ children, className = '', glowColor = 'rgba(139,92,246,0.4)' }: GlowingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }, [])

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -6, scale: 1.02 }}
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.04) 50%, rgba(6,182,212,0.08) 100%)',
        border: '1px solid rgba(139,92,246,0.2)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Mouse follow glow */}
      <motion.div
        className="pointer-events-none absolute z-0"
        animate={{
          opacity: isHovered ? 1 : 0,
          x: mousePos.x - 150,
          y: mousePos.y - 150,
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        style={{
          width: 300,
          height: 300,
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        }}
      />

      {/* Border glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        style={{
          boxShadow: `inset 0 0 40px rgba(139,92,246,0.08), 0 0 30px rgba(139,92,246,0.15)`,
          border: '1px solid rgba(139,92,246,0.4)',
        }}
      />

      {/* Sparkle stars on hover */}
      {isHovered && (
        <>
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
              transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
              className="absolute w-1 h-1 bg-white rounded-full pointer-events-none"
              style={{
                left: `${20 + i * 15}%`,
                top: `${15 + (i % 3) * 25}%`,
                boxShadow: '0 0 6px 2px rgba(255,255,255,0.6)',
              }}
            />
          ))}
        </>
      )}

      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
