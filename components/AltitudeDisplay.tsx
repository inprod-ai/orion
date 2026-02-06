'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import type { AltitudeResult } from '@/lib/orion/types'
import { formatUserCount, getAltitudeProgress, getAltitudeGradient, getStarsVisibility } from '@/lib/orion/altitude'

interface AltitudeDisplayProps {
  altitude: AltitudeResult
  className?: string
  showDetails?: boolean
}

/**
 * Displays the altitude (max concurrent users) with visual rocket + atmosphere transition
 */
export function AltitudeDisplay({ altitude, className = '', showDetails = true }: AltitudeDisplayProps) {
  const progress = useMemo(() => getAltitudeProgress(altitude.maxUsers), [altitude.maxUsers])
  const gradient = useMemo(() => getAltitudeGradient(progress), [progress])
  const starsOpacity = useMemo(() => getStarsVisibility(progress), [progress])
  
  const formattedUsers = formatUserCount(altitude.maxUsers)
  const formattedPotential = formatUserCount(altitude.potentialUsers)
  
  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* Background gradient - animates with altitude */}
      <motion.div
        className="absolute inset-0 transition-all duration-1000"
        animate={{ background: gradient }}
      />
      
      {/* Stars layer - fades in at high altitude */}
      <motion.div
        className="absolute inset-0 stars-layer"
        animate={{ opacity: starsOpacity }}
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 20% 40%, rgba(255,255,255,0.6), transparent),
            radial-gradient(2px 2px at 30% 15%, rgba(255,255,255,0.9), transparent),
            radial-gradient(1px 1px at 40% 60%, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 50% 30%, rgba(255,255,255,0.7), transparent),
            radial-gradient(2px 2px at 60% 80%, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 70% 10%, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 80% 50%, rgba(255,255,255,0.7), transparent),
            radial-gradient(2px 2px at 90% 70%, rgba(255,255,255,0.9), transparent),
            radial-gradient(1px 1px at 15% 85%, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 35% 75%, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 55% 5%, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 75% 35%, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 95% 25%, rgba(255,255,255,0.5), transparent)
          `,
          backgroundSize: '100% 100%',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 p-6 text-white">
        {/* Main altitude display */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm uppercase tracking-wider opacity-70 mb-1">
              Maximum Altitude
            </div>
            <motion.div 
              className="text-4xl font-bold"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              key={formattedUsers}
            >
              {formattedUsers} users
            </motion.div>
            <div className="text-sm opacity-70 mt-1">
              {altitude.zone.displayName}
            </div>
          </div>
          
          {/* Rocket indicator */}
          <motion.div
            className="text-5xl"
            animate={{ 
              y: [0, -5, 0],
              rotate: progress > 80 ? 0 : [-2, 2, -2],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
          >
            🚀
          </motion.div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 via-yellow-400 to-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1 opacity-60">
            <span>Runway</span>
            <span>Orbit</span>
            <span>Deep Space</span>
          </div>
        </div>
        
        {/* Bottleneck and upgrade info */}
        {showDetails && (
          <div className="mt-6 space-y-3">
            {/* Current bottleneck */}
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs uppercase tracking-wider opacity-60 mb-1">
                Limiting Factor
              </div>
              <div className="font-medium">
                {altitude.bottleneck.category}
              </div>
              <div className="text-sm opacity-70">
                {altitude.bottleneck.reason}
              </div>
            </div>
            
            {/* Potential after fixes */}
            {altitude.potentialUsers > altitude.maxUsers && (
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs uppercase tracking-wider opacity-60 mb-1">
                  Potential with fixes
                </div>
                <div className="font-medium text-green-300">
                  {formattedPotential} users
                </div>
                <div className="text-sm opacity-70">
                  Fix top {Math.min(3, altitude.topUpgrades.length)} bottlenecks
                </div>
              </div>
            )}
            
            {/* Quick wins */}
            {altitude.topUpgrades.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider opacity-60 mb-2">
                  Quick Wins
                </div>
                <div className="space-y-2">
                  {altitude.topUpgrades.slice(0, 3).map((upgrade, i) => (
                    <motion.div
                      key={upgrade.category}
                      className="flex items-center justify-between bg-white/5 rounded p-2 text-sm"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <span className="capitalize">{upgrade.category}</span>
                      <span className="flex items-center gap-2">
                        <span className="opacity-50">
                          {formatUserCount(upgrade.currentUsers)}
                        </span>
                        <span>→</span>
                        <span className="text-green-300">
                          {formatUserCount(upgrade.potentialUsers)}
                        </span>
                        <span className={`text-xs px-1 rounded ${
                          upgrade.effort === 'easy' ? 'bg-green-500/30' :
                          upgrade.effort === 'medium' ? 'bg-yellow-500/30' :
                          'bg-red-500/30'
                        }`}>
                          {upgrade.effort}
                        </span>
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact altitude badge for use in headers/cards
 */
export function AltitudeBadge({ altitude }: { altitude: AltitudeResult }) {
  const progress = getAltitudeProgress(altitude.maxUsers)
  const formattedUsers = formatUserCount(altitude.maxUsers)
  
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm">
      <motion.span
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🚀
      </motion.span>
      <span className="font-medium">{formattedUsers}</span>
      <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Full-page altitude background that transitions with progress
 */
export function AltitudeBackground({ 
  progress, 
  children 
}: { 
  progress: number
  children: React.ReactNode 
}) {
  const gradient = getAltitudeGradient(progress)
  const starsOpacity = getStarsVisibility(progress)
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <motion.div
        className="fixed inset-0 -z-10"
        animate={{ background: gradient }}
        transition={{ duration: 2 }}
      />
      
      {/* Stars */}
      <motion.div
        className="fixed inset-0 -z-10"
        animate={{ opacity: starsOpacity }}
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 20% 40%, rgba(255,255,255,0.6), transparent),
            radial-gradient(2px 2px at 30% 15%, rgba(255,255,255,0.9), transparent),
            radial-gradient(1px 1px at 40% 60%, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 50% 30%, rgba(255,255,255,0.7), transparent),
            radial-gradient(2px 2px at 60% 80%, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 70% 10%, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 80% 50%, rgba(255,255,255,0.7), transparent),
            radial-gradient(2px 2px at 90% 70%, rgba(255,255,255,0.9), transparent),
            radial-gradient(1px 1px at 15% 85%, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 35% 75%, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 55% 5%, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 75% 35%, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 95% 25%, rgba(255,255,255,0.5), transparent)
          `,
          backgroundSize: '100% 100%',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

