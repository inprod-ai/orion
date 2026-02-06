'use client'

// =============================================================================
// 3D STAR FIELD - React Three Fiber + Drei
// =============================================================================
// Immersive rotating starfield background using WebGL
// Nebula effects rendered as CSS overlays for richer visuals

import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { motion } from 'framer-motion'
import type { Points } from 'three'

function RotatingStars() {
  const ref = useRef<Points>(null)
  
  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 30
      ref.current.rotation.y -= delta / 40
    }
  })
  
  return (
    <Stars
      ref={ref}
      radius={100}
      depth={80}
      count={6000}
      factor={4}
      saturation={0.3}
      fade
      speed={0.5}
    />
  )
}

export default function StarField3D() {
  return (
    <div className="fixed inset-0 z-0" style={{ background: '#030014' }}>
      {/* WebGL starfield */}
      <Suspense fallback={null}>
        <Canvas
          camera={{ position: [0, 0, 1] }}
          style={{ background: 'transparent' }}
          gl={{ antialias: false, alpha: true }}
          dpr={[1, 1.5]}
        >
          <RotatingStars />
        </Canvas>
      </Suspense>

      {/* Nebula 1 - top left, purple/violet swirl */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.55, 0.7, 0.55],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute pointer-events-none"
        style={{
          top: '-10%',
          left: '-8%',
          width: '55vw',
          height: '55vw',
          maxWidth: 700,
          maxHeight: 700,
          background: `
            radial-gradient(ellipse 60% 50% at 40% 45%, rgba(139,92,246,0.25) 0%, transparent 60%),
            radial-gradient(ellipse 40% 55% at 55% 40%, rgba(168,85,247,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 35% 30% at 50% 55%, rgba(236,72,153,0.1) 0%, transparent 50%)
          `,
          filter: 'blur(40px)',
          borderRadius: '50%',
        }}
      />

      {/* Nebula 2 - right side, blue/cyan glow */}
      <motion.div
        animate={{
          scale: [1, 1.06, 1],
          opacity: [0.45, 0.6, 0.45],
          rotate: [0, 5, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute pointer-events-none"
        style={{
          top: '15%',
          right: '-12%',
          width: '50vw',
          height: '50vw',
          maxWidth: 650,
          maxHeight: 650,
          background: `
            radial-gradient(ellipse 55% 45% at 45% 50%, rgba(59,130,246,0.2) 0%, transparent 55%),
            radial-gradient(ellipse 35% 50% at 55% 45%, rgba(6,182,212,0.12) 0%, transparent 50%),
            radial-gradient(ellipse 30% 25% at 40% 55%, rgba(99,102,241,0.08) 0%, transparent 45%)
          `,
          filter: 'blur(50px)',
          borderRadius: '50%',
        }}
      />

      {/* Nebula 3 - bottom center, warm pink/magenta cloud */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.35, 0.5, 0.35],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 7 }}
        className="absolute pointer-events-none"
        style={{
          bottom: '-15%',
          left: '20%',
          width: '60vw',
          height: '45vw',
          maxWidth: 800,
          maxHeight: 550,
          background: `
            radial-gradient(ellipse 50% 60% at 50% 40%, rgba(236,72,153,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 45% 40% at 40% 50%, rgba(139,92,246,0.1) 0%, transparent 50%),
            radial-gradient(ellipse 30% 35% at 60% 45%, rgba(244,114,182,0.08) 0%, transparent 45%)
          `,
          filter: 'blur(60px)',
          borderRadius: '50%',
        }}
      />

      {/* Star cluster accent - small bright patch */}
      <motion.div
        animate={{
          opacity: [0.3, 0.55, 0.3],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute pointer-events-none"
        style={{
          top: '30%',
          left: '60%',
          width: 200,
          height: 200,
          background: `
            radial-gradient(circle at center, rgba(255,255,255,0.08) 0%, rgba(165,216,255,0.04) 30%, transparent 60%)
          `,
          filter: 'blur(15px)',
          borderRadius: '50%',
        }}
      />

      {/* Distant galaxy - subtle elongated glow */}
      <motion.div
        animate={{
          opacity: [0.2, 0.35, 0.2],
          rotate: [15, 20, 15],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute pointer-events-none"
        style={{
          top: '55%',
          right: '10%',
          width: 180,
          height: 60,
          background: `
            radial-gradient(ellipse 100% 100% at center, rgba(255,255,255,0.12) 0%, rgba(165,216,255,0.06) 40%, transparent 70%)
          `,
          filter: 'blur(8px)',
          borderRadius: '50%',
          transform: 'rotate(15deg)',
        }}
      />
    </div>
  )
}
