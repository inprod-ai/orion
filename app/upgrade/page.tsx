'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Crown, Zap, Shield, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
    { icon: Zap, title: 'Unlimited Scans', description: 'No monthly limits on repository analysis' },
    { icon: Shield, title: 'All Findings Revealed', description: 'See every security, performance, and quality issue' },
    { icon: Download, title: 'PDF Export', description: 'Download professional reports for stakeholders' },
    { icon: Crown, title: 'Priority Support', description: 'Get help when you need it' },
  ]

  const isPro = user?.tier === 'PRO'
  const buttonText = loading ? 'Loading...' : 
    isPro ? 'Current Plan' : 
    user ? 'Upgrade Now' : 'Sign in to Upgrade'

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="p-6">
          <motion.button
            onClick={() => router.push('/')}
            className="flex items-center gap-2"
            whileHover={{ x: -5 }}
          >
            ← Back to Home
          </motion.button>
        </header>

        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-4xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-full text-sm font-semibold mb-6">
                <Crown className="w-4 h-4" />
                UPGRADE TO PRO
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Unlock Full Analysis Power
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Get unlimited scans, see all findings, and export professional reports
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-8 border border-gray-800"
              >
                <h3 className="text-2xl font-bold mb-4">Free</h3>
                <div className="text-4xl font-bold mb-6">$0<span className="text-lg text-gray-400">/month</span></div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>3 scans per month</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Top 2 findings only</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 text-gray-600 text-center">×</span>
                    <span className="text-gray-500">No PDF export</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 text-gray-600 text-center">×</span>
                    <span className="text-gray-500">Limited support</span>
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-xl rounded-xl p-8 border border-purple-500/30 relative"
              >
                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold px-4 py-1 rounded-full">
                  RECOMMENDED
                </div>
                <h3 className="text-2xl font-bold mb-4">Pro</h3>
                <div className="text-4xl font-bold mb-6">$29<span className="text-lg text-gray-400">/month</span></div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Unlimited scans</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>All findings revealed</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>PDF export</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <button
                  onClick={handleUpgrade}
                  disabled={loading || isPro || userLoading}
                  className="w-full mt-8 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {buttonText}
                </button>
              </motion.div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <feature.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
