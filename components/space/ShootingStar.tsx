'use client'

// =============================================================================
// SHOOTING STAR - Random animated shooting stars
// =============================================================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Star {
  id: number
  x: number
  y: number
  angle: number
  length: number
  duration: number
}

export default function ShootingStars() {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    let id = 0
    const interval = setInterval(() => {
      id++
      const newStar: Star = {
        id,
        x: Math.random() * 100,
        y: Math.random() * 40,
        angle: 30 + Math.random() * 30,
        length: 80 + Math.random() * 120,
        duration: 0.8 + Math.random() * 0.6,
      }
      setStars(prev => [...prev.slice(-3), newStar])
    }, 3000 + Math.random() * 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-[2] overflow-hidden">
      <AnimatePresence>
        {stars.map(star => (
          <motion.div
            key={star.id}
            initial={{ 
              x: `${star.x}vw`,
              y: `${star.y}vh`,
              opacity: 0,
              scaleX: 0,
            }}
            animate={{
              x: `${star.x + 30}vw`,
              y: `${star.y + 20}vh`,
              opacity: [0, 1, 1, 0],
              scaleX: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: star.duration, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: star.length,
              height: 1.5,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), rgba(165,216,255,0.6), transparent)',
              transform: `rotate(${star.angle}deg)`,
              borderRadius: '100px',
              boxShadow: '0 0 6px rgba(165,216,255,0.4)',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
