'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Github, Zap, Shield, Gauge } from 'lucide-react'
import { extractRepoInfo } from '@/lib/utils'
import AnalysisScreen from '@/components/AnalysisScreen'

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('')
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

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

  if (analyzing && repoUrl) {
    return <AnalysisScreen repoUrl={repoUrl} />
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg" />
            <span className="font-bold text-xl">inprod.ai</span>
          </motion.div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-4xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Is Your Code Production Ready?
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Get an intelligent analysis of your GitHub repository's production readiness 
                with comprehensive scoring across security, performance, and best practices.
              </p>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onSubmit={handleSubmit}
              className="max-w-2xl mx-auto"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur-lg opacity-50" />
                <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-xl p-2">
                  <div className="flex items-center gap-2">
                    <Github className="w-6 h-6 text-gray-400 ml-4" />
                    <input
                      type="text"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/username/repository"
                      className="flex-1 bg-transparent text-white placeholder-gray-500 px-4 py-4 focus:outline-none"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold mr-2 hover:shadow-lg transition-shadow"
                    >
                      Analyze
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

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Security Analysis</h3>
                <p className="text-gray-400 text-sm">Comprehensive security audit including authentication, data protection, and vulnerability detection</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Performance Check</h3>
                <p className="text-gray-400 text-sm">Optimization analysis for speed, scalability, and resource efficiency</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Gauge className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Best Practices</h3>
                <p className="text-gray-400 text-sm">Evaluation of code quality, testing coverage, and deployment readiness</p>
              </div>
            </motion.div>
        </div>
      </main>
      </div>
    </div>
  )
}