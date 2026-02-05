'use client'

// =============================================================================
// SPOTLIGHT - Aceternity-inspired spotlight effect
// =============================================================================
// Follows mouse cursor with a radial gradient glow

import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

interface SpotlightProps {
  children: React.ReactNode
  className?: string
  size?: number
  color?: string
}

export default function Spotlight({ children, className = '', size = 400, color = 'rgba(139,92,246,0.15)' }: SpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }, [])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute z-0"
        animate={{
          opacity: isHovered ? 1 : 0,
          x: position.x - size / 2,
          y: position.y - size / 2,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 150 }}
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
