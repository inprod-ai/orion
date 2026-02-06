'use client'

// =============================================================================
// ASCENDING ROCKET - Cinematic launch behind the hero section
// =============================================================================
// Large SVG rocket with canvas-based particle exhaust that launches on page load.
// Dominates the hero background with a dramatic vertical ascent.

import { useRef, useEffect, useCallback, useState } from 'react'
import { motion } from 'framer-motion'

// =============================================================================
// EXHAUST PARTICLE SYSTEM - Canvas 2D for raw performance
// =============================================================================

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  r: number
  g: number
  b: number
  type: 'flame' | 'ember' | 'smoke'
}

function ExhaustCanvas({ rocketProgress }: { rocketProgress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef<number>(0)

  const spawnParticle = useCallback((originX: number, originY: number): Particle => {
    const type = Math.random()
    if (type < 0.5) {
      // Flame core
      const spread = 18 + Math.random() * 12
      return {
        x: originX + (Math.random() - 0.5) * spread,
        y: originY,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 2 + Math.random() * 4,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.5,
        size: 3 + Math.random() * 6,
        r: 255,
        g: 160 + Math.random() * 90,
        b: 50 + Math.random() * 80,
        type: 'flame',
      }
    } else if (type < 0.8) {
      // Hot ember
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 3
      return {
        x: originX + (Math.random() - 0.5) * 10,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: 1.5 + Math.random() * 3,
        life: 1,
        maxLife: 0.3 + Math.random() * 0.4,
        size: 1 + Math.random() * 2.5,
        r: 255,
        g: 200 + Math.random() * 55,
        b: 100 + Math.random() * 100,
        type: 'ember',
      }
    } else {
      // Smoke
      return {
        x: originX + (Math.random() - 0.5) * 30,
        y: originY + Math.random() * 10,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 0.5 + Math.random() * 1.5,
        life: 1,
        maxLife: 1.5 + Math.random() * 1.5,
        size: 8 + Math.random() * 20,
        r: 100,
        g: 80,
        b: 140,
        type: 'smoke',
      }
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    let lastTime = performance.now()

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      const w = canvas.offsetWidth
      const h = canvas.offsetHeight

      ctx.clearRect(0, 0, w, h)

      // Rocket exhaust origin tracks the rocket position
      // Rocket moves from bottom to ~30% from top
      const rocketY = h * (1.1 - rocketProgress * 0.9)
      const originX = w * 0.5
      const originY = rocketY + 60 // Below the rocket body

      // Spawn new particles
      if (rocketProgress > 0.01 && rocketProgress < 0.95) {
        const count = 4 + Math.floor(Math.random() * 3)
        for (let i = 0; i < count; i++) {
          particlesRef.current.push(spawnParticle(originX, originY))
        }
      }

      // Draw engine glow at exhaust origin
      if (rocketProgress > 0.01 && rocketProgress < 0.95) {
        const glowGrad = ctx.createRadialGradient(originX, originY, 0, originX, originY, 80)
        glowGrad.addColorStop(0, 'rgba(255, 200, 100, 0.4)')
        glowGrad.addColorStop(0.3, 'rgba(249, 115, 22, 0.2)')
        glowGrad.addColorStop(0.6, 'rgba(124, 58, 237, 0.08)')
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = glowGrad
        ctx.fillRect(originX - 80, originY - 80, 160, 160)

        // White-hot core
        const coreGrad = ctx.createRadialGradient(originX, originY - 5, 0, originX, originY - 5, 15)
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
        coreGrad.addColorStop(0.5, 'rgba(180, 200, 255, 0.4)')
        coreGrad.addColorStop(1, 'rgba(100, 150, 255, 0)')
        ctx.fillStyle = coreGrad
        ctx.fillRect(originX - 15, originY - 20, 30, 30)

        // Flame column
        const flameH = 60 + Math.sin(now * 0.015) * 15
        const flameGrad = ctx.createLinearGradient(originX, originY, originX, originY + flameH)
        flameGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)')
        flameGrad.addColorStop(0.15, 'rgba(100, 165, 250, 0.5)')
        flameGrad.addColorStop(0.4, 'rgba(249, 115, 22, 0.35)')
        flameGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.15)')
        flameGrad.addColorStop(1, 'rgba(124, 58, 237, 0)')
        ctx.fillStyle = flameGrad

        ctx.beginPath()
        const flameWidth = 14 + Math.sin(now * 0.02) * 4
        ctx.moveTo(originX - flameWidth, originY)
        ctx.quadraticCurveTo(originX - flameWidth * 0.6, originY + flameH * 0.5, originX, originY + flameH)
        ctx.quadraticCurveTo(originX + flameWidth * 0.6, originY + flameH * 0.5, originX + flameWidth, originY)
        ctx.fill()
      }

      // Update and draw particles
      const alive: Particle[] = []
      for (const p of particlesRef.current) {
        p.life -= dt / p.maxLife
        if (p.life <= 0) continue

        p.x += p.vx
        p.y += p.vy

        if (p.type === 'smoke') {
          p.vx *= 0.99
          p.size += dt * 8
        } else if (p.type === 'flame') {
          p.size *= 0.995
        }

        const alpha = p.type === 'smoke'
          ? p.life * 0.08
          : p.type === 'flame'
            ? p.life * 0.6
            : p.life * 0.8

        if (p.type === 'ember') {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha})`
          ctx.fill()
        } else {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
          grad.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha})`)
          grad.addColorStop(1, `rgba(${p.r}, ${p.g}, ${p.b}, 0)`)
          ctx.fillStyle = grad
          ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2)
        }

        alive.push(p)
      }
      // Cap particles to avoid memory leak
      particlesRef.current = alive.length > 600 ? alive.slice(-600) : alive

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [rocketProgress, spawnParticle])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
  )
}

// =============================================================================
// ROCKET SVG - High-detail vector rocket
// =============================================================================

function RocketSVG() {
  return (
    <svg
      viewBox="0 0 120 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      style={{ filter: 'drop-shadow(0 0 30px rgba(139,92,246,0.3)) drop-shadow(0 0 60px rgba(59,130,246,0.15))' }}
    >
      {/* Definitions */}
      <defs>
        {/* Body metallic gradient */}
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="25%" stopColor="#e5e7eb" />
          <stop offset="50%" stopColor="#f9fafb" />
          <stop offset="75%" stopColor="#d1d5db" />
          <stop offset="100%" stopColor="#9ca3af" />
        </linearGradient>

        {/* Nose cone gradient */}
        <linearGradient id="noseGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="30%" stopColor="#d1d5db" />
          <stop offset="60%" stopColor="#f3f4f6" />
          <stop offset="100%" stopColor="#9ca3af" />
        </linearGradient>

        {/* Purple accent gradient */}
        <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6d28d9" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>

        {/* Blue accent */}
        <linearGradient id="blueAccent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>

        {/* Engine gradient */}
        <linearGradient id="engineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="40%" stopColor="#6b7280" />
          <stop offset="100%" stopColor="#374151" />
        </linearGradient>

        {/* Porthole glow */}
        <radialGradient id="portholeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="60%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e40af" />
        </radialGradient>

        {/* Fin gradient */}
        <linearGradient id="finGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>

        {/* Subtle body highlight */}
        <linearGradient id="highlight" x1="0.3" y1="0" x2="0.7" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* === NOSE CONE === */}
      <path
        d="M60 8 Q60 8 48 80 L72 80 Q60 8 60 8Z"
        fill="url(#noseGrad)"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="0.5"
      />
      {/* Nose tip highlight */}
      <path
        d="M60 10 Q58 40 54 75 L60 75 Q60 10 60 10Z"
        fill="rgba(255,255,255,0.08)"
      />

      {/* === MAIN BODY === */}
      <rect x="44" y="80" width="32" height="140" rx="2" fill="url(#bodyGrad)" />

      {/* Body center highlight */}
      <rect x="52" y="80" width="16" height="140" fill="url(#highlight)" />

      {/* === ACCENT BANDS === */}
      {/* Purple band */}
      <rect x="43" y="105" width="34" height="8" rx="1" fill="url(#accentGrad)" />
      <rect x="43" y="105" width="34" height="8" rx="1" fill="rgba(139,92,246,0.3)" style={{ filter: 'blur(2px)' }} />

      {/* Blue band */}
      <rect x="43" y="150" width="34" height="5" rx="1" fill="url(#blueAccent)" />

      {/* Thin silver lines */}
      <line x1="44" y1="130" x2="76" y2="130" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <line x1="44" y1="175" x2="76" y2="175" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

      {/* === PORTHOLE === */}
      <circle cx="60" cy="120" r="6" fill="url(#portholeGlow)" />
      <circle cx="60" cy="120" r="6" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      {/* Porthole reflection */}
      <ellipse cx="58" cy="118" rx="2" ry="1.5" fill="rgba(255,255,255,0.35)" />

      {/* === ENGINE SECTION === */}
      <path
        d="M44 220 L40 250 L80 250 L76 220Z"
        fill="url(#engineGrad)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="0.5"
      />

      {/* Engine nozzle */}
      <path
        d="M45 250 L42 275 L78 275 L75 250Z"
        fill="#374151"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="0.5"
      />

      {/* Nozzle inner ring */}
      <ellipse cx="60" cy="275" rx="16" ry="4" fill="#1f2937" />
      <ellipse cx="60" cy="275" rx="12" ry="3" fill="#f97316" opacity="0.6" />
      <ellipse cx="60" cy="275" rx="7" ry="2" fill="#fbbf24" opacity="0.8" />

      {/* === FINS === */}
      {/* Left fin */}
      <path
        d="M44 200 L18 260 L22 265 L44 230Z"
        fill="url(#finGrad)"
        stroke="rgba(139,92,246,0.3)"
        strokeWidth="0.5"
      />
      {/* Left fin highlight */}
      <path
        d="M44 205 L28 250 L32 252 L44 225Z"
        fill="rgba(255,255,255,0.06)"
      />

      {/* Right fin */}
      <path
        d="M76 200 L102 260 L98 265 L76 230Z"
        fill="url(#finGrad)"
        stroke="rgba(139,92,246,0.3)"
        strokeWidth="0.5"
      />
      {/* Right fin highlight */}
      <path
        d="M76 205 L92 250 L88 252 L76 225Z"
        fill="rgba(255,255,255,0.06)"
      />

      {/* === ORION TEXT on body === */}
      <text
        x="60" y="168"
        textAnchor="middle"
        fill="rgba(139,92,246,0.6)"
        fontSize="6"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="2"
      >
        ORION
      </text>
    </svg>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AscendingRocket() {
  const [launched, setLaunched] = useState(false)
  const [progress, setProgress] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Delay launch slightly for dramatic effect
    const launchTimer = setTimeout(() => setLaunched(true), 800)
    return () => clearTimeout(launchTimer)
  }, [])

  // Animate progress for the particle system
  useEffect(() => {
    if (!launched) return
    const start = performance.now()
    const duration = 4000 // 4 second ascent

    const tick = (now: number) => {
      const elapsed = now - start
      const p = Math.min(elapsed / duration, 1)
      // Ease-in-out for cinematic feel
      const eased = p < 0.5
        ? 2 * p * p
        : 1 - Math.pow(-2 * p + 2, 2) / 2
      setProgress(eased)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [launched])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {/* Particle exhaust canvas - full hero area */}
      <ExhaustCanvas rocketProgress={progress} />

      {/* Rocket element */}
      <motion.div
        initial={{ y: '110%', opacity: 0 }}
        animate={launched ? {
          y: [110, 50, -20, -120].map(v => `${v}%`),
          opacity: [0, 1, 1, 0],
        } : {}}
        transition={{
          duration: 4,
          ease: [0.25, 0.1, 0.25, 1],
          times: [0, 0.15, 0.7, 1],
        }}
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          width: 120,
          height: 300,
          zIndex: 2,
        }}
      >
        <RocketSVG />
      </motion.div>

      {/* Large ambient engine glow that follows the rocket */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={launched ? { opacity: [0, 0.8, 0.6, 0] } : {}}
        transition={{ duration: 4, times: [0, 0.15, 0.7, 1] }}
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: 400,
          height: 500,
          bottom: '-10%',
          zIndex: 0,
        }}
      >
        <motion.div
          animate={launched ? {
            y: [110, 50, -20, -120].map(v => `${v}%`),
          } : {}}
          transition={{
            duration: 4,
            ease: [0.25, 0.1, 0.25, 1],
            times: [0, 0.15, 0.7, 1],
          }}
          className="w-full h-full"
          style={{
            background: `
              radial-gradient(ellipse 50% 70% at 50% 30%,
                rgba(249,115,22,0.25) 0%,
                rgba(239,68,68,0.12) 30%,
                rgba(124,58,237,0.06) 60%,
                transparent 100%
              )
            `,
            filter: 'blur(40px)',
          }}
        />
      </motion.div>

      {/* Persistent exhaust trail glow left behind */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0 }}
        animate={launched ? {
          opacity: [0, 0, 0.15, 0.08, 0],
          scaleY: [0, 0.1, 0.6, 1, 1],
        } : {}}
        transition={{ duration: 6, times: [0, 0.1, 0.4, 0.7, 1] }}
        className="absolute left-1/2 -translate-x-1/2 origin-bottom"
        style={{
          width: 60,
          height: '100%',
          bottom: 0,
          background: 'linear-gradient(to top, rgba(249,115,22,0.15), rgba(124,58,237,0.05), transparent)',
          filter: 'blur(20px)',
          zIndex: 0,
        }}
      />
    </div>
  )
}
