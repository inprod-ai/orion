'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Github, LogOut, User, Crown } from 'lucide-react'
import Link from 'next/link'

interface UserData {
  id: string
  name: string | null
  email: string | null
  image: string | null
  tier: 'FREE' | 'PRO' | 'ENTERPRISE'
  monthlyScans: number
}

export default function UserMenu() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

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
      setLoading(false)
    }
  }

  const handleSignIn = () => {
    window.location.href = '/api/auth/login'
  }

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setIsOpen(false)
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="w-10 h-10 bg-gray-800 animate-pulse rounded-full" />
    )
  }

  if (!user) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSignIn}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25"
      >
        <Github className="w-5 h-5" />
        Sign in with GitHub
      </motion.button>
    )
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-purple-500/20"
      >
        {user.image && (
          <img
            src={user.image}
            alt={user.name || 'User'}
            className="w-10 h-10 rounded-full ring-2 ring-purple-500/30"
          />
        )}
        <div className="text-left hidden md:block">
          <p className="text-sm font-semibold text-white">{user.name}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            {user.tier === 'PRO' && <Crown className="w-3 h-3 text-purple-400" />}
            {user.tier === 'FREE' ? 'Free' : 'Pro'}
            • {user.monthlyScans} scans
          </p>
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-56 rounded-lg shadow-xl overflow-hidden z-50"
              style={{ 
                background: 'linear-gradient(135deg, rgba(30,20,50,0.95) 0%, rgba(11,8,20,0.98) 100%)',
                border: '1px solid rgba(139,92,246,0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="p-4 border-b border-purple-500/10">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
              
              <div className="p-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-purple-500/10 rounded-md transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                
                {user.tier === 'FREE' && (
                  <Link
                    href="/upgrade"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-left px-3 py-2 text-sm text-purple-300 hover:bg-purple-500/10 rounded-md transition-colors flex items-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade to Pro
                  </Link>
                )}
                
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-purple-500/10 rounded-md transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
