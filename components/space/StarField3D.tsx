'use client'

// =============================================================================
// 3D STAR FIELD - React Three Fiber + Drei
// =============================================================================
// Immersive rotating starfield background using WebGL

import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, Float } from '@react-three/drei'
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

function FloatingOrb({ position, color, size }: { position: [number, number, number]; color: string; size: number }) {
  return (
    <Float speed={1.5} rotationIntensity={0} floatIntensity={2}>
      <mesh position={position}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
      {/* Glow */}
      <mesh position={position}>
        <sphereGeometry args={[size * 2, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.03} />
      </mesh>
    </Float>
  )
}

export default function StarField3D() {
  return (
    <div className="fixed inset-0 z-0" style={{ background: '#030014' }}>
      <Suspense fallback={null}>
        <Canvas
          camera={{ position: [0, 0, 1] }}
          style={{ background: 'transparent' }}
          gl={{ antialias: false, alpha: true }}
          dpr={[1, 1.5]}
        >
          <RotatingStars />
          {/* Distant nebula orbs */}
          <FloatingOrb position={[-15, 8, -30]} color="#8b5cf6" size={3} />
          <FloatingOrb position={[20, -5, -40]} color="#3b82f6" size={4} />
          <FloatingOrb position={[5, 15, -50]} color="#ec4899" size={2.5} />
          <ambientLight intensity={0.1} />
        </Canvas>
      </Suspense>
    </div>
  )
}
