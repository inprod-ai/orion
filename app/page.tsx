'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Github, Shield, Rocket, Sparkles, AlertCircle, X, Zap, Database, Lock, Code, GitBranch, Layout, Server, Wifi, Activity, Terminal, ArrowRight, Check, ChevronRight, Globe, BarChart3, Bug, Palette } from 'lucide-react'

import { extractRepoInfo } from '@/lib/utils'
import AnalysisScreen from '@/components/AnalysisScreen'
import UserMenu from '@/components/UserMenu'
import RepoSelector from '@/components/RepoSelector'
import { OrionLogo } from '@/components/space'
import GlowingCard from '@/components/space/GlowingCard'
import Spotlight from '@/components/space/Spotlight'

const StarField3D = dynamic(() => import('@/components/space/StarField3D'), { ssr: false })
const SpaceParticles = dynamic(() => import('@/components/space/SpaceParticles'), { ssr: false })
const ShootingStars = dynamic(() => import('@/components/space/ShootingStar'), { ssr: false })
const AscendingRocket = dynamic(() => import('@/components/space/AscendingRocket'), { ssr: false })

interface UserData {
  id: string
  name: string | null
  email: string | null
  image: string | null
  tier: 'FREE' | 'PRO' | 'ENTERPRISE'
  monthlyScans: number
}

// =============================================================================
// SECTION COMPONENTS
// =============================================================================

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(3,0,20,0.85)', backdropFilter: 'blur(16px)' }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <OrionLogo size="sm" />
          <span className="font-bold text-lg tracking-[0.15em] text-white group-hover:text-purple-200 transition-colors">ORION</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How it works</a>
          <a href="#categories" className="text-sm text-gray-400 hover:text-white transition-colors">Categories</a>
          <a href="#cli" className="text-sm text-gray-400 hover:text-white transition-colors">CLI</a>
          <Link href="/upgrade" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link>
        </nav>
        <UserMenu />
      </div>
    </header>
  )
}

function HeroSection({ isSignedIn, onSelectRepo, onSubmit, repoUrl, setRepoUrl, error, authError, setAuthError }: {
  isSignedIn: boolean
  onSelectRepo: (url: string) => void
  onSubmit: (e: React.FormEvent) => void
  repoUrl: string
  setRepoUrl: (v: string) => void
  error: string
  authError: string | null
  setAuthError: (v: string | null) => void
}) {
  return (
    <Spotlight className="relative py-24 md:py-32 px-6 overflow-hidden" size={600} color="rgba(139,92,246,0.06)">
      <AscendingRocket />
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {authError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3 backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-left">
                <p className="text-red-400 font-medium">Sign in failed</p>
                <p className="text-red-400/80 text-sm mt-1">{authError}</p>
              </div>
              <button onClick={() => setAuthError(null)} className="text-red-400/60 hover:text-red-400"><X className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
          style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: 'rgba(200,180,255,0.9)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Production readiness for any codebase
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-5xl md:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight"
        >
          <span className="text-white">How high can</span>
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">your code fly?</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Orion scans 12 categories of production readiness and tells you your <span className="text-purple-300">altitude</span> -- the max concurrent users your code can handle.
        </motion.p>

        {/* CTA area */}
        {isSignedIn ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <RepoSelector onSelectRepo={onSelectRepo} />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="max-w-2xl mx-auto">
            <form onSubmit={onSubmit}>
              <div className="relative rounded-xl p-1.5" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                <div className="flex items-center rounded-lg" style={{ background: 'rgba(3,0,20,0.9)' }}>
                  <Github className="w-5 h-5 text-gray-500 ml-4" />
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="flex-1 bg-transparent text-white placeholder-gray-600 px-4 py-4 focus:outline-none"
                  />
                  <button type="submit" className="px-6 py-2.5 mr-1.5 rounded-lg font-semibold text-sm transition-all" style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
                    Analyze
                  </button>
                </div>
              </div>
            </form>
            {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}

            <div className="flex items-center justify-center gap-6 mt-6">
              <a href="/api/auth/login" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                <Github className="w-4 h-4" /> Sign in for private repos
              </a>
              <span className="text-gray-700">|</span>
              <a href="#cli" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                <Terminal className="w-4 h-4" /> Use the CLI
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </Spotlight>
  )
}

function HowItWorksSection() {
  const steps = [
    { num: '1', title: 'Paste a repo', desc: 'Enter any GitHub URL or sign in to pick from your repositories. Public and private repos supported.' },
    { num: '2', title: 'Get your altitude', desc: 'Orion scans 12 categories -- security, database, testing, deployment, and more. Each one maps to a rocket component.' },
    { num: '3', title: 'Fix and climb', desc: 'See your bottleneck, get specific fixes with estimated impact. Each fix raises your altitude -- the max users your code can handle.' },
  ]

  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How it works</h2>
          <p className="text-gray-400 max-w-lg mx-auto">Three steps from repo URL to production readiness report.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-5 font-bold text-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}>
                {step.num}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              {i < 2 && <ArrowRight className="hidden md:block absolute top-5 -right-5 w-4 h-4 text-gray-700" />}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const features = [
    { icon: Shield, title: 'Heat Shield', desc: 'Auth, encryption, headers, secrets. If the shield fails, you never reach orbit.', color: '#8b5cf6' },
    { icon: Rocket, title: 'Engines', desc: 'Backend architecture, request handling, rate limiting, horizontal scaling.', color: '#3b82f6' },
    { icon: Sparkles, title: 'Pre-flight', desc: 'Tests, error handling, code quality. The checks that tell you if it is safe to launch.', color: '#06b6d4' },
  ]

  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Every part of the rocket</h2>
          <p className="text-gray-400 max-w-lg mx-auto">Your code is a rocket. Each category is a component. If one fails, you can&apos;t reach full altitude.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <GlowingCard key={f.title} glowColor={`${f.color}4d`} className="p-7">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${f.color}1a` }}>
                  <f.icon className="w-6 h-6" style={{ color: f.color }} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            </GlowingCard>
          ))}
        </div>
      </div>
    </section>
  )
}

function CategoriesSection() {
  const categories = [
    { icon: Database, name: 'Database', part: 'Fuel Tanks', users: '10M' },
    { icon: Server, name: 'Backend', part: 'Engines', users: '5M' },
    { icon: Rocket, name: 'Deployment', part: 'Staging', users: '1M' },
    { icon: Shield, name: 'Security', part: 'Heat Shield', users: '500K' },
    { icon: Activity, name: 'Error Handling', part: 'Life Support', users: '500K' },
    { icon: Lock, name: 'Authentication', part: 'Airlock', users: '200K' },
    { icon: Wifi, name: 'API Integrations', part: 'Comms', users: '100K' },
    { icon: Zap, name: 'State Management', part: 'Guidance', users: '100K' },
    { icon: Bug, name: 'Testing', part: 'Pre-flight', users: '50K' },
    { icon: GitBranch, name: 'Version Control', part: 'Flight Recorder', users: '50K' },
    { icon: Palette, name: 'Design / UX', part: 'Aerodynamics', users: '20K' },
    { icon: Layout, name: 'Frontend', part: 'Capsule', users: '10K' },
  ]

  return (
    <section id="categories" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">12 categories. One altitude.</h2>
          <p className="text-gray-400 max-w-lg mx-auto">Your weakest component is your bottleneck. Each category has a max user capacity it can support before it breaks.</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="p-4 rounded-lg border border-white/5 hover:border-purple-500/30 transition-all group"
              style={{ background: 'rgba(139,92,246,0.03)' }}
            >
              <div className="flex items-center gap-3 mb-2">
                <cat.icon className="w-4 h-4 text-purple-400/70 group-hover:text-purple-300 transition-colors" />
                <span className="text-sm font-medium text-white">{cat.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{cat.part}</span>
                <span className="text-xs text-purple-400/60 font-mono">{cat.users}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CliSection() {
  return (
    <section id="cli" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Run it anywhere</h2>
          <p className="text-gray-400 max-w-lg mx-auto">One command. Works on any project. No sign-up required.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(139,92,246,0.2)', background: 'rgba(10,10,31,0.8)' }}
        >
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="text-xs text-gray-500 ml-2 font-mono">terminal</span>
          </div>

          {/* Terminal body */}
          <div className="p-6 font-mono text-sm leading-7">
            <p><span className="text-green-400">$</span> <span className="text-white">npx orion-archi .</span></p>
            <p className="text-gray-500 mt-4">  Scanned 133 files</p>
            <p className="text-gray-500">  Stack: TypeScript, Next.js, React</p>
            <p className="mt-4"><span className="text-green-400">  SHIP</span></p>
            <p className="text-gray-500">  Overall Score: 87/100</p>
            <p className="mt-4 text-gray-500">  Security         <span className="text-green-400">██████████</span> 100%</p>
            <p className="text-gray-500">  Testing          <span className="text-green-400">██████████</span> 100%</p>
            <p className="text-gray-500">  CI/CD            <span className="text-green-400">██████████</span> 100%</p>
            <p className="text-gray-500">  Error Handling   <span className="text-yellow-400">████████░░</span> 80%</p>
            <p className="text-gray-500">  Docker           <span className="text-yellow-400">████████░░</span> 80%</p>
            <p className="text-gray-500">  Dependencies     <span className="text-green-400">█████████░</span> 90%</p>
          </div>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <div className="flex items-center gap-3 px-5 py-3 rounded-lg text-sm font-mono" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <Terminal className="w-4 h-4 text-purple-400" />
            <span className="text-gray-300">npx orion-archi .</span>
          </div>
          <a
            href="https://www.npmjs.com/package/orion-archi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            View on npm <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </section>
  )
}

function AltitudeSection() {
  const levels = [
    { name: 'Grounded', users: '0', desc: 'Broken build' },
    { name: 'Runway', users: '10', desc: 'Demo-ready' },
    { name: 'Takeoff', users: '100', desc: 'MVP launched' },
    { name: 'Climbing', users: '1K', desc: 'Beta users' },
    { name: 'Cruising', users: '10K', desc: 'Production' },
    { name: 'Stratosphere', users: '100K', desc: 'Scaling' },
    { name: 'Karman Line', users: '1M', desc: 'PMF achieved' },
    { name: 'Orbit', users: '10M', desc: 'Enterprise' },
    { name: 'Voyager', users: '1B+', desc: 'FAANG scale' },
  ]

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">The altitude scale</h2>
          <p className="text-gray-400 max-w-lg mx-auto">From broken builds to billion-user infrastructure. Where does your code land?</p>
        </motion.div>

        <div className="space-y-2">
          {levels.map((level, i) => (
            <motion.div
              key={level.name}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/[0.02] transition-colors"
            >
              <div className="w-20 text-right">
                <span className="text-sm font-mono text-purple-400/80">{level.users}</span>
              </div>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(139,92,246,0.1)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${((i + 1) / levels.length) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.05 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, #7c3aed, #3b82f6)`, opacity: 0.3 + (i / levels.length) * 0.7 }}
                />
              </div>
              <div className="w-32">
                <span className="text-sm font-medium text-white">{level.name}</span>
              </div>
              <div className="w-28 hidden sm:block">
                <span className="text-xs text-gray-500">{level.desc}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Start climbing</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">Free for public repos. 3 scans per month. No credit card required.</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/api/auth/login" className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all" style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}>
              <Github className="w-4 h-4" /> Sign in with GitHub
            </a>
            <a href="#cli" className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border border-white/10 text-gray-300 hover:border-purple-500/30 hover:text-white transition-all">
              <Terminal className="w-4 h-4" /> Use the CLI
            </a>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> Free tier</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> No install needed</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> Open source CLI</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <OrionLogo size="sm" />
            <span className="font-bold tracking-[0.15em] text-gray-400">ORION</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <a href="https://github.com/orion-archi/orion" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://www.npmjs.com/package/orion-archi" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">npm</a>
            <Link href="/upgrade" className="hover:text-white transition-colors">Pricing</Link>
          </nav>
          <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} Orion</p>
        </div>
      </div>
    </footer>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

function HomeContent() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<UserData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [repoUrl, setRepoUrl] = useState('')
  const [error, setError] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => { fetchUser() }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user)
    } catch (err) {
      console.error('Failed to fetch user:', err)
    } finally {
      setUserLoading(false)
    }
  }

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const authSuccess = searchParams.get('auth')
    if (errorParam) { setAuthError(decodeURIComponent(errorParam)); window.history.replaceState({}, '', '/') }
    if (authSuccess === 'success') { fetchUser(); window.history.replaceState({}, '', '/') }
  }, [searchParams])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!extractRepoInfo(repoUrl)) { setError('Please enter a valid GitHub repository URL'); return }
    setAnalyzing(true)
  }

  if (analyzing && repoUrl) return <AnalysisScreen repoUrl={repoUrl} />

  const isSignedIn = !userLoading && user !== null

  return (
    <div className="min-h-screen text-white" style={{ background: '#030014' }}>
      <StarField3D />
      <SpaceParticles />
      <ShootingStars />

      <div className="relative z-10">
        <Navbar />
        <HeroSection
          isSignedIn={isSignedIn}
          onSelectRepo={(url) => { setRepoUrl(url); setAnalyzing(true) }}
          onSubmit={handleSubmit}
          repoUrl={repoUrl}
          setRepoUrl={setRepoUrl}
          error={error}
          authError={authError}
          setAuthError={setAuthError}
        />
        <HowItWorksSection />
        <FeaturesSection />
        <CategoriesSection />
        <CliSection />
        <AltitudeSection />
        <CtaSection />
        <Footer />
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#030014' }}>
        <div className="text-purple-400/60 text-sm tracking-widest animate-pulse">LOADING</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
