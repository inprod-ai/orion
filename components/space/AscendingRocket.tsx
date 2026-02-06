'use client'

// =============================================================================
// ASCENDING ROCKET - Cinematic 3D rocket with bloom + PBR materials
// =============================================================================
// React Three Fiber scene with:
// - Environment-mapped metallic rocket body
// - Bloom post-processing for cinematic glow
// - GPU instanced exhaust particles with additive blending
// - Auto-floating animation, no user interaction needed

import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

// =============================================================================
// ROCKET BODY - PBR metallic with env map reflections
// =============================================================================

function RocketBody() {
  const groupRef = useRef<THREE.Group>(null)
  const nozzleGlowRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)

  useFrame((_s, delta) => {
    time.current += delta
    if (nozzleGlowRef.current) {
      const mat = nozzleGlowRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 3 + Math.sin(time.current * 10) * 1.5
    }
    if (groupRef.current) {
      // Micro vibration
      groupRef.current.position.x = Math.sin(time.current * 28) * 0.004
      groupRef.current.position.z = Math.cos(time.current * 33) * 0.003
    }
  })

  return (
    <group ref={groupRef}>
      {/* Nose cone */}
      <mesh position={[0, 2.6, 0]}>
        <coneGeometry args={[0.32, 1.2, 32]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.95} roughness={0.08} envMapIntensity={1.5} />
      </mesh>

      {/* Upper body */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.32, 0.35, 1.0, 32]} />
        <meshStandardMaterial color="#e4e4e7" metalness={0.92} roughness={0.1} envMapIntensity={1.4} />
      </mesh>

      {/* Main body */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.35, 0.36, 1.4, 32]} />
        <meshStandardMaterial color="#f4f4f5" metalness={0.88} roughness={0.12} envMapIntensity={1.3} />
      </mesh>

      {/* Purple accent band - glows with bloom */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.1, 32]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#7c3aed"
          emissiveIntensity={2.5}
          metalness={0.95}
          roughness={0.05}
        />
      </mesh>

      {/* Blue accent band */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.355, 0.355, 0.06, 32]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={2.0}
          metalness={0.95}
          roughness={0.05}
        />
      </mesh>

      {/* Second accent band */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.04, 32]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={1.8}
          metalness={0.95}
          roughness={0.05}
        />
      </mesh>

      {/* Engine section */}
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.36, 0.42, 0.6, 32]} />
        <meshStandardMaterial color="#71717a" metalness={0.95} roughness={0.1} envMapIntensity={1.2} />
      </mesh>

      {/* Nozzle */}
      <mesh position={[0, -1.15, 0]}>
        <cylinderGeometry args={[0.25, 0.4, 0.35, 32]} />
        <meshStandardMaterial color="#52525b" metalness={0.97} roughness={0.08} />
      </mesh>

      {/* Nozzle inner glow - bloom catches this */}
      <mesh ref={nozzleGlowRef} position={[0, -1.25, 0]}>
        <cylinderGeometry args={[0.2, 0.23, 0.12, 32]} />
        <meshStandardMaterial
          color="#ff8c00"
          emissive="#ff6600"
          emissiveIntensity={4}
          toneMapped={false}
        />
      </mesh>

      {/* Porthole */}
      <mesh position={[0, 0.85, 0.33]} rotation={[0, 0, 0]}>
        <circleGeometry args={[0.09, 32]} />
        <meshStandardMaterial
          color="#93c5fd"
          emissive="#3b82f6"
          emissiveIntensity={1.5}
          metalness={0.3}
          roughness={0.05}
        />
      </mesh>
      {/* Porthole ring */}
      <mesh position={[0, 0.85, 0.335]}>
        <ringGeometry args={[0.085, 0.105, 32]} />
        <meshStandardMaterial color="#a1a1aa" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* 4 Fins */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
        <group key={i} rotation={[0, angle, 0]}>
          <mesh position={[0.4, -0.75, 0]} rotation={[0, 0, -0.18]}>
            <boxGeometry args={[0.3, 0.7, 0.025]} />
            <meshStandardMaterial
              color="#7c3aed"
              emissive="#6d28d9"
              emissiveIntensity={0.5}
              metalness={0.9}
              roughness={0.15}
              envMapIntensity={1.0}
            />
          </mesh>
        </group>
      ))}

      {/* Engine point light */}
      <pointLight position={[0, -1.5, 0]} color="#ff6600" intensity={8} distance={6} decay={2} />
      <pointLight position={[0, -1.3, 0]} color="#60a5fa" intensity={3} distance={3} decay={2} />
    </group>
  )
}

// =============================================================================
// EXHAUST FLAME - Layered cones that bloom into bright fire
// =============================================================================

function ExhaustFlame() {
  const flameRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  useFrame((_s, delta) => {
    time.current += delta
    if (!flameRef.current) return
    const f = 0.88 + Math.sin(time.current * 18) * 0.12
    flameRef.current.scale.set(f, 1 + Math.sin(time.current * 14) * 0.08, f)
  })

  return (
    <group ref={flameRef} position={[0, -1.7, 0]}>
      {/* White-hot core - toneMapped false lets bloom catch it */}
      <mesh position={[0, 0.1, 0]}>
        <coneGeometry args={[0.1, 0.5, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.95} />
      </mesh>
      {/* Blue inner */}
      <mesh position={[0, -0.1, 0]}>
        <coneGeometry args={[0.16, 0.9, 16]} />
        <meshBasicMaterial color={new THREE.Color(2, 3, 8)} toneMapped={false} transparent opacity={0.7} />
      </mesh>
      {/* Orange mid */}
      <mesh position={[0, -0.3, 0]}>
        <coneGeometry args={[0.22, 1.4, 16]} />
        <meshBasicMaterial color={new THREE.Color(4, 1.5, 0.3)} toneMapped={false} transparent opacity={0.45} />
      </mesh>
      {/* Red outer */}
      <mesh position={[0, -0.5, 0]}>
        <coneGeometry args={[0.28, 1.8, 16]} />
        <meshBasicMaterial color={new THREE.Color(3, 0.5, 0.2)} toneMapped={false} transparent opacity={0.25} />
      </mesh>
      {/* Wide purple haze */}
      <mesh position={[0, -0.7, 0]}>
        <coneGeometry args={[0.4, 2.5, 16]} />
        <meshBasicMaterial color={new THREE.Color(1.5, 0.5, 3)} toneMapped={false} transparent opacity={0.08} />
      </mesh>
    </group>
  )
}

// =============================================================================
// GPU EXHAUST PARTICLES - Instanced for performance, bloom for glow
// =============================================================================

const PARTICLE_COUNT = 300

function ExhaustParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const time = useRef(0)

  const particles = useMemo(() => {
    const data = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      data.push({
        x: 0, y: 0, z: 0,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -2 - Math.random() * 5,
        vz: (Math.random() - 0.5) * 0.6,
        life: Math.random(),
        maxLife: 0.4 + Math.random() * 0.6,
        size: 0.02 + Math.random() * 0.04,
      })
    }
    return data
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((_s, delta) => {
    time.current += delta
    if (!meshRef.current) return

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i]
      p.life -= delta / p.maxLife

      if (p.life <= 0) {
        p.x = (Math.random() - 0.5) * 0.15
        p.y = -1.5
        p.z = (Math.random() - 0.5) * 0.15
        p.life = 1
        p.vx = (Math.random() - 0.5) * 0.7
        p.vy = -2.5 - Math.random() * 5
        p.vz = (Math.random() - 0.5) * 0.7
      } else {
        p.x += p.vx * delta
        p.y += p.vy * delta
        p.z += p.vz * delta
        p.vx *= 1 + delta * 0.6
        p.vz *= 1 + delta * 0.6
      }

      const scale = p.size * (0.5 + p.life * 0.5)
      dummy.position.set(p.x, p.y, p.z)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color={new THREE.Color(6, 3, 0.5)}
        toneMapped={false}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  )
}

// =============================================================================
// SPARK PARTICLES - Bright pinpoints that bloom into stars
// =============================================================================

const SPARK_COUNT = 120

function Sparks() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const time = useRef(0)

  const sparks = useMemo(() => {
    const data = []
    for (let i = 0; i < SPARK_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1.5 + Math.random() * 4
      data.push({
        x: 0, y: -1.4, z: 0,
        vx: Math.cos(angle) * speed * 0.4,
        vy: -speed * 0.7,
        vz: Math.sin(angle) * speed * 0.4,
        life: Math.random(),
        maxLife: 0.2 + Math.random() * 0.35,
        size: 0.008 + Math.random() * 0.015,
      })
    }
    return data
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((_s, delta) => {
    time.current += delta
    if (!meshRef.current) return

    for (let i = 0; i < SPARK_COUNT; i++) {
      const s = sparks[i]
      s.life -= delta / s.maxLife

      if (s.life <= 0) {
        s.x = (Math.random() - 0.5) * 0.12
        s.y = -1.35
        s.z = (Math.random() - 0.5) * 0.12
        s.life = 1
        const angle = Math.random() * Math.PI * 2
        const speed = 2 + Math.random() * 5
        s.vx = Math.cos(angle) * speed * 0.5
        s.vy = -speed * 0.6
        s.vz = Math.sin(angle) * speed * 0.5
      } else {
        s.x += s.vx * delta
        s.y += s.vy * delta
        s.z += s.vz * delta
        s.vy -= delta * 3 // gravity
      }

      dummy.position.set(s.x, s.y, s.z)
      dummy.scale.setScalar(s.size * s.life)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, SPARK_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color={new THREE.Color(10, 8, 2)}
        toneMapped={false}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  )
}

// =============================================================================
// SCENE LIGHTING
// =============================================================================

function Lighting() {
  return (
    <>
      <directionalLight position={[-4, 8, 5]} intensity={1.0} color="#c7d2fe" />
      <directionalLight position={[5, 3, 4]} intensity={0.5} color="#ddd6fe" />
      <directionalLight position={[0, -3, -5]} intensity={0.6} color="#3b82f6" />
      <ambientLight intensity={0.08} color="#1e1b4b" />
    </>
  )
}

// =============================================================================
// MAIN SCENE
// =============================================================================

function Scene() {
  return (
    <>
      {/* HDR environment for realistic metallic reflections */}
      <Environment preset="night" />
      <Lighting />

      {/* Float gives a slow, organic hover */}
      <Float
        speed={1.5}
        rotationIntensity={0.15}
        floatIntensity={0.4}
        floatingRange={[-0.15, 0.15]}
      >
        <group position={[0, 0.3, 0]} rotation={[0.05, 0.3, 0]}>
          <RocketBody />
          <ExhaustFlame />
          <ExhaustParticles />
          <Sparks />
        </group>
      </Float>

      {/* Post-processing: bloom makes emissive materials glow cinematically */}
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0005, 0.0005)}
        />
      </EffectComposer>
    </>
  )
}

// =============================================================================
// EXPORT
// =============================================================================

export default function AscendingRocket() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.85 }}
    >
      <Canvas
        camera={{ position: [0, 0.5, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}
