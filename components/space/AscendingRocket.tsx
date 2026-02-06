'use client'

// =============================================================================
// ASCENDING ROCKET - Cinematic 3D rocket rising through the atmosphere
// =============================================================================
// Scroll-linked rocket with engine glow, exhaust particles, and heat distortion.
// Built with React Three Fiber for WebGL performance.

import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// =============================================================================
// CONSTANTS
// =============================================================================

const EXHAUST_PARTICLE_COUNT = 200
const SPARK_COUNT = 80
const SMOKE_COUNT = 60

// =============================================================================
// ROCKET BODY - Procedural geometry with metallic finish
// =============================================================================

function RocketBody({ scrollProgress }: { scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const engineGlowRef = useRef<THREE.PointLight>(null)
  const time = useRef(0)

  useFrame((_state, delta) => {
    time.current += delta
    if (!groupRef.current) return

    // Gentle sway as it climbs
    groupRef.current.rotation.z = Math.sin(time.current * 0.8) * 0.03
    groupRef.current.rotation.x = Math.sin(time.current * 0.5) * 0.02

    // Subtle vibration at high thrust
    const vibration = 0.008
    groupRef.current.position.x = Math.sin(time.current * 25) * vibration
    groupRef.current.position.z = Math.cos(time.current * 30) * vibration * 0.5

    // Engine glow pulsation
    if (engineGlowRef.current) {
      engineGlowRef.current.intensity = 3 + Math.sin(time.current * 8) * 0.8
    }
  })

  return (
    <group ref={groupRef}>
      {/* Nose cone */}
      <mesh position={[0, 2.2, 0]}>
        <coneGeometry args={[0.28, 0.9, 16]} />
        <meshStandardMaterial
          color="#c4c9d4"
          metalness={0.85}
          roughness={0.15}
          emissive="#1a1a3e"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Upper body */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.28, 0.3, 1.1, 16]} />
        <meshStandardMaterial
          color="#d1d5db"
          metalness={0.8}
          roughness={0.2}
          emissive="#1a1a3e"
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Main body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.32, 1.3, 16]} />
        <meshStandardMaterial
          color="#e5e7eb"
          metalness={0.75}
          roughness={0.25}
          emissive="#0a0a2e"
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Purple accent band */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.305, 0.305, 0.08, 16]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#7c3aed"
          emissiveIntensity={0.6}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Blue accent band */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.315, 0.315, 0.05, 16]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Engine section */}
      <mesh position={[0, -0.9, 0]}>
        <cylinderGeometry args={[0.32, 0.38, 0.5, 16]} />
        <meshStandardMaterial
          color="#6b7280"
          metalness={0.9}
          roughness={0.15}
          emissive="#1f1f4e"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Engine nozzle */}
      <mesh position={[0, -1.25, 0]}>
        <cylinderGeometry args={[0.22, 0.35, 0.25, 16]} />
        <meshStandardMaterial
          color="#4b5563"
          metalness={0.95}
          roughness={0.1}
        />
      </mesh>

      {/* Nozzle inner glow */}
      <mesh position={[0, -1.3, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.1, 16]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.9} />
      </mesh>

      {/* Fins - 4 cardinal directions */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
        <group key={i} rotation={[0, angle, 0]}>
          <mesh position={[0.35, -0.85, 0]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[0.25, 0.6, 0.03]} />
            <meshStandardMaterial
              color="#9ca3af"
              metalness={0.8}
              roughness={0.2}
              emissive="#3b1f7a"
              emissiveIntensity={0.15}
            />
          </mesh>
        </group>
      ))}

      {/* Window / porthole */}
      <mesh position={[0, 0.7, 0.29]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#3b82f6"
          emissiveIntensity={0.8}
          metalness={0.3}
          roughness={0.1}
        />
      </mesh>

      {/* Engine point light */}
      <pointLight
        ref={engineGlowRef}
        position={[0, -1.5, 0]}
        color="#f97316"
        intensity={3}
        distance={8}
        decay={2}
      />

      {/* Secondary engine light - blue core */}
      <pointLight
        position={[0, -1.35, 0]}
        color="#60a5fa"
        intensity={1.5}
        distance={4}
        decay={2}
      />
    </group>
  )
}

// =============================================================================
// EXHAUST FLAME - Hot core plume with color gradient
// =============================================================================

function ExhaustFlame() {
  const flameRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  useFrame((_state, delta) => {
    time.current += delta
    if (!flameRef.current) return

    // Flame flicker
    const flickerScale = 0.85 + Math.sin(time.current * 15) * 0.15
    flameRef.current.scale.set(flickerScale, 1 + Math.sin(time.current * 12) * 0.1, flickerScale)
  })

  return (
    <group ref={flameRef} position={[0, -1.8, 0]}>
      {/* White-hot core */}
      <mesh position={[0, 0.15, 0]}>
        <coneGeometry args={[0.12, 0.6, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>

      {/* Blue inner flame */}
      <mesh position={[0, -0.05, 0]}>
        <coneGeometry args={[0.18, 1.0, 12]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.8} />
      </mesh>

      {/* Orange mid flame */}
      <mesh position={[0, -0.3, 0]}>
        <coneGeometry args={[0.24, 1.5, 12]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.5} />
      </mesh>

      {/* Red outer flame */}
      <mesh position={[0, -0.5, 0]}>
        <coneGeometry args={[0.3, 2.0, 12]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.25} />
      </mesh>

      {/* Wide glow cone */}
      <mesh position={[0, -0.8, 0]}>
        <coneGeometry args={[0.5, 3.0, 12]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.08} />
      </mesh>
    </group>
  )
}

// =============================================================================
// EXHAUST PARTICLES - Trailing hot embers behind the rocket
// =============================================================================

function ExhaustParticles() {
  const particlesRef = useRef<THREE.Points>(null)
  const time = useRef(0)

  const { positions, velocities, lifetimes, colors } = useMemo(() => {
    const pos = new Float32Array(EXHAUST_PARTICLE_COUNT * 3)
    const vel = new Float32Array(EXHAUST_PARTICLE_COUNT * 3)
    const life = new Float32Array(EXHAUST_PARTICLE_COUNT)
    const col = new Float32Array(EXHAUST_PARTICLE_COUNT * 3)

    for (let i = 0; i < EXHAUST_PARTICLE_COUNT; i++) {
      // Start near engine
      pos[i * 3] = (Math.random() - 0.5) * 0.3
      pos[i * 3 + 1] = -2 - Math.random() * 6
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.3

      // Downward velocity with spread
      vel[i * 3] = (Math.random() - 0.5) * 0.4
      vel[i * 3 + 1] = -2 - Math.random() * 3
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.4

      life[i] = Math.random()

      // Orange-yellow hot particle colors
      const heat = Math.random()
      col[i * 3] = 1.0
      col[i * 3 + 1] = 0.4 + heat * 0.5
      col[i * 3 + 2] = heat * 0.3
    }

    return { positions: pos, velocities: vel, lifetimes: life, colors: col }
  }, [])

  useFrame((_state, delta) => {
    time.current += delta
    if (!particlesRef.current) return

    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < EXHAUST_PARTICLE_COUNT; i++) {
      lifetimes[i] -= delta * (0.8 + Math.random() * 0.4)

      if (lifetimes[i] <= 0) {
        // Reset particle at engine position
        posArray[i * 3] = (Math.random() - 0.5) * 0.2
        posArray[i * 3 + 1] = -1.5
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 0.2
        lifetimes[i] = 1.0
        velocities[i * 3] = (Math.random() - 0.5) * 0.5
        velocities[i * 3 + 1] = -2 - Math.random() * 4
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5
      } else {
        posArray[i * 3] += velocities[i * 3] * delta
        posArray[i * 3 + 1] += velocities[i * 3 + 1] * delta
        posArray[i * 3 + 2] += velocities[i * 3 + 2] * delta

        // Spread out over time
        velocities[i * 3] *= 1.0 + delta * 0.5
        velocities[i * 3 + 2] *= 1.0 + delta * 0.5
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// =============================================================================
// SPARKS - Bright pinpoint sparks shooting out from the engine
// =============================================================================

function Sparks() {
  const sparksRef = useRef<THREE.Points>(null)
  const time = useRef(0)

  const { positions, velocities, lifetimes } = useMemo(() => {
    const pos = new Float32Array(SPARK_COUNT * 3)
    const vel = new Float32Array(SPARK_COUNT * 3)
    const life = new Float32Array(SPARK_COUNT)

    for (let i = 0; i < SPARK_COUNT; i++) {
      pos[i * 3] = 0
      pos[i * 3 + 1] = -1.5
      pos[i * 3 + 2] = 0
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 3
      vel[i * 3] = Math.cos(angle) * speed * 0.3
      vel[i * 3 + 1] = -speed
      vel[i * 3 + 2] = Math.sin(angle) * speed * 0.3
      life[i] = Math.random()
    }

    return { positions: pos, velocities: vel, lifetimes: life }
  }, [])

  useFrame((_state, delta) => {
    time.current += delta
    if (!sparksRef.current) return

    const posArray = sparksRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < SPARK_COUNT; i++) {
      lifetimes[i] -= delta * 2

      if (lifetimes[i] <= 0) {
        posArray[i * 3] = (Math.random() - 0.5) * 0.15
        posArray[i * 3 + 1] = -1.4
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 0.15
        lifetimes[i] = 0.5 + Math.random() * 0.5
        const angle = Math.random() * Math.PI * 2
        const speed = 2 + Math.random() * 4
        velocities[i * 3] = Math.cos(angle) * speed * 0.4
        velocities[i * 3 + 1] = -speed * 0.8
        velocities[i * 3 + 2] = Math.sin(angle) * speed * 0.4
      } else {
        posArray[i * 3] += velocities[i * 3] * delta
        posArray[i * 3 + 1] += velocities[i * 3 + 1] * delta
        posArray[i * 3 + 2] += velocities[i * 3 + 2] * delta

        // Gravity pulls sparks down
        velocities[i * 3 + 1] -= delta * 2
      }
    }

    sparksRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={sparksRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#fbbf24"
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// =============================================================================
// SMOKE TRAIL - Soft volumetric smoke billowing behind
// =============================================================================

function SmokeTrail() {
  const smokeRef = useRef<THREE.Points>(null)

  const { positions, sizes, lifetimes, velocities } = useMemo(() => {
    const pos = new Float32Array(SMOKE_COUNT * 3)
    const sz = new Float32Array(SMOKE_COUNT)
    const life = new Float32Array(SMOKE_COUNT)
    const vel = new Float32Array(SMOKE_COUNT * 3)

    for (let i = 0; i < SMOKE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.5
      pos[i * 3 + 1] = -3 - Math.random() * 8
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5
      sz[i] = 0.3 + Math.random() * 0.5
      life[i] = Math.random()
      vel[i * 3] = (Math.random() - 0.5) * 0.3
      vel[i * 3 + 1] = -0.5 - Math.random()
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.3
    }

    return { positions: pos, sizes: sz, lifetimes: life, velocities: vel }
  }, [])

  useFrame((_state, delta) => {
    if (!smokeRef.current) return
    const posArray = smokeRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < SMOKE_COUNT; i++) {
      lifetimes[i] -= delta * 0.3

      if (lifetimes[i] <= 0) {
        posArray[i * 3] = (Math.random() - 0.5) * 0.3
        posArray[i * 3 + 1] = -2.5
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 0.3
        lifetimes[i] = 1.0
        velocities[i * 3] = (Math.random() - 0.5) * 0.4
        velocities[i * 3 + 1] = -0.3 - Math.random() * 0.8
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4
      } else {
        posArray[i * 3] += velocities[i * 3] * delta
        posArray[i * 3 + 1] += velocities[i * 3 + 1] * delta
        posArray[i * 3 + 2] += velocities[i * 3 + 2] * delta

        // Smoke expands
        velocities[i * 3] *= 1.0 + delta * 0.8
        velocities[i * 3 + 2] *= 1.0 + delta * 0.8
      }
    }

    smokeRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={smokeRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.4}
        color="#4b5563"
        transparent
        opacity={0.15}
        blending={THREE.NormalBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// =============================================================================
// SCENE - Composes rocket + effects, handles scroll-linked vertical position
// =============================================================================

function RocketScene({ scrollProgress }: { scrollProgress: number }) {
  const sceneRef = useRef<THREE.Group>(null)
  const targetY = useRef(0)
  const currentY = useRef(-6)

  useFrame(() => {
    if (!sceneRef.current) return

    // Rocket rises from below viewport to above as user scrolls
    // Starts at y=-6 (below camera), rises to y=+10 (above camera)
    targetY.current = -6 + scrollProgress * 16

    // Smooth interpolation for cinematic feel
    currentY.current += (targetY.current - currentY.current) * 0.04

    sceneRef.current.position.y = currentY.current

    // Slight tilt as it accelerates
    sceneRef.current.rotation.x = -scrollProgress * 0.1
  })

  return (
    <group ref={sceneRef} position={[1.5, -6, -3]}>
      <RocketBody scrollProgress={scrollProgress} />
      <ExhaustFlame />
      <ExhaustParticles />
      <Sparks />
      <SmokeTrail />
    </group>
  )
}

// =============================================================================
// LIGHTING
// =============================================================================

function SceneLighting() {
  return (
    <>
      {/* Key light - cool blue from upper left */}
      <directionalLight
        position={[-5, 8, 5]}
        intensity={1.2}
        color="#a5d8ff"
      />

      {/* Fill light - warm purple from right */}
      <directionalLight
        position={[4, 2, 3]}
        intensity={0.6}
        color="#c4b5fd"
      />

      {/* Rim light - blue backlight for silhouette */}
      <directionalLight
        position={[0, -2, -5]}
        intensity={0.8}
        color="#3b82f6"
      />

      {/* Ambient - deep space */}
      <ambientLight intensity={0.15} color="#1e1b4b" />
    </>
  )
}

// =============================================================================
// CSS GLOW OVERLAY - 2D engine glow rendered on top of the canvas
// =============================================================================

function EngineGlowOverlay({ scrollProgress }: { scrollProgress: number }) {
  // Position the glow relative to where the rocket is on screen
  // Rocket starts at bottom-right and rises
  const bottomOffset = Math.max(0, (1 - scrollProgress) * 80 - 10)
  const opacity = scrollProgress < 0.85 ? 0.6 : 0.6 * (1 - (scrollProgress - 0.85) / 0.15)

  if (scrollProgress > 0.95) return null

  return (
    <>
      {/* Main engine glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: '15%',
          bottom: `${bottomOffset}%`,
          width: 300,
          height: 400,
          background: `
            radial-gradient(ellipse 40% 60% at 50% 20%,
              rgba(249,115,22,${0.25 * opacity}) 0%,
              rgba(239,68,68,${0.12 * opacity}) 30%,
              rgba(124,58,237,${0.06 * opacity}) 60%,
              transparent 100%
            )
          `,
          filter: 'blur(30px)',
          transform: 'translateY(50%)',
        }}
      />

      {/* Bright core point */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: 'calc(15% + 120px)',
          bottom: `${bottomOffset + 2}%`,
          width: 60,
          height: 80,
          background: `
            radial-gradient(ellipse at center,
              rgba(255,255,255,${0.4 * opacity}) 0%,
              rgba(96,165,250,${0.3 * opacity}) 30%,
              transparent 70%
            )
          `,
          filter: 'blur(8px)',
          transform: 'translateY(50%)',
        }}
      />
    </>
  )
}

// =============================================================================
// MAIN EXPORT - Full rocket background component
// =============================================================================

export default function AscendingRocket() {
  const [scrollProgress, setScrollProgress] = useState(0)

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0
    setScrollProgress(progress)
  }, [])

  useEffect(() => {
    // Throttle scroll events for performance
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    handleScroll() // initial read
    return () => window.removeEventListener('scroll', onScroll)
  }, [handleScroll])

  return (
    <div className="fixed inset-0 z-[1] pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <SceneLighting />
        <RocketScene scrollProgress={scrollProgress} />
      </Canvas>

      {/* 2D glow overlays for extra richness */}
      <EngineGlowOverlay scrollProgress={scrollProgress} />
    </div>
  )
}
