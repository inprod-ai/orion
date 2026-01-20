'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Loader2, CheckCircle, XCircle, AlertCircle, ChevronRight, ArrowLeft, Plus, Clock, Shield, Zap, Code, Lock, Crown, Github, Download } from 'lucide-react'
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Analysis Failed</h2>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      
      <div className="relative z-10">
        <header className="p-6 flex justify-between items-center">
          <motion.button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            whileHover={{ x: -5 }}
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </motion.button>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">inprod.ai</span>
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
                <h2 className="text-3xl font-bold mb-4">Analyzing Repository</h2>
                <p className="text-gray-400">{repoUrl}</p>
              </motion.div>

              <div className="max-w-2xl mx-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-8"
                >
                  <div className="flex items-center justify-center mb-6">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">{progress.message}</span>
                      <span className="text-sm text-gray-400">{progress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
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
                      className="text-center text-sm text-gray-500"
                    >
                      Analyzing: {progress.currentCategory}
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
                    <div className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                      <div className="text-center">
                        <div className={cn("text-6xl font-bold", getScoreColor(result.overallScore))}>
                          {Math.round(result.overallScore)}
                        </div>
                        <div className="text-2xl font-semibold mt-2">{getScoreGrade(result.overallScore)}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                <h2 className="text-3xl font-bold mt-6 mb-2">{result.repo}</h2>
                <p className="text-gray-400">Release Readiness Score</p>
                
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
                          className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-8 text-center border border-purple-500/20"
                        >
                          <Crown className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                          <h4 className="text-xl font-bold mb-2">
                            {result.totalFindings - 2} More Critical Findings Hidden
                          </h4>
                          <p className="text-gray-400 mb-6">
                            Unlock all findings, detailed recommendations, and PDF exports with Pro
                          </p>
                          {user ? (
                            <button
                              onClick={() => window.location.href = '/upgrade'}
                              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow"
                            >
                              Upgrade to Pro
                            </button>
                          ) : (
                            <button
                              onClick={() => window.location.href = '/api/auth/login'}
                              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow flex items-center gap-2 mx-auto"
                            >
                              <Github className="w-5 h-5" />
                              Sign in to Unlock Pro Features
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
                  className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold mb-3 text-green-400">Strengths</h3>
                  <ul className="space-y-2">
                    {result.summary.strengths.map((strength, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold mb-3 text-orange-400">Areas to Improve</h3>
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
                  className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold mb-3 text-blue-400">Top Priorities</h3>
                  <ul className="space-y-2">
                    {result.summary.topPriorities.map((priority, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-blue-400 font-semibold">{i + 1}.</span>
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
    <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-6 text-left hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-lg font-semibold mb-2">{category.displayName}</h4>
            {category.applicable ? (
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-md">
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className={cn("h-full", getScoreColor(scorePercentage).replace('text-', 'bg-'))}
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
              <span className="text-sm text-gray-500">Not applicable for this repository</span>
            )}
          </div>
          <ChevronRight className={cn("w-5 h-5 text-gray-400 transition-transform", isExpanded && "rotate-90")} />
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
            <div className="px-6 pb-6 space-y-4">
              <p className="text-sm text-gray-400">{category.description}</p>
              
              {category.subcategories && category.subcategories.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-semibold text-gray-300">Breakdown:</h5>
                  {category.subcategories.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{sub.name}</span>
                      <span className={cn("font-medium", sub.score === sub.maxScore ? "text-green-400" : "text-gray-300")}>
                        {sub.score}/{sub.maxScore}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {category.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-semibold text-gray-300">Recommendations:</h5>
                  <ul className="space-y-1">
                    {category.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                        <span className="text-purple-400">•</span>
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
        return <Zap className="w-5 h-5" />
      case 'best-practices':
        return <Code className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'easy':
        return 'text-green-400 bg-green-400/10'
      case 'medium':
        return 'text-yellow-400 bg-yellow-400/10'
      case 'hard':
        return 'text-red-400 bg-red-400/10'
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
        return 'text-yellow-400'
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
      className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 hover:bg-gray-800/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg", 
            finding.category === 'security' ? 'bg-red-500/10 text-red-400' :
            finding.category === 'performance' ? 'bg-blue-500/10 text-blue-400' :
            'bg-purple-500/10 text-purple-400'
          )}>
            {getCategoryIcon(finding.category)}
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold mb-1">{finding.title}</h4>
            <p className="text-sm text-gray-400 mb-3">{finding.description}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className={cn("font-medium", getSeverityColor(finding.severity))}>
                {finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)} Priority
              </span>
              <span className="text-gray-500">•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400">{finding.estimatedTime}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full">
            <Plus className="w-4 h-4" />
            <span className="font-bold">{finding.points} points</span>
          </div>
          <span className={cn("text-xs px-2 py-1 rounded-full font-medium", getEffortColor(finding.effort))}>
            {finding.effort === 'easy' ? '🟢 Easy' : finding.effort === 'medium' ? '🟡 Medium' : '🔴 Hard'}
          </span>
        </div>
      </div>
      <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
        <p className="text-sm text-gray-300">
          <span className="font-semibold text-gray-200">How to fix:</span> {finding.fix}
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
      className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 relative overflow-hidden"
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-md bg-gray-900/70 z-10 flex items-center justify-center">
        <Lock className="w-8 h-8 text-gray-500" />
      </div>
      
      {/* Placeholder content */}
      <div className="filter blur-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-800 w-10 h-10" />
            <div className="flex-1">
              <div className="h-6 bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-800 rounded w-full mb-3" />
              <div className="flex items-center gap-4">
                <div className="h-4 bg-gray-800 rounded w-20" />
                <div className="h-4 bg-gray-800 rounded w-20" />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-8 bg-gray-800 rounded-full w-24" />
            <div className="h-6 bg-gray-800 rounded-full w-16" />
          </div>
        </div>
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
          <div className="h-4 bg-gray-700 rounded w-full" />
        </div>
      </div>
    </motion.div>
  )
}
