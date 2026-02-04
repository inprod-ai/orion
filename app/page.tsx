'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Github, Rocket, Shield, Sparkles, AlertCircle, X } from 'lucide-react'
import { extractRepoInfo } from '@/lib/utils'
import AnalysisScreen from '@/components/AnalysisScreen'
import UserMenu from '@/components/UserMenu'
import RepoSelector from '@/components/RepoSelector'

interface UserData {
  id: string
  name: string | null
  email: string | null
  image: string | null
  tier: 'FREE' | 'PRO' | 'ENTERPRISE'
  monthlyScans: number
}

// Orion constellation logo component
function OrionLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = { sm: 24, md: 32, lg: 48 }
  const starSizes = { sm: [4, 6, 4], md: [6, 8, 6], lg: [8, 12, 8] }
  const dim = dimensions[size]
  const stars = starSizes[size]
  
  return (
    <div className="relative" style={{ width: dim, height: dim }}>
      {/* Alnitak - top left star */}
      <motion.div
        animate={{ 
          boxShadow: [
            '0 0 8px 2px rgba(139,92,246,0.6), 0 0 16px 4px rgba(139,92,246,0.3)',
            '0 0 12px 3px rgba(139,92,246,0.8), 0 0 24px 6px rgba(139,92,246,0.4)',
            '0 0 8px 2px rgba(139,92,246,0.6), 0 0 16px 4px rgba(139,92,246,0.3)',
          ]
        }}
        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
        className="absolute bg-white rounded-full"
        style={{ 
          width: stars[0], height: stars[0], 
          top: '10%', left: '5%' 
        }}
      />
      {/* Alnilam - center star (brightest) */}
      <motion.div
        animate={{ 
          boxShadow: [
            '0 0 10px 3px rgba(165,216,255,0.8), 0 0 20px 6px rgba(139,92,246,0.5)',
            '0 0 16px 5px rgba(165,216,255,1), 0 0 32px 10px rgba(139,92,246,0.7)',
            '0 0 10px 3px rgba(165,216,255,0.8), 0 0 20px 6px rgba(139,92,246,0.5)',
          ]
        }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
        className="absolute rounded-full"
        style={{ 
          width: stars[1], height: stars[1], 
          top: '35%', left: '35%',
          background: 'linear-gradient(135deg, #fff 0%, #a5d8ff 100%)'
        }}
      />
      {/* Mintaka - bottom right star */}
      <motion.div
        animate={{ 
          boxShadow: [
            '0 0 8px 2px rgba(139,92,246,0.6), 0 0 16px 4px rgba(139,92,246,0.3)',
            '0 0 12px 3px rgba(139,92,246,0.8), 0 0 24px 6px rgba(139,92,246,0.4)',
            '0 0 8px 2px rgba(139,92,246,0.6), 0 0 16px 4px rgba(139,92,246,0.3)',
          ]
        }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
        className="absolute bg-white rounded-full"
        style={{ 
          width: stars[2], height: stars[2], 
          bottom: '10%', right: '5%' 
        }}
      />
    </div>
  )
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

  // Fetch user on mount
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

  // Check for auth errors/success in URL
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const authSuccess = searchParams.get('auth')
    
    if (errorParam) {
      setAuthError(decodeURIComponent(errorParam))
      window.history.replaceState({}, '', '/')
    }
    
    if (authSuccess === 'success') {
      // Refresh user data after successful auth
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
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: 'var(--orion-void)' }}>
      {/* Animated star field background */}
      <div className="stars-layer" />
      
      {/* Nebula gradient overlay */}
      <div className="nebula-bg absolute inset-0" />
      
      {/* Subtle animated nebula clouds */}
      <motion.div
        animate={{ 
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 15, repeat: Infinity }}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 20% 30%, rgba(139,92,246,0.15), transparent)',
        }}
      />
      <motion.div
        animate={{ 
          opacity: [0.2, 0.4, 0.2],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, delay: 5 }}
        className="absolute top-0 right-0 w-full h-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 50% at 80% 70%, rgba(59,130,246,0.12), transparent)',
        }}
      />
      
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
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-4xl w-full">
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
                  <button
                    onClick={() => setAuthError(null)}
                    className="text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              {/* Hero Orion constellation */}
              <motion.div 
                className="flex justify-center mb-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <OrionLogo size="lg" />
              </motion.div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-purple-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
                  Reach for the Stars
                </span>
              </h1>
              <p className="text-xl text-gray-300/80 max-w-2xl mx-auto leading-relaxed">
                Analyze your repository's production readiness. 
                <span className="text-purple-300"> Navigate from launch to orbit </span>
                with intelligent insights across security, performance, and scalability.
              </p>
            </motion.div>

            {/* Show RepoSelector when signed in, otherwise show URL input */}
            {isSignedIn ? (
              <RepoSelector onSelectRepo={handleSelectRepo} />
            ) : (
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                onSubmit={handleSubmit}
                className="max-w-2xl mx-auto"
              >
                <div className="relative group">
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
                  
                  <div className="relative cosmic-card rounded-xl p-2">
                    <div className="flex items-center gap-2">
                      <Github className="w-6 h-6 text-purple-300/70 ml-4" />
                      <input
                        type="text"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/username/repository"
                        className="flex-1 bg-transparent text-white placeholder-gray-500 px-4 py-4 focus:outline-none"
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold mr-2 hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25"
                      >
                        Launch Analysis
                      </motion.button>
                    </div>
                  </div>
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-400 text-sm mt-3 text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </motion.form>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
            >
              <motion.div 
                whileHover={{ y: -4, scale: 1.02 }}
                className="cosmic-card rounded-xl p-6 text-center transition-all"
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" 
                     style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(139,92,246,0.1) 100%)' }}>
                  <Shield className="w-7 h-7 text-purple-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Heat Shield</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Security audit covering authentication, encryption, and vulnerability detection
                </p>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -4, scale: 1.02 }}
                className="cosmic-card rounded-xl p-6 text-center transition-all"
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                     style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.1) 100%)' }}>
                  <Rocket className="w-7 h-7 text-blue-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Propulsion</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Performance analysis for speed, scalability, and concurrent user capacity
                </p>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -4, scale: 1.02 }}
                className="cosmic-card rounded-xl p-6 text-center transition-all"
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                     style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.3) 0%, rgba(6,182,212,0.1) 100%)' }}>
                  <Sparkles className="w-7 h-7 text-cyan-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Navigation</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Code quality, testing coverage, and deployment readiness evaluation
                </p>
              </motion.div>
            </motion.div>
            
            {/* Altitude levels preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="mt-16 text-center"
            >
              <p className="text-gray-500 text-sm mb-4">Your altitude awaits</p>
              <div className="flex justify-center items-center gap-2 flex-wrap">
                {['Runway', 'Takeoff', 'Cruising', 'Stratosphere', 'Karman Line', 'Orbit', 'Voyager'].map((level, i) => (
                  <span 
                    key={level}
                    className="text-xs px-3 py-1 rounded-full border transition-colors"
                    style={{ 
                      borderColor: `rgba(139, 92, 246, ${0.2 + i * 0.1})`,
                      color: `rgba(${180 - i * 10}, ${160 - i * 5}, 255, ${0.5 + i * 0.07})`,
                    }}
                  >
                    {level}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="p-6 text-center">
          <p className="text-gray-600 text-sm">
            The stars are the limit
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}