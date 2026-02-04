'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Loader2, CheckCircle, XCircle, AlertCircle, ChevronRight, ArrowLeft, Plus, Clock, Shield, Zap, Code, Lock, Crown, Github, Download, Hammer, Rocket, Sparkles } from 'lucide-react'
import { cn, extractRepoInfo, getScoreColor, getScoreGrade } from '@/lib/utils'
import type { AnalysisResult, AnalysisProgress, CategoryScore, Finding } from '@/types/analysis'

interface Props {
  repoUrl: string
}

interface UserData {
  id: string
  name: string | null
  email: string | null
  image: string | null
  tier: 'FREE' | 'PRO' | 'ENTERPRISE'
  monthlyScans: number
}

interface VerificationResult {
  level: string
  compile?: {
    success: boolean
    errorCount: number
    warningCount: number
    errors: Array<{ file: string; line?: number; message: string; severity: string }>
    duration: number
  }
}

export default function AnalysisScreen({ repoUrl }: Props) {
  const [user, setUser] = useState<UserData | null>(null)
  const [progress, setProgress] = useState<AnalysisProgress>({
    stage: 'fetching',
    message: 'Fetching repository data...',
    percentage: 0,
  })
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [scanId, setScanId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [verification, setVerification] = useState<VerificationResult | null>(null)

  useEffect(() => {
    // Fetch user on mount
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(() => {})
  }, [])

  useEffect(() => {
    analyzeRepository()
  }, [repoUrl])

  const analyzeRepository = async () => {
    try {
      const repoInfo = extractRepoInfo(repoUrl)
      if (!repoInfo) {
        throw new Error('Invalid repository URL')
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, ...repoInfo }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Analysis failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response body')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (data.progress) {
              setProgress(data.progress)
            } else if (data.result) {
              setResult(data.result)
              setProgress({ stage: 'complete', message: 'Analysis complete', percentage: 100 })
              // Save scanId if returned
              if (data.scanId) {
                setScanId(data.scanId)
              }
              // Save verification result if returned
              if (data.verification) {
                setVerification(data.verification)
              }
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    }
  }

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName)
    } else {
      newExpanded.add(categoryName)
    }
    setExpandedCategories(newExpanded)
  }

  if (error) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center relative" style={{ background: 'var(--orion-void)' }}>
        <div className="stars-layer" />
        <div className="nebula-bg absolute inset-0" />
        <div className="relative z-10 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Mission Aborted</h2>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25"
          >
            Retry Launch
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white relative" style={{ background: 'var(--orion-void)' }}>
      <div className="stars-layer" />
      <div className="nebula-bg absolute inset-0" />
      
      <div className="relative z-10">
        <header className="p-6 flex justify-between items-center">
          <motion.button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 text-gray-400 hover:text-purple-300 transition-colors"
            whileHover={{ x: -5 }}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Base
          </motion.button>
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
            {/* Orion constellation logo - 3 stars of Orion's belt */}
            <div className="relative w-8 h-8">
              <motion.div
                animate={{ 
                  boxShadow: [
                    '0 0 8px 2px rgba(139,92,246,0.6)',
                    '0 0 12px 3px rgba(139,92,246,0.8)',
                    '0 0 8px 2px rgba(139,92,246,0.6)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute w-1.5 h-1.5 bg-white rounded-full top-1 left-0"
              />
              <motion.div
                animate={{ 
                  boxShadow: [
                    '0 0 10px 3px rgba(165,216,255,0.8)',
                    '0 0 16px 5px rgba(165,216,255,1)',
                    '0 0 10px 3px rgba(165,216,255,0.8)',
                  ]
                }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                className="absolute w-2 h-2 rounded-full top-3 left-3"
                style={{ background: 'linear-gradient(135deg, #fff 0%, #a5d8ff 100%)' }}
              />
              <motion.div
                animate={{ 
                  boxShadow: [
                    '0 0 8px 2px rgba(139,92,246,0.6)',
                    '0 0 12px 3px rgba(139,92,246,0.8)',
                    '0 0 8px 2px rgba(139,92,246,0.6)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                className="absolute w-1.5 h-1.5 bg-white rounded-full bottom-1 right-0"
              />
            </div>
            <span className="font-bold text-xl tracking-[0.2em] text-white group-hover:text-purple-200 transition-colors">ORION</span>
          </Link>
        </header>

        <main className="max-w-6xl mx-auto px-6 pb-12">
          {!result ? (
            <div className="mt-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
                  Launching Analysis
                </h2>
                <p className="text-gray-400">{repoUrl}</p>
              </motion.div>

              <div className="max-w-2xl mx-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="cosmic-card rounded-xl p-8"
                >
                  {/* Animated rocket */}
                  <div className="flex items-center justify-center mb-8">
                    <motion.div
                      animate={{ 
                        y: [-5, 5, -5],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="relative"
                    >
                      <Rocket className="w-16 h-16 text-purple-400 rotate-[-45deg]" />
                      {/* Exhaust trail */}
                      <motion.div
                        animate={{ 
                          opacity: [0.3, 0.8, 0.3],
                          scale: [0.8, 1.2, 0.8],
                        }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-12 rounded-full"
                        style={{ 
                          background: 'linear-gradient(to bottom, rgba(139,92,246,0.8), rgba(59,130,246,0.4), transparent)',
                          filter: 'blur(4px)',
                          transform: 'rotate(45deg) translateX(-50%)',
                        }}
                      />
                    </motion.div>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-300">{progress.message}</span>
                      <span className="text-sm text-purple-300">{progress.percentage}%</span>
                    </div>
                    <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'var(--orion-deep)' }}>
                      <motion.div
                        className="h-full"
                        style={{ background: 'linear-gradient(to right, var(--orion-purple), var(--orion-blue), var(--orion-cyan))' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.percentage}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {progress.currentCategory && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-sm text-gray-400"
                    >
                      <Sparkles className="w-4 h-4 inline mr-2 text-purple-400" />
                      Scanning: {progress.currentCategory}
                    </motion.p>
                  )}
                </motion.div>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Score Header */}
              <div className="text-center mb-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="inline-block"
                >
                  <div className="relative">
                    {/* Outer glow ring */}
                    <motion.div
                      animate={{ 
                        boxShadow: [
                          '0 0 40px 10px rgba(139,92,246,0.3), inset 0 0 30px rgba(139,92,246,0.1)',
                          '0 0 60px 15px rgba(139,92,246,0.4), inset 0 0 40px rgba(139,92,246,0.15)',
                          '0 0 40px 10px rgba(139,92,246,0.3), inset 0 0 30px rgba(139,92,246,0.1)',
                        ]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-48 h-48 rounded-full flex items-center justify-center"
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(59,130,246,0.2) 100%)',
                        border: '1px solid rgba(139,92,246,0.3)',
                      }}
                    >
                      <div className="text-center">
                        <div className={cn("text-6xl font-bold", getScoreColor(result.overallScore))}>
                          {Math.round(result.overallScore)}
                        </div>
                        <div className="text-2xl font-semibold mt-2 text-purple-200">{getScoreGrade(result.overallScore)}</div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
                <h2 className="text-3xl font-bold mt-6 mb-2 bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent">{result.repo}</h2>
                <p className="text-gray-400">Altitude Assessment</p>
                
                {/* Confidence Badge */}
                {result.confidence && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-900/50 rounded-full">
                    <span className="text-sm text-gray-400">Confidence:</span>
                    <span className={cn(
                      "text-sm font-semibold",
                      result.confidence.level === 'high' ? 'text-green-400' : 
                      result.confidence.level === 'medium' ? 'text-yellow-400' : 'text-orange-400'
                    )}>
                      {result.confidence.level.charAt(0).toUpperCase() + result.confidence.level.slice(1)}
                    </span>
                  </div>
                )}
                
                {/* Verification Badge */}
                {verification?.compile && (
                  <div className={cn(
                    "mt-4 ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-full",
                    verification.compile.success 
                      ? "bg-green-500/10 border border-green-500/30" 
                      : "bg-red-500/10 border border-red-500/30"
                  )}>
                    <Hammer className={cn(
                      "w-4 h-4",
                      verification.compile.success ? "text-green-400" : "text-red-400"
                    )} />
                    <span className={cn(
                      "text-sm font-semibold",
                      verification.compile.success ? "text-green-400" : "text-red-400"
                    )}>
                      {verification.compile.success ? "COMPILED ✓" : `BUILD FAILED (${verification.compile.errorCount} errors)`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {(verification.compile.duration / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}
                
                {/* Export button for Pro users */}
                {user?.tier === 'PRO' && scanId && (
                  <button
                    onClick={async () => {
                      setExporting(true)
                      try {
                        const response = await fetch('/api/export/pdf', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ scanId }),
                        })
                        
                        if (response.ok) {
                          const blob = await response.blob()
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${result.repo}-analysis.pdf`
                          document.body.appendChild(a)
                          a.click()
                          window.URL.revokeObjectURL(url)
                          document.body.removeChild(a)
                        }
                      } catch (err) {
                        console.error('Export failed:', err)
                      } finally {
                        setExporting(false)
                      }
                    }}
                    disabled={exporting}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {exporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Export PDF
                  </button>
                )}
              </div>

              {/* Top Findings */}
              {result.findings && result.findings.length > 0 && (
                <div className="mb-12">
                  <h3 className="text-2xl font-bold mb-6">Top Findings</h3>
                  <div className="space-y-4">
                    {result.findings.map((finding, i) => (
                      <FindingCard key={finding.id} finding={finding} index={i} />
                    ))}
                    
                    {/* Show blurred findings for free tier */}
                    {result.isFreeTier && result.totalFindings && result.totalFindings > 2 && (
                      <>
                        {[...Array(Math.min(3, result.totalFindings - 2))].map((_, i) => (
                          <BlurredFindingCard key={`blurred-${i}`} index={i + 2} />
                        ))}
                        
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl p-8 text-center relative overflow-hidden"
                          style={{ 
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.1) 100%)',
                            border: '1px solid rgba(139,92,246,0.3)',
                          }}
                        >
                          {/* Star decoration */}
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute top-4 right-4 opacity-30"
                          >
                            <Sparkles className="w-6 h-6 text-purple-300" />
                          </motion.div>
                          
                          <Crown className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                          <h4 className="text-xl font-bold mb-2 text-white">
                            {result.totalFindings - 2} More Mission-Critical Findings
                          </h4>
                          <p className="text-gray-400 mb-6">
                            Unlock full telemetry, detailed flight paths, and mission reports with Pro
                          </p>
                          {user ? (
                            <button
                              onClick={() => window.location.href = '/upgrade'}
                              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25"
                            >
                              Upgrade to Pro
                            </button>
                          ) : (
                            <button
                              onClick={() => window.location.href = '/api/auth/login'}
                              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2 mx-auto"
                            >
                              <Github className="w-5 h-5" />
                              Sign in to Access Mission Control
                            </button>
                          )}
                        </motion.div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ y: -4 }}
                  className="cosmic-card rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold mb-3 text-cyan-300">Mission Successes</h3>
                  <ul className="space-y-2">
                    {result.summary.strengths.map((strength, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ y: -4 }}
                  className="cosmic-card rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold mb-3 text-orange-300">Course Corrections</h3>
                  <ul className="space-y-2">
                    {result.summary.weaknesses.map((weakness, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ y: -4 }}
                  className="cosmic-card rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold mb-3 text-purple-300">Mission Objectives</h3>
                  <ul className="space-y-2">
                    {result.summary.topPriorities.map((priority, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-purple-400 font-semibold">{i + 1}.</span>
                        <span>{priority}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>

              {/* Category Scores */}
              <div className="space-y-4">
                <h3 className="text-2xl font-bold mb-6">Detailed Analysis</h3>
                {result.categories.map((category, i) => (
                  <motion.div
                    key={category.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <CategoryCard
                      category={category}
                      isExpanded={expandedCategories.has(category.name)}
                      onToggle={() => toggleCategory(category.name)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}

function CategoryCard({ 
  category, 
  isExpanded, 
  onToggle 
}: { 
  category: CategoryScore
  isExpanded: boolean
  onToggle: () => void
}) {
  const scorePercentage = category.applicable ? (category.score / category.maxScore) * 100 : 0
  
  return (
    <div className="cosmic-card rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-6 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-lg font-semibold mb-2 text-white">{category.displayName}</h4>
            {category.applicable ? (
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-md">
                  <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'var(--orion-deep)' }}>
                    <motion.div
                      className="h-full"
                      style={{ 
                        background: scorePercentage >= 80 
                          ? 'linear-gradient(to right, #06b6d4, #22d3ee)' 
                          : scorePercentage >= 60 
                            ? 'linear-gradient(to right, #8b5cf6, #a78bfa)' 
                            : 'linear-gradient(to right, #f97316, #fb923c)'
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${scorePercentage}%` }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                  </div>
                </div>
                <span className={cn("font-semibold", getScoreColor(scorePercentage))}>
                  {category.score}/{category.maxScore}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Not applicable for this mission</span>
            )}
          </div>
          <ChevronRight className={cn("w-5 h-5 text-purple-400 transition-transform", isExpanded && "rotate-90")} />
        </div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-4">
              <p className="text-sm text-gray-400">{category.description}</p>
              
              {category.subcategories && category.subcategories.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-semibold text-purple-300">System Breakdown:</h5>
                  {category.subcategories.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{sub.name}</span>
                      <span className={cn("font-medium", sub.score === sub.maxScore ? "text-cyan-400" : "text-gray-300")}>
                        {sub.score}/{sub.maxScore}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {category.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-semibold text-purple-300">Flight Path Recommendations:</h5>
                  <ul className="space-y-1">
                    {category.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                        <Sparkles className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Shield className="w-5 h-5" />
      case 'performance':
        return <Rocket className="w-5 h-5" />
      case 'best-practices':
        return <Code className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'easy':
        return 'text-cyan-400 bg-cyan-400/10 border border-cyan-400/20'
      case 'medium':
        return 'text-purple-400 bg-purple-400/10 border border-purple-400/20'
      case 'hard':
        return 'text-pink-400 bg-pink-400/10 border border-pink-400/20'
      default:
        return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400'
      case 'high':
        return 'text-orange-400'
      case 'medium':
        return 'text-purple-400'
      case 'low':
        return 'text-blue-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.01 }}
      className="cosmic-card rounded-xl p-6 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg", 
            finding.category === 'security' ? 'bg-pink-500/10 text-pink-400' :
            finding.category === 'performance' ? 'bg-blue-500/10 text-blue-400' :
            'bg-purple-500/10 text-purple-400'
          )}>
            {getCategoryIcon(finding.category)}
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold mb-1 text-white">{finding.title}</h4>
            <p className="text-sm text-gray-400 mb-3">{finding.description}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className={cn("font-medium", getSeverityColor(finding.severity))}>
                {finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)} Priority
              </span>
              <span className="text-gray-600">•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400">{finding.estimatedTime}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/20">
            <Plus className="w-4 h-4" />
            <span className="font-bold">{finding.points} pts</span>
          </div>
          <span className={cn("text-xs px-2 py-1 rounded-full font-medium", getEffortColor(finding.effort))}>
            {finding.effort === 'easy' ? 'Quick Fix' : finding.effort === 'medium' ? 'Moderate' : 'Complex'}
          </span>
        </div>
      </div>
      <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--orion-deep)' }}>
        <p className="text-sm text-gray-300">
          <span className="font-semibold text-purple-300">Flight correction:</span> {finding.fix}
        </p>
      </div>
    </motion.div>
  )
}

function BlurredFindingCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="cosmic-card rounded-xl p-6 relative overflow-hidden"
    >
      {/* Blur overlay with nebula effect */}
      <div className="absolute inset-0 backdrop-blur-md z-10 flex items-center justify-center"
           style={{ background: 'linear-gradient(135deg, rgba(11,8,20,0.9) 0%, rgba(30,20,50,0.8) 100%)' }}>
        <div className="text-center">
          <Lock className="w-8 h-8 text-purple-400/50 mx-auto mb-2" />
          <span className="text-xs text-purple-300/50">Classified Data</span>
        </div>
      </div>
      
      {/* Placeholder content */}
      <div className="filter blur-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg w-10 h-10" style={{ background: 'var(--orion-deep)' }} />
            <div className="flex-1">
              <div className="h-6 rounded w-3/4 mb-2" style={{ background: 'var(--orion-deep)' }} />
              <div className="h-4 rounded w-full mb-3" style={{ background: 'var(--orion-deep)' }} />
              <div className="flex items-center gap-4">
                <div className="h-4 rounded w-20" style={{ background: 'var(--orion-deep)' }} />
                <div className="h-4 rounded w-20" style={{ background: 'var(--orion-deep)' }} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-8 rounded-full w-24" style={{ background: 'var(--orion-deep)' }} />
            <div className="h-6 rounded-full w-16" style={{ background: 'var(--orion-deep)' }} />
          </div>
        </div>
        <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--orion-void)' }}>
          <div className="h-4 rounded w-full" style={{ background: 'var(--orion-deep)' }} />
        </div>
      </div>
    </motion.div>
  )
}
