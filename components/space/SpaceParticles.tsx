'use client'

// =============================================================================
// SPACE PARTICLES - tsParticles interactive dust
// =============================================================================
// Mouse-responsive particle effects for space atmosphere

import { useState, useEffect } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'

export default function SpaceParticles() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      const { loadSlim } = await import('@tsparticles/slim')
      await loadSlim(engine)
    }).then(() => setReady(true))
  }, [])

  if (!ready) return null

  return (
    <Particles
      id="space-particles"
      options={{
        fullScreen: false,
        background: { color: { value: 'transparent' } },
        fpsLimit: 60,
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: 'grab',
            },
          },
          modes: {
            grab: {
              distance: 140,
              links: {
                opacity: 0.2,
                color: '#8b5cf6',
              },
            },
          },
        },
        particles: {
          color: {
            value: ['#ffffff', '#a5d8ff', '#8b5cf6', '#ffd43b'],
          },
          links: {
            enable: false,
          },
          move: {
            enable: true,
            direction: 'none',
            outModes: { default: 'out' },
            random: true,
            speed: 0.3,
            straight: false,
          },
          number: {
            density: { enable: true },
            value: 60,
          },
          opacity: {
            value: { min: 0.1, max: 0.6 },
            animation: {
              enable: true,
              speed: 0.5,
              sync: false,
            },
          },
          shape: { type: 'circle' },
          size: {
            value: { min: 0.5, max: 2 },
          },
        },
        detectRetina: true,
      }}
      className="fixed inset-0 z-[1] pointer-events-auto"
    />
  )
}
