'use client'

// =============================================================================
// ASCENDING ROCKET - HD Lottie animation behind the hero section
// =============================================================================
// Uses a professional After Effects rocket animation rendered via lottie-react.
// Auto-plays on mount, loops continuously, sized to dominate the hero background.

import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'
import { motion } from 'framer-motion'

export default function AscendingRocket() {
  const [animationData, setAnimationData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetch('/rocket-launch.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(() => {
        // Silent fail -- decorative element
      })
  }, [])

  if (!animationData) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, delay: 0.3 }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Lottie animation -- large, centered behind hero content */}
      <div
        className="relative"
        style={{
          width: 'min(600px, 80vw)',
          height: 'min(600px, 80vw)',
          opacity: 0.55,
          filter: 'drop-shadow(0 0 40px rgba(139,92,246,0.3)) drop-shadow(0 0 80px rgba(59,130,246,0.15))',
        }}
      >
        <Lottie
          animationData={animationData}
          loop
          autoplay
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Radial vignette to blend animation into the dark background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at 50% 50%, transparent 30%, #030014 75%)',
        }}
      />
    </motion.div>
  )
}
