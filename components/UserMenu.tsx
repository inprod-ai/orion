'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Github, LogOut, User, Crown } from 'lucide-react'
import { signIn, signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

export default function UserMenu() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  if (status === 'loading') {
    return (
      <div className="w-10 h-10 bg-gray-800 animate-pulse rounded-full" />
    )
  }

  if (!session) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => signIn('github')}
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
        <img
          src={session.user.image || ''}
          alt={session.user.name || ''}
          className="w-10 h-10 rounded-full"
        />
        <div className="text-left hidden md:block">
          <p className="text-sm font-semibold text-white">{session.user.name}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            {session.user.tier === 'PRO' && <Crown className="w-3 h-3 text-yellow-400" />}
            {session.user.tier === 'FREE' ? 'Free Plan' : 'Pro Plan'}
            • {session.user.monthlyScans} scans
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
                <p className="text-sm font-semibold text-white">{session.user.name}</p>
                <p className="text-xs text-gray-400">{session.user.email}</p>
              </div>
              
              <div className="p-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-md transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                
                {session.user.tier === 'FREE' && (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full text-left px-3 py-2 text-sm text-purple-400 hover:bg-purple-500/10 rounded-md transition-colors flex items-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade to Pro
                  </button>
                )}
                
                <button
                  onClick={() => signOut()}
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
