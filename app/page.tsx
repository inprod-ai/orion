'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Github, Rocket, Shield, Sparkles, AlertCircle, X, Zap, BarChart3, Lock, Globe } from 'lucide-react'

import { extractRepoInfo } from '@/lib/utils'
import AnalysisScreen from '@/components/AnalysisScreen'
import UserMenu from '@/components/UserMenu'
import RepoSelector from '@/components/RepoSelector'
import { OrionLogo } from '@/components/space'
import GlowingCard from '@/components/space/GlowingCard'
import BeamEffect from '@/components/space/BeamEffect'
import ShootingStars from '@/components/space/ShootingStar'
import Spotlight from '@/components/space/Spotlight'

// Dynamic imports for heavy 3D/particle components
const StarField3D = dynamic(() => import('@/components/space/StarField3D'), { ssr: false })
const SpaceParticles = dynamic(() => import('@/components/space/SpaceParticles'), { ssr: false })

interface UserData {
  id: string
  name: string | null
  email: string | null
  image: string | null
  tier: 'FREE' | 'PRO' | 'ENTERPRISE'
  monthlyScans: number
}

// Wrapper to handle useSearchParams with Suspense
function HomeContent() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<UserData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [repoUrl, setRepoUrl] = useState('')
  const [error, setError] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95])

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user)
    } catch (error) {
      console.error('Failed to fetch user:', error)
    } finally {
      setUserLoading(false)
    }
  }

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const authSuccess = searchParams.get('auth')
    
    if (errorParam) {
      setAuthError(decodeURIComponent(errorParam))
      window.history.replaceState({}, '', '/')
    }
    
    if (authSuccess === 'success') {
      fetchUser()
      window.history.replaceState({}, '', '/')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const repoInfo = extractRepoInfo(repoUrl)
    if (!repoInfo) {
      setError('Please enter a valid GitHub repository URL')
      return
    }

    setAnalyzing(true)
  }

  const handleSelectRepo = (url: string) => {
    setRepoUrl(url)
    setAnalyzing(true)
  }

  if (analyzing && repoUrl) {
    return <AnalysisScreen repoUrl={repoUrl} />
  }

  const isSignedIn = !userLoading && user !== null

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: '#030014' }}>
      {/* Layer 0: 3D WebGL starfield */}
      <StarField3D />
      
      {/* Layer 1: Interactive particles */}
      <SpaceParticles />
      
      {/* Layer 2: Shooting stars */}
      <ShootingStars />

      {/* Layer 3: SVG beam effects */}
      <BeamEffect />
      
      {/* Layer 4: Nebula gradient overlay */}
      <div className="fixed inset-0 z-[3] pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 80% 50% at 20% 40%, rgba(139,92,246,0.12), transparent),
          radial-gradient(ellipse 60% 40% at 80% 60%, rgba(59,130,246,0.08), transparent),
          radial-gradient(ellipse 100% 80% at 50% 100%, rgba(236,72,153,0.06), transparent)
        `,
      }} />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex justify-between items-center">
          <Link href="/">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group"
            >
              <OrionLogo size="md" />
              <span className="font-bold text-xl tracking-[0.2em] text-white group-hover:text-purple-200 transition-colors">
                ORION
              </span>
            </motion.div>
          </Link>
          <UserMenu />
        </header>

        {/* Main content */}
        <Spotlight className="flex-1 flex items-center justify-center px-6" size={600} color="rgba(139,92,246,0.08)">
          <motion.div ref={heroRef} style={{ opacity: heroOpacity, scale: heroScale }} className="max-w-5xl w-full">
            {/* Auth Error Banner */}
            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto mb-6"
              >
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3 backdrop-blur-sm">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-400 font-medium">Sign in failed</p>
                    <p className="text-red-400/80 text-sm mt-1">{authError}</p>
                  </div>
                  <button onClick={() => setAuthError(null)} className="text-red-400/60 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-center mb-12"
            >
              {/* Hero constellation */}
              <motion.div 
                className="flex justify-center mb-10"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.3, type: 'spring' }}
              >
                <OrionLogo size="xl" />
              </motion.div>
              
              <motion.h1 
                className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <span className="bg-gradient-to-r from-purple-200 via-blue-200 to-cyan-200 bg-clip-text text-transparent">
                  How high can
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
                  your code fly?
                </span>
              </motion.h1>
              
              <motion.p 
                className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                Orion measures your <span className="text-purple-300/90">altitude</span> -- the max concurrent users your codebase can handle.
                Paste a repo. See what&apos;s holding you back. Fix it and climb.
              </motion.p>
            </motion.div>

            {/* Input Section */}
            {isSignedIn ? (
              <RepoSelector onSelectRepo={handleSelectRepo} />
            ) : (
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                onSubmit={handleSubmit}
                className="max-w-2xl mx-auto"
              >
                <div className="relative group">
                  {/* Animated glow ring */}
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 20px rgba(139,92,246,0.2), 0 0 40px rgba(59,130,246,0.1)',
                        '0 0 30px rgba(139,92,246,0.3), 0 0 60px rgba(59,130,246,0.15)',
                        '0 0 20px rgba(139,92,246,0.2), 0 0 40px rgba(59,130,246,0.1)',
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute -inset-[1px] rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(59,130,246,0.3), rgba(6,182,212,0.4))',
                      padding: '1px',
                    }}
                  >
                    <div className="w-full h-full rounded-xl" style={{ background: 'rgba(3,0,20,0.9)' }} />
                  </motion.div>
                  
                  <div className="relative rounded-xl p-2" style={{ background: 'rgba(3,0,20,0.8)', backdropFilter: 'blur(12px)' }}>
                    <div className="flex items-center gap-2">
                      <Github className="w-6 h-6 text-purple-400/60 ml-4" />
                      <input
                        type="text"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/username/repository"
                        className="flex-1 bg-transparent text-white placeholder-gray-600 px-4 py-4 focus:outline-none text-lg"
                      />
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        type="submit"
                        className="relative overflow-hidden px-8 py-3.5 rounded-lg font-semibold mr-1 transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                          boxShadow: '0 0 20px rgba(124,58,237,0.3), 0 4px 12px rgba(0,0,0,0.3)',
                        }}
                      >
                        <span className="relative z-10">Launch</span>
                        <motion.div
                          className="absolute inset-0"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                          style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                          }}
                        />
                      </motion.button>
                    </div>
                  </div>
                </div>
                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm mt-3 text-center">
                    {error}
                  </motion.p>
                )}
              </motion.form>
            )}

            {/* Feature Cards */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20"
            >
              {[
                { icon: Shield, title: 'Heat Shield', desc: 'Your security layer. Auth, encryption, headers, secrets. If the shield fails, you never reach orbit.', color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)' },
                { icon: Rocket, title: 'Engines', desc: 'Backend, database, deployment. The infrastructure that determines how many users you can carry.', color: '#3b82f6', glow: 'rgba(59,130,246,0.3)' },
                { icon: Sparkles, title: 'Pre-flight', desc: 'Tests, error handling, code quality. The checks that tell you whether it is actually safe to launch.', color: '#06b6d4', glow: 'rgba(6,182,212,0.3)' },
              ].map((feature, i) => (
                <GlowingCard key={feature.title} glowColor={feature.glow} className="p-7 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 + i * 0.15 }}
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                         style={{ background: `linear-gradient(135deg, ${feature.color}33, ${feature.color}11)` }}>
                      <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                  </motion.div>
                </GlowingCard>
              ))}
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 }}
              className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
            >
              {[
                { label: 'Rocket Components', value: '12', icon: BarChart3 },
                { label: 'Production Checks', value: '200+', icon: Zap },
                { label: 'Altitude Zones', value: '11', icon: Globe },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <stat.icon className="w-5 h-5 text-purple-400/60 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </motion.div>
            
            {/* Altitude levels preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              className="mt-16 text-center"
            >
              <p className="text-gray-600 text-sm mb-4">from runway to deep space</p>
              <div className="flex justify-center items-center gap-2 flex-wrap">
                {['Runway', 'Takeoff', 'Cruising', 'Stratosphere', 'Karman Line', 'Orbit', 'Voyager'].map((level, i) => (
                  <motion.span
                    key={level}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.6 + i * 0.08 }}
                    className="text-xs px-3 py-1.5 rounded-full transition-colors cursor-default"
                    style={{ 
                      border: `1px solid rgba(139, 92, 246, ${0.15 + i * 0.08})`,
                      color: `rgba(${200 - i * 10}, ${180 - i * 5}, 255, ${0.4 + i * 0.08})`,
                      background: `rgba(139, 92, 246, ${0.02 + i * 0.01})`,
                    }}
                    whileHover={{
                      borderColor: 'rgba(139,92,246,0.6)',
                      boxShadow: '0 0 15px rgba(139,92,246,0.2)',
                    }}
                  >
                    {level}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </Spotlight>
        
        {/* Footer */}
        <footer className="p-8 text-center">
          <p className="text-gray-700 text-sm tracking-widest">
            the stars are the limit
          </p>
        </footer>
      </div>
    </div>
  )
}

// Main export with Suspense boundary for useSearchParams
export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#030014' }}>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-purple-400/60 text-sm tracking-widest"
        >
          INITIALIZING
        </motion.div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
