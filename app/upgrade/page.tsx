'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Crown, Rocket, Shield, Download, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import GlowingCard from '@/components/space/GlowingCard'

const StarField3D = dynamic(() => import('@/components/space/StarField3D'), { ssr: false })
const ShootingStars = dynamic(() => import('@/components/space/ShootingStar'), { ssr: false })

interface UserData {
  id: string
  name: string | null
  email: string | null
  image: string | null
  tier: 'FREE' | 'PRO' | 'ENTERPRISE'
  monthlyScans: number
}

export default function UpgradePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(() => {})
      .finally(() => setUserLoading(false))
  }, [])

  const handleUpgrade = async () => {
    if (!user) {
      window.location.href = '/api/auth/login'
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Upgrade error:', error)
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: Rocket, title: 'Unlimited Missions', description: 'No monthly limits on analysis launches' },
    { icon: Shield, title: 'Full Telemetry', description: 'Every finding revealed, nothing hidden' },
    { icon: Download, title: 'Mission Reports', description: 'Export professional PDFs for stakeholders' },
    { icon: Crown, title: 'Priority Comms', description: 'Direct line to mission control' },
  ]

  const isPro = user?.tier === 'PRO'
  const buttonText = loading ? 'Initiating...' : 
    isPro ? 'Already Commander' : 
    user ? 'Become Commander' : 'Sign in to Upgrade'

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: '#030014' }}>
      <StarField3D />
      <ShootingStars />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="p-6">
          <motion.button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-purple-300 transition-colors"
            whileHover={{ x: -5 }}
          >
            ← Return to Base
          </motion.button>
        </header>

        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-4xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <motion.div 
                animate={{ 
                  boxShadow: [
                    '0 0 20px 5px rgba(139,92,246,0.3)',
                    '0 0 30px 8px rgba(139,92,246,0.5)',
                    '0 0 20px 5px rgba(139,92,246,0.3)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(59,130,246,0.2) 100%)',
                  border: '1px solid rgba(139,92,246,0.3)',
                }}
              >
                <Crown className="w-4 h-4 text-purple-300" />
                <span className="text-purple-200">COMMANDER RANK</span>
              </motion.div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
                Unlock Full Mission Control
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Unlimited launches, complete telemetry, and professional mission reports
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="cosmic-card rounded-xl p-8"
              >
                <h3 className="text-2xl font-bold mb-4 text-gray-200">Explorer</h3>
                <div className="text-4xl font-bold mb-6 text-white">$0<span className="text-lg text-gray-400">/month</span></div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-cyan-400" />
                    <span>3 missions per month</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-cyan-400" />
                    <span>Top 2 findings visible</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 text-gray-600 text-center">×</span>
                    <span className="text-gray-500">No mission reports</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 text-gray-600 text-center">×</span>
                    <span className="text-gray-500">Standard comms only</span>
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl p-8 relative"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(59,130,246,0.15) 100%)',
                  border: '1px solid rgba(139,92,246,0.4)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute top-4 right-4"
                >
                  <Sparkles className="w-5 h-5 text-purple-300" />
                </motion.div>
                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg shadow-purple-500/30">
                  RECOMMENDED
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Commander</h3>
                <div className="text-4xl font-bold mb-6 text-white">$29<span className="text-lg text-gray-400">/month</span></div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-cyan-400" />
                    <span>Unlimited missions</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-cyan-400" />
                    <span>Full telemetry access</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-cyan-400" />
                    <span>Mission report exports</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-cyan-400" />
                    <span>Priority comms channel</span>
                  </li>
                </ul>
                <button
                  onClick={handleUpgrade}
                  disabled={loading || isPro || userLoading}
                  className="w-full mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {buttonText}
                </button>
              </motion.div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => (
                <GlowingCard key={i} className="p-6 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                         style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(59,130,246,0.2) 100%)' }}>
                      <feature.icon className="w-6 h-6 text-purple-300" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                    <p className="text-sm text-gray-400">{feature.description}</p>
                  </motion.div>
                </GlowingCard>
              ))}
            </div>
            
            {/* Footer tagline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center mt-16"
            >
              <p className="text-gray-600 text-sm">The stars are the limit</p>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}
