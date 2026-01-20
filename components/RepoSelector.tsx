'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Lock, 
  Globe, 
  Star, 
  Search, 
  Loader2, 
  LogOut, 
  RefreshCw,
  GitFork,
  ChevronRight,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface Repo {
  id: number
  name: string
  fullName: string
  url: string
  description: string | null
  private: boolean
  language: string | null
  updatedAt: string
  stars: number
  forks: number
  defaultBranch: string
}

interface UserData {
  id: string
  name: string | null
  email: string | null
  image: string | null
  tier: 'FREE' | 'PRO' | 'ENTERPRISE'
  monthlyScans: number
}

// =============================================================================
// REPO SELECTOR COMPONENT
// =============================================================================

export default function RepoSelector({ 
  onSelectRepo 
}: { 
  onSelectRepo: (repoUrl: string) => void 
}) {
  const [user, setUser] = useState<UserData | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [filteredRepos, setFilteredRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPrivateOnly, setShowPrivateOnly] = useState(false)

  // Fetch user and repos on mount
  useEffect(() => {
    fetchUserAndRepos()
  }, [])

  const fetchUserAndRepos = async () => {
    setLoading(true)
    try {
      // Fetch user first
      const userRes = await fetch('/api/auth/me')
      const userData = await userRes.json()
      
      if (userData.user) {
        setUser(userData.user)
        // Then fetch repos
        await fetchRepos()
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Filter repos when search/filter changes
  useEffect(() => {
    let filtered = repos

    if (searchQuery) {
      filtered = filtered.filter(
        (repo) =>
          repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (showPrivateOnly) {
      filtered = filtered.filter((repo) => repo.private)
    }

    setFilteredRepos(filtered)
  }, [repos, searchQuery, showPrivateOnly])

  const fetchRepos = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/repos')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch repositories')
      }

      setRepos(data.repos || [])
      setFilteredRepos(data.repos || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repositories')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRepo = (repo: Repo) => {
    onSelectRepo(repo.url)
  }

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  // Not authenticated or still loading
  if (loading || !user) {
    return null
  }

  const privateCount = repos.filter((r) => r.private).length

  // Language color mapping
  const languageColors: Record<string, string> = {
    TypeScript: 'bg-blue-500',
    JavaScript: 'bg-yellow-500',
    Python: 'bg-green-500',
    Rust: 'bg-orange-500',
    Go: 'bg-cyan-500',
    Swift: 'bg-orange-400',
    Kotlin: 'bg-purple-500',
    Java: 'bg-red-500',
    Ruby: 'bg-red-600',
    PHP: 'bg-indigo-500',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-800 overflow-hidden max-w-2xl mx-auto"
    >
      {/* Header with user info */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user.image && (
            <img
              src={user.image}
              alt={user.name || 'User'}
              className="w-10 h-10 rounded-full border-2 border-gray-700"
            />
          )}
          <div>
            <p className="font-semibold text-white">{user.name}</p>
            <p className="text-sm text-gray-400">
              {repos.length} repos • {privateCount} private
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRepos}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh repos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-4 border-b border-gray-800 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrivateOnly(!showPrivateOnly)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showPrivateOnly
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-gray-600'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Private only ({privateCount})
          </button>
          <span className="text-sm text-gray-500">
            {filteredRepos.length} repos
          </span>
        </div>
      </div>

      {/* Repo List */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-8 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading your repositories...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchRepos}
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              Try again
            </button>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? 'No repositories match your search' : 'No repositories found'}
          </div>
        ) : (
          <div className="p-2">
            {filteredRepos.map((repo) => (
              <motion.button
                key={repo.id}
                onClick={() => handleSelectRepo(repo)}
                whileHover={{ backgroundColor: 'rgba(75, 85, 99, 0.3)' }}
                className="w-full p-3 rounded-lg text-left group transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {repo.private ? (
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      )}
                      <span className="font-medium text-white truncate">
                        {repo.name}
                      </span>
                      {repo.private && (
                        <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                          Private
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-gray-400 truncate mb-2">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${languageColors[repo.language] || 'bg-gray-500'}`} />
                          {repo.language}
                        </span>
                      )}
                      {repo.stars > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {repo.stars.toLocaleString()}
                        </span>
                      )}
                      {repo.forks > 0 && (
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3 h-3" />
                          {repo.forks.toLocaleString()}
                        </span>
                      )}
                      <span>
                        Updated {new Date(repo.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <span className="text-sm text-emerald-400 font-medium">Analyze</span>
                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
