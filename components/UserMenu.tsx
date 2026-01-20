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
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSignIn}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow"
      >
        <Github className="w-5 h-5" />
        Sign in with GitHub
      </motion.button>
    )
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        {user.image && (
          <img
            src={user.image}
            alt={user.name || 'User'}
            className="w-10 h-10 rounded-full"
          />
        )}
        <div className="text-left hidden md:block">
          <p className="text-sm font-semibold text-white">{user.name}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            {user.tier === 'PRO' && <Crown className="w-3 h-3 text-yellow-400" />}
            {user.tier === 'FREE' ? 'Free Plan' : 'Pro Plan'}
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
              className="absolute right-0 mt-2 w-56 bg-gray-900 rounded-lg shadow-xl border border-gray-800 overflow-hidden z-50"
            >
              <div className="p-4 border-b border-gray-800">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
              
              <div className="p-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-md transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                
                {user.tier === 'FREE' && (
                  <Link
                    href="/upgrade"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-left px-3 py-2 text-sm text-purple-400 hover:bg-purple-500/10 rounded-md transition-colors flex items-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade to Pro
                  </Link>
                )}
                
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-md transition-colors flex items-center gap-2"
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
