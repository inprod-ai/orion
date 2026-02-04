// =============================================================================
// CLASSIFICATION BENCHMARK - 100 LABELED FUNCTIONS
// =============================================================================
// Ground truth dataset for evaluating problem classification accuracy
// Organized by problem class with easy/medium/hard difficulty levels

import type { BenchmarkCase, ProblemClass } from './types'

// =============================================================================
// COMPARISON SORT (10 examples)
// =============================================================================

const COMPARISON_SORT_CASES: BenchmarkCase[] = [
  {
    id: 'sort-001',
    name: 'bubble-sort-basic',
    language: 'typescript',
    expectedClass: 'comparison-sort',
    difficulty: 'easy',
    description: 'Classic bubble sort with nested loops and swaps',
    code: `function bubbleSort(arr: number[]): number[] {
  const n = arr.length
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
      }
    }
  }
  return arr
}`,
  },
  {
    id: 'sort-002',
    name: 'selection-sort',
    language: 'typescript',
    expectedClass: 'comparison-sort',
    difficulty: 'easy',
    description: 'Selection sort finding minimum in each pass',
    code: `function selectionSort(arr: number[]): number[] {
  for (let i = 0; i < arr.length; i++) {
    let minIdx = i
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] < arr[minIdx]) {
        minIdx = j
      }
    }
    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]]
    }
  }
  return arr
}`,
  },
  {
    id: 'sort-003',
    name: 'insertion-sort',
    language: 'typescript',
    expectedClass: 'comparison-sort',
    difficulty: 'easy',
    description: 'Insertion sort building sorted portion',
    code: `function insertionSort(arr: number[]): number[] {
  for (let i = 1; i < arr.length; i++) {
    const key = arr[i]
    let j = i - 1
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j]
      j--
    }
    arr[j + 1] = key
  }
  return arr
}`,
  },
  {
    id: 'sort-004',
    name: 'merge-sort-recursive',
    language: 'typescript',
    expectedClass: 'comparison-sort',
    difficulty: 'medium',
    description: 'Recursive merge sort with divide and conquer',
    code: `function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr
  const mid = Math.floor(arr.length / 2)
  const left = mergeSort(arr.slice(0, mid))
  const right = mergeSort(arr.slice(mid))
  return merge(left, right)
}

function merge(left: number[], right: number[]): number[] {
  const result: number[] = []
  let i = 0, j = 0
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      result.push(left[i++])
    } else {
      result.push(right[j++])
    }
  }
  return result.concat(left.slice(i)).concat(right.slice(j))
}`,
  },
  {
    id: 'sort-005',
    name: 'quicksort-lomuto',
    language: 'typescript',
    expectedClass: 'comparison-sort',
    difficulty: 'medium',
    description: 'Quicksort with Lomuto partition scheme',
    code: `function quickSort(arr: number[], low = 0, high = arr.length - 1): number[] {
  if (low < high) {
    const pi = partition(arr, low, high)
    quickSort(arr, low, pi - 1)
    quickSort(arr, pi + 1, high)
  }
  return arr
}

function partition(arr: number[], low: number, high: number): number {
  const pivot = arr[high]
  let i = low - 1
  for (let j = low; j < high; j++) {
    if (arr[j] < pivot) {
      i++
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
  }
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]]
  return i + 1
}`,
  },
  {
    id: 'sort-006',
    name: 'heap-sort',
    language: 'typescript',
    expectedClass: 'comparison-sort',
    difficulty: 'medium',
    description: 'Heap sort using max-heap property',
    code: `function heapSort(arr: number[]): number[] {
  const n = arr.length
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(arr, n, i)
  }
  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]]
    heapify(arr, i, 0)
  }
  return arr
}

function heapify(arr: number[], n: number, i: number): void {
  let largest = i
  const left = 2 * i + 1
  const right = 2 * i + 2
  if (left < n && arr[left] > arr[largest]) largest = left
  if (right < n && arr[right] > arr[largest]) largest = right
  if (largest !== i) {
    [arr[i], arr[largest]] = [arr[largest], arr[i]]
    heapify(arr, n, largest)
  }
}`,
  },
  {
    id: 'sort-007',
    name: 'quicksort-hoare',
    language: 'typescript',
    expectedClass: 'comparison-sort',
    difficulty: 'hard',
    description: 'Quicksort with Hoare partition scheme',
    code: `function quickSortHoare(arr: number[], lo = 0, hi = arr.length - 1): number[] {
  if (lo < hi) {
    const p = hoarePartition(arr, lo, hi)
    quickSortHoare(arr, lo, p)
    quickSortHoare(arr, p + 1, hi)
  }
  return arr
}

function hoarePartition(arr: number[], lo: number, hi: number): number {
  const pivot = arr[Math.floor((lo + hi) / 2)]
  let i = lo - 1
  let j = hi + 1
  while (true) {
    do { i++ } while (arr[i] < pivot)
    do { j-- } while (arr[j] > pivot)
    if (i >= j) return j
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}`,
  },
  {
    id: 'sort-008',
    name: 'shell-sort',
    language: 'typescript',
    expectedClass: 'comparison-sort',
    difficulty: 'hard',
    description: 'Shell sort with gap sequence',
    code: `function shellSort(arr: number[]): number[] {
  let gap = Math.floor(arr.length / 2)
  while (gap > 0) {
    for (let i = gap; i < arr.length; i++) {
      const temp = arr[i]
      let j = i
      while (j >= gap && arr[j - gap] > temp) {
        arr[j] = arr[j - gap]
        j -= gap
      }
      arr[j] = temp
    }
    gap = Math.floor(gap / 2)
  }
  return arr
}`,
  },
  {
    id: 'sort-009',
    name: 'sort-objects-by-key',
    language: 'typescript',
    expectedClass: 'comparison-sort',
    difficulty: 'medium',
    description: 'Sorting objects by a key using comparisons',
    code: `interface Item { id: number; value: string }

function sortByValue(items: Item[]): Item[] {
  return items.sort((a, b) => a.value.localeCompare(b.value))
}`,
  },
  {
    id: 'sort-010',
    name: 'timsort-like',
    language: 'typescript',
    expectedClass: 'comparison-sort',
    difficulty: 'hard',
    description: 'Timsort-inspired hybrid sort',
    code: `function timSort(arr: number[]): number[] {
  const RUN = 32
  const n = arr.length
  
  for (let i = 0; i < n; i += RUN) {
    insertionSortRange(arr, i, Math.min(i + RUN - 1, n - 1))
  }
  
  for (let size = RUN; size < n; size *= 2) {
    for (let left = 0; left < n; left += 2 * size) {
      const mid = left + size - 1
      const right = Math.min(left + 2 * size - 1, n - 1)
      if (mid < right) {
        mergeRange(arr, left, mid, right)
      }
    }
  }
  return arr
}

function insertionSortRange(arr: number[], left: number, right: number): void {
  for (let i = left + 1; i <= right; i++) {
    const key = arr[i]
    let j = i - 1
    while (j >= left && arr[j] > key) {
      arr[j + 1] = arr[j]
      j--
    }
    arr[j + 1] = key
  }
}

function mergeRange(arr: number[], l: number, m: number, r: number): void {
  const left = arr.slice(l, m + 1)
  const right = arr.slice(m + 1, r + 1)
  let i = 0, j = 0, k = l
  while (i < left.length && j < right.length) {
    arr[k++] = left[i] <= right[j] ? left[i++] : right[j++]
  }
  while (i < left.length) arr[k++] = left[i++]
  while (j < right.length) arr[k++] = right[j++]
}`,
  },
]

// =============================================================================
// BINARY SEARCH (10 examples)
// =============================================================================

const BINARY_SEARCH_CASES: BenchmarkCase[] = [
  {
    id: 'bsearch-001',
    name: 'binary-search-iterative',
    language: 'typescript',
    expectedClass: 'binary-search',
    difficulty: 'easy',
    description: 'Classic iterative binary search',
    code: `function binarySearch(arr: number[], target: number): number {
  let left = 0
  let right = arr.length - 1
  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if (arr[mid] === target) return mid
    if (arr[mid] < target) left = mid + 1
    else right = mid - 1
  }
  return -1
}`,
  },
  {
    id: 'bsearch-002',
    name: 'binary-search-recursive',
    language: 'typescript',
    expectedClass: 'binary-search',
    difficulty: 'easy',
    description: 'Recursive binary search implementation',
    code: `function binarySearchRecursive(arr: number[], target: number, left = 0, right = arr.length - 1): number {
  if (left > right) return -1
  const mid = Math.floor((left + right) / 2)
  if (arr[mid] === target) return mid
  if (arr[mid] > target) return binarySearchRecursive(arr, target, left, mid - 1)
  return binarySearchRecursive(arr, target, mid + 1, right)
}`,
  },
  {
    id: 'bsearch-003',
    name: 'lower-bound',
    language: 'typescript',
    expectedClass: 'binary-search',
    difficulty: 'medium',
    description: 'Find first element not less than target',
    code: `function lowerBound(arr: number[], target: number): number {
  let left = 0
  let right = arr.length
  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    if (arr[mid] < target) left = mid + 1
    else right = mid
  }
  return left
}`,
  },
  {
    id: 'bsearch-004',
    name: 'upper-bound',
    language: 'typescript',
    expectedClass: 'binary-search',
    difficulty: 'medium',
    description: 'Find first element greater than target',
    code: `function upperBound(arr: number[], target: number): number {
  let left = 0
  let right = arr.length
  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    if (arr[mid] <= target) left = mid + 1
    else right = mid
  }
  return left
}`,
  },
  {
    id: 'bsearch-005',
    name: 'search-insert-position',
    language: 'typescript',
    expectedClass: 'binary-search',
    difficulty: 'easy',
    description: 'Find index where target should be inserted',
    code: `function searchInsert(nums: number[], target: number): number {
  let lo = 0, hi = nums.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (nums[mid] < target) lo = mid + 1
    else hi = mid
  }
  return lo
}`,
  },
  {
    id: 'bsearch-006',
    name: 'search-rotated-array',
    language: 'typescript',
    expectedClass: 'binary-search',
    difficulty: 'hard',
    description: 'Binary search in rotated sorted array',
    code: `function searchRotated(nums: number[], target: number): number {
  let left = 0, right = nums.length - 1
  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if (nums[mid] === target) return mid
    if (nums[left] <= nums[mid]) {
      if (nums[left] <= target && target < nums[mid]) right = mid - 1
      else left = mid + 1
    } else {
      if (nums[mid] < target && target <= nums[right]) left = mid + 1
      else right = mid - 1
    }
  }
  return -1
}`,
  },
  {
    id: 'bsearch-007',
    name: 'find-peak-element',
    language: 'typescript',
    expectedClass: 'binary-search',
    difficulty: 'medium',
    description: 'Find local maximum using binary search',
    code: `function findPeakElement(nums: number[]): number {
  let left = 0, right = nums.length - 1
  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    if (nums[mid] > nums[mid + 1]) right = mid
    else left = mid + 1
  }
  return left
}`,
  },
  {
    id: 'bsearch-008',
    name: 'sqrt-binary-search',
    language: 'typescript',
    expectedClass: 'binary-search',
    difficulty: 'medium',
    description: 'Integer square root using binary search',
    code: `function mySqrt(x: number): number {
  if (x < 2) return x
  let left = 1, right = Math.floor(x / 2)
  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const sq = mid * mid
    if (sq === x) return mid
    if (sq < x) left = mid + 1
    else right = mid - 1
  }
  return right
}`,
  },
  {
    id: 'bsearch-009',
    name: 'first-bad-version',
    language: 'typescript',
    expectedClass: 'binary-search',
    difficulty: 'easy',
    description: 'Find first bad version in sequence',
    code: `function firstBadVersion(n: number, isBadVersion: (v: number) => boolean): number {
  let left = 1, right = n
  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    if (isBadVersion(mid)) right = mid
    else left = mid + 1
  }
  return left
}`,
  },
  {
    id: 'bsearch-010',
    name: 'search-2d-matrix',
    language: 'typescript',
    expectedClass: 'binary-search',
    difficulty: 'hard',
    description: 'Binary search in row-column sorted matrix',
    code: `function searchMatrix(matrix: number[][], target: number): boolean {
  if (!matrix.length || !matrix[0].length) return false
  const m = matrix.length, n = matrix[0].length
  let left = 0, right = m * n - 1
  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const val = matrix[Math.floor(mid / n)][mid % n]
    if (val === target) return true
    if (val < target) left = mid + 1
    else right = mid - 1
  }
  return false
}`,
  },
]

// =============================================================================
// LINEAR SEARCH (10 examples)
// =============================================================================

const LINEAR_SEARCH_CASES: BenchmarkCase[] = [
  {
    id: 'lsearch-001',
    name: 'linear-search-basic',
    language: 'typescript',
    expectedClass: 'linear-search',
    difficulty: 'easy',
    description: 'Simple linear search through array',
    code: `function linearSearch(arr: number[], target: number): number {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i
  }
  return -1
}`,
  },
  {
    id: 'lsearch-002',
    name: 'find-index',
    language: 'typescript',
    expectedClass: 'linear-search',
    difficulty: 'easy',
    description: 'Find first matching element with predicate',
    code: `function findIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i])) return i
  }
  return -1
}`,
  },
  {
    id: 'lsearch-003',
    name: 'includes-check',
    language: 'typescript',
    expectedClass: 'linear-search',
    difficulty: 'easy',
    description: 'Check if array contains element',
    code: `function includes<T>(arr: T[], target: T): boolean {
  for (const item of arr) {
    if (item === target) return true
  }
  return false
}`,
  },
  {
    id: 'lsearch-004',
    name: 'find-maximum',
    language: 'typescript',
    expectedClass: 'linear-search',
    difficulty: 'easy',
    description: 'Find maximum element in unsorted array',
    code: `function findMax(arr: number[]): number {
  if (arr.length === 0) throw new Error('Empty array')
  let max = arr[0]
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) max = arr[i]
  }
  return max
}`,
  },
  {
    id: 'lsearch-005',
    name: 'find-minimum',
    language: 'typescript',
    expectedClass: 'linear-search',
    difficulty: 'easy',
    description: 'Find minimum element in unsorted array',
    code: `function findMin(arr: number[]): number {
  if (arr.length === 0) throw new Error('Empty array')
  let min = arr[0]
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < min) min = arr[i]
  }
  return min
}`,
  },
  {
    id: 'lsearch-006',
    name: 'count-occurrences',
    language: 'typescript',
    expectedClass: 'linear-search',
    difficulty: 'easy',
    description: 'Count occurrences of element',
    code: `function countOccurrences<T>(arr: T[], target: T): number {
  let count = 0
  for (const item of arr) {
    if (item === target) count++
  }
  return count
}`,
  },
  {
    id: 'lsearch-007',
    name: 'find-all-indices',
    language: 'typescript',
    expectedClass: 'linear-search',
    difficulty: 'medium',
    description: 'Find all indices where element appears',
    code: `function findAllIndices<T>(arr: T[], target: T): number[] {
  const indices: number[] = []
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) indices.push(i)
  }
  return indices
}`,
  },
  {
    id: 'lsearch-008',
    name: 'find-last',
    language: 'typescript',
    expectedClass: 'linear-search',
    difficulty: 'easy',
    description: 'Find last occurrence of element',
    code: `function findLast<T>(arr: T[], target: T): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] === target) return i
  }
  return -1
}`,
  },
  {
    id: 'lsearch-009',
    name: 'two-sum-brute',
    language: 'typescript',
    expectedClass: 'linear-search',
    difficulty: 'medium',
    description: 'Two sum with nested linear search',
    code: `function twoSum(nums: number[], target: number): [number, number] | null {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j]
      }
    }
  }
  return null
}`,
  },
  {
    id: 'lsearch-010',
    name: 'find-duplicate',
    language: 'typescript',
    expectedClass: 'linear-search',
    difficulty: 'medium',
    description: 'Find first duplicate using linear scan',
    code: `function findDuplicate(arr: number[]): number | null {
  const seen = new Set<number>()
  for (const num of arr) {
    if (seen.has(num)) return num
    seen.add(num)
  }
  return null
}`,
  },
]

// =============================================================================
// GRAPH BFS (10 examples)
// =============================================================================

const GRAPH_BFS_CASES: BenchmarkCase[] = [
  {
    id: 'bfs-001',
    name: 'bfs-basic',
    language: 'typescript',
    expectedClass: 'graph-bfs',
    difficulty: 'easy',
    description: 'Basic BFS traversal of adjacency list',
    code: `function bfs(graph: Map<number, number[]>, start: number): number[] {
  const visited = new Set<number>()
  const queue: number[] = [start]
  const result: number[] = []
  
  while (queue.length > 0) {
    const node = queue.shift()!
    if (visited.has(node)) continue
    visited.add(node)
    result.push(node)
    
    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor)
      }
    }
  }
  return result
}`,
  },
  {
    id: 'bfs-002',
    name: 'shortest-path-unweighted',
    language: 'typescript',
    expectedClass: 'graph-bfs',
    difficulty: 'medium',
    description: 'Find shortest path in unweighted graph',
    code: `function shortestPath(graph: Map<number, number[]>, start: number, end: number): number[] | null {
  const queue: number[][] = [[start]]
  const visited = new Set<number>([start])
  
  while (queue.length > 0) {
    const path = queue.shift()!
    const node = path[path.length - 1]
    
    if (node === end) return path
    
    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push([...path, neighbor])
      }
    }
  }
  return null
}`,
  },
  {
    id: 'bfs-003',
    name: 'level-order-tree',
    language: 'typescript',
    expectedClass: 'graph-bfs',
    difficulty: 'easy',
    description: 'Level-order traversal of binary tree',
    code: `interface TreeNode { val: number; left: TreeNode | null; right: TreeNode | null }

function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return []
  const result: number[][] = []
  const queue: TreeNode[] = [root]
  
  while (queue.length > 0) {
    const levelSize = queue.length
    const level: number[] = []
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!
      level.push(node.val)
      if (node.left) queue.push(node.left)
      if (node.right) queue.push(node.right)
    }
    result.push(level)
  }
  return result
}`,
  },
  {
    id: 'bfs-004',
    name: 'connected-components',
    language: 'typescript',
    expectedClass: 'graph-bfs',
    difficulty: 'medium',
    description: 'Count connected components using BFS',
    code: `function countComponents(n: number, edges: [number, number][]): number {
  const graph = new Map<number, number[]>()
  for (let i = 0; i < n; i++) graph.set(i, [])
  for (const [u, v] of edges) {
    graph.get(u)!.push(v)
    graph.get(v)!.push(u)
  }
  
  const visited = new Set<number>()
  let components = 0
  
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) {
      components++
      const queue = [i]
      while (queue.length > 0) {
        const node = queue.shift()!
        if (visited.has(node)) continue
        visited.add(node)
        for (const neighbor of graph.get(node)!) {
          if (!visited.has(neighbor)) queue.push(neighbor)
        }
      }
    }
  }
  return components
}`,
  },
  {
    id: 'bfs-005',
    name: 'grid-bfs',
    language: 'typescript',
    expectedClass: 'graph-bfs',
    difficulty: 'medium',
    description: 'BFS on 2D grid',
    code: `function gridBFS(grid: number[][], start: [number, number]): number {
  const rows = grid.length, cols = grid[0].length
  const queue: [number, number, number][] = [[start[0], start[1], 0]]
  const visited = new Set<string>()
  visited.add(\`\${start[0]},\${start[1]}\`)
  
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  
  while (queue.length > 0) {
    const [r, c, dist] = queue.shift()!
    if (grid[r][c] === 2) return dist
    
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc
      const key = \`\${nr},\${nc}\`
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && 
          grid[nr][nc] !== 0 && !visited.has(key)) {
        visited.add(key)
        queue.push([nr, nc, dist + 1])
      }
    }
  }
  return -1
}`,
  },
  {
    id: 'bfs-006',
    name: 'minimum-depth-tree',
    language: 'typescript',
    expectedClass: 'graph-bfs',
    difficulty: 'easy',
    description: 'Find minimum depth of binary tree',
    code: `interface TreeNode { val: number; left: TreeNode | null; right: TreeNode | null }

function minDepth(root: TreeNode | null): number {
  if (!root) return 0
  const queue: [TreeNode, number][] = [[root, 1]]
  
  while (queue.length > 0) {
    const [node, depth] = queue.shift()!
    if (!node.left && !node.right) return depth
    if (node.left) queue.push([node.left, depth + 1])
    if (node.right) queue.push([node.right, depth + 1])
  }
  return 0
}`,
  },
  {
    id: 'bfs-007',
    name: 'word-ladder',
    language: 'typescript',
    expectedClass: 'graph-bfs',
    difficulty: 'hard',
    description: 'Word ladder problem using BFS',
    code: `function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {
  const wordSet = new Set(wordList)
  if (!wordSet.has(endWord)) return 0
  
  const queue: [string, number][] = [[beginWord, 1]]
  const visited = new Set<string>([beginWord])
  
  while (queue.length > 0) {
    const [word, length] = queue.shift()!
    if (word === endWord) return length
    
    for (let i = 0; i < word.length; i++) {
      for (let c = 97; c <= 122; c++) {
        const newWord = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1)
        if (wordSet.has(newWord) && !visited.has(newWord)) {
          visited.add(newWord)
          queue.push([newWord, length + 1])
        }
      }
    }
  }
  return 0
}`,
  },
  {
    id: 'bfs-008',
    name: 'bipartite-check',
    language: 'typescript',
    expectedClass: 'graph-bfs',
    difficulty: 'medium',
    description: 'Check if graph is bipartite using BFS',
    code: `function isBipartite(graph: number[][]): boolean {
  const n = graph.length
  const colors = new Array(n).fill(-1)
  
  for (let start = 0; start < n; start++) {
    if (colors[start] !== -1) continue
    
    const queue = [start]
    colors[start] = 0
    
    while (queue.length > 0) {
      const node = queue.shift()!
      for (const neighbor of graph[node]) {
        if (colors[neighbor] === -1) {
          colors[neighbor] = 1 - colors[node]
          queue.push(neighbor)
        } else if (colors[neighbor] === colors[node]) {
          return false
        }
      }
    }
  }
  return true
}`,
  },
  {
    id: 'bfs-009',
    name: 'rotten-oranges',
    language: 'typescript',
    expectedClass: 'graph-bfs',
    difficulty: 'medium',
    description: 'Multi-source BFS for spreading rot',
    code: `function orangesRotting(grid: number[][]): number {
  const rows = grid.length, cols = grid[0].length
  const queue: [number, number][] = []
  let fresh = 0
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) queue.push([r, c])
      if (grid[r][c] === 1) fresh++
    }
  }
  
  if (fresh === 0) return 0
  
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  let minutes = 0
  
  while (queue.length > 0 && fresh > 0) {
    minutes++
    const size = queue.length
    for (let i = 0; i < size; i++) {
      const [r, c] = queue.shift()!
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1) {
          grid[nr][nc] = 2
          fresh--
          queue.push([nr, nc])
        }
      }
    }
  }
  
  return fresh === 0 ? minutes : -1
}`,
  },
  {
    id: 'bfs-010',
    name: 'clone-graph',
    language: 'typescript',
    expectedClass: 'graph-bfs',
    difficulty: 'medium',
    description: 'Clone graph using BFS traversal',
    code: `class GraphNode {
  val: number
  neighbors: GraphNode[]
  constructor(val = 0, neighbors: GraphNode[] = []) {
    this.val = val
    this.neighbors = neighbors
  }
}

function cloneGraph(node: GraphNode | null): GraphNode | null {
  if (!node) return null
  
  const visited = new Map<GraphNode, GraphNode>()
  const queue: GraphNode[] = [node]
  visited.set(node, new GraphNode(node.val))
  
  while (queue.length > 0) {
    const curr = queue.shift()!
    const clone = visited.get(curr)!
    
    for (const neighbor of curr.neighbors) {
      if (!visited.has(neighbor)) {
        visited.set(neighbor, new GraphNode(neighbor.val))
        queue.push(neighbor)
      }
      clone.neighbors.push(visited.get(neighbor)!)
    }
  }
  
  return visited.get(node)!
}`,
  },
]

// =============================================================================
// GRAPH DFS (10 examples)
// =============================================================================

const GRAPH_DFS_CASES: BenchmarkCase[] = [
  {
    id: 'dfs-001',
    name: 'dfs-recursive',
    language: 'typescript',
    expectedClass: 'graph-dfs',
    difficulty: 'easy',
    description: 'Basic recursive DFS traversal',
    code: `function dfs(graph: Map<number, number[]>, start: number, visited = new Set<number>()): number[] {
  if (visited.has(start)) return []
  visited.add(start)
  
  const result = [start]
  for (const neighbor of graph.get(start) || []) {
    result.push(...dfs(graph, neighbor, visited))
  }
  return result
}`,
  },
  {
    id: 'dfs-002',
    name: 'dfs-iterative',
    language: 'typescript',
    expectedClass: 'graph-dfs',
    difficulty: 'easy',
    description: 'Iterative DFS using stack',
    code: `function dfsIterative(graph: Map<number, number[]>, start: number): number[] {
  const visited = new Set<number>()
  const stack = [start]
  const result: number[] = []
  
  while (stack.length > 0) {
    const node = stack.pop()!
    if (visited.has(node)) continue
    visited.add(node)
    result.push(node)
    
    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) stack.push(neighbor)
    }
  }
  return result
}`,
  },
  {
    id: 'dfs-003',
    name: 'inorder-traversal',
    language: 'typescript',
    expectedClass: 'graph-dfs',
    difficulty: 'easy',
    description: 'Inorder tree traversal (DFS)',
    code: `interface TreeNode { val: number; left: TreeNode | null; right: TreeNode | null }

function inorderTraversal(root: TreeNode | null): number[] {
  const result: number[] = []
  function dfs(node: TreeNode | null) {
    if (!node) return
    dfs(node.left)
    result.push(node.val)
    dfs(node.right)
  }
  dfs(root)
  return result
}`,
  },
  {
    id: 'dfs-004',
    name: 'preorder-traversal',
    language: 'typescript',
    expectedClass: 'graph-dfs',
    difficulty: 'easy',
    description: 'Preorder tree traversal (DFS)',
    code: `interface TreeNode { val: number; left: TreeNode | null; right: TreeNode | null }

function preorderTraversal(root: TreeNode | null): number[] {
  const result: number[] = []
  function dfs(node: TreeNode | null) {
    if (!node) return
    result.push(node.val)
    dfs(node.left)
    dfs(node.right)
  }
  dfs(root)
  return result
}`,
  },
  {
    id: 'dfs-005',
    name: 'has-cycle',
    language: 'typescript',
    expectedClass: 'graph-dfs',
    difficulty: 'medium',
    description: 'Detect cycle in directed graph using DFS',
    code: `function hasCycle(graph: Map<number, number[]>, n: number): boolean {
  const visited = new Set<number>()
  const recStack = new Set<number>()
  
  function dfs(node: number): boolean {
    visited.add(node)
    recStack.add(node)
    
    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true
      } else if (recStack.has(neighbor)) {
        return true
      }
    }
    
    recStack.delete(node)
    return false
  }
  
  for (let i = 0; i < n; i++) {
    if (!visited.has(i) && dfs(i)) return true
  }
  return false
}`,
  },
  {
    id: 'dfs-006',
    name: 'topological-sort',
    language: 'typescript',
    expectedClass: 'graph-dfs',
    difficulty: 'medium',
    description: 'Topological sort using DFS',
    code: `function topologicalSort(graph: Map<number, number[]>, n: number): number[] {
  const visited = new Set<number>()
  const result: number[] = []
  
  function dfs(node: number) {
    if (visited.has(node)) return
    visited.add(node)
    
    for (const neighbor of graph.get(node) || []) {
      dfs(neighbor)
    }
    result.unshift(node)
  }
  
  for (let i = 0; i < n; i++) {
    dfs(i)
  }
  return result
}`,
  },
  {
    id: 'dfs-007',
    name: 'path-sum',
    language: 'typescript',
    expectedClass: 'graph-dfs',
    difficulty: 'easy',
    description: 'Check if root-to-leaf path with sum exists',
    code: `interface TreeNode { val: number; left: TreeNode | null; right: TreeNode | null }

function hasPathSum(root: TreeNode | null, targetSum: number): boolean {
  if (!root) return false
  if (!root.left && !root.right) return root.val === targetSum
  return hasPathSum(root.left, targetSum - root.val) || 
         hasPathSum(root.right, targetSum - root.val)
}`,
  },
  {
    id: 'dfs-008',
    name: 'number-of-islands',
    language: 'typescript',
    expectedClass: 'graph-dfs',
    difficulty: 'medium',
    description: 'Count islands in 2D grid using DFS',
    code: `function numIslands(grid: string[][]): number {
  const rows = grid.length, cols = grid[0].length
  let count = 0
  
  function dfs(r: number, c: number) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return
    grid[r][c] = '0'
    dfs(r + 1, c)
    dfs(r - 1, c)
    dfs(r, c + 1)
    dfs(r, c - 1)
  }
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') {
        count++
        dfs(r, c)
      }
    }
  }
  return count
}`,
  },
  {
    id: 'dfs-009',
    name: 'all-paths',
    language: 'typescript',
    expectedClass: 'graph-dfs',
    difficulty: 'medium',
    description: 'Find all paths from source to target',
    code: `function allPathsSourceTarget(graph: number[][]): number[][] {
  const result: number[][] = []
  const target = graph.length - 1
  
  function dfs(node: number, path: number[]) {
    if (node === target) {
      result.push([...path])
      return
    }
    
    for (const next of graph[node]) {
      path.push(next)
      dfs(next, path)
      path.pop()
    }
  }
  
  dfs(0, [0])
  return result
}`,
  },
  {
    id: 'dfs-010',
    name: 'max-depth-tree',
    language: 'typescript',
    expectedClass: 'graph-dfs',
    difficulty: 'easy',
    description: 'Maximum depth of binary tree using DFS',
    code: `interface TreeNode { val: number; left: TreeNode | null; right: TreeNode | null }

function maxDepth(root: TreeNode | null): number {
  if (!root) return 0
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right))
}`,
  },
]

// =============================================================================
// DIJKSTRA SHORTEST PATH (10 examples)
// =============================================================================

const DIJKSTRA_CASES: BenchmarkCase[] = [
  {
    id: 'dijkstra-001',
    name: 'dijkstra-basic',
    language: 'typescript',
    expectedClass: 'shortest-path-dijkstra',
    difficulty: 'easy',
    description: 'Basic Dijkstra with priority queue simulation',
    code: `function dijkstra(graph: Map<number, [number, number][]>, start: number, n: number): number[] {
  const dist = new Array(n).fill(Infinity)
  dist[start] = 0
  const visited = new Set<number>()
  const pq: [number, number][] = [[0, start]]
  
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0])
    const [d, u] = pq.shift()!
    
    if (visited.has(u)) continue
    visited.add(u)
    
    for (const [v, w] of graph.get(u) || []) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w
        pq.push([dist[v], v])
      }
    }
  }
  return dist
}`,
  },
  {
    id: 'dijkstra-002',
    name: 'network-delay-time',
    language: 'typescript',
    expectedClass: 'shortest-path-dijkstra',
    difficulty: 'medium',
    description: 'Network delay time problem',
    code: `function networkDelayTime(times: number[][], n: number, k: number): number {
  const graph = new Map<number, [number, number][]>()
  for (let i = 1; i <= n; i++) graph.set(i, [])
  for (const [u, v, w] of times) graph.get(u)!.push([v, w])
  
  const dist = new Map<number, number>()
  const pq: [number, number][] = [[0, k]]
  
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0])
    const [d, u] = pq.shift()!
    
    if (dist.has(u)) continue
    dist.set(u, d)
    
    for (const [v, w] of graph.get(u) || []) {
      if (!dist.has(v)) pq.push([d + w, v])
    }
  }
  
  if (dist.size !== n) return -1
  return Math.max(...dist.values())
}`,
  },
  {
    id: 'dijkstra-003',
    name: 'cheapest-flights',
    language: 'typescript',
    expectedClass: 'shortest-path-dijkstra',
    difficulty: 'hard',
    description: 'Cheapest flights within K stops',
    code: `function findCheapestPrice(n: number, flights: number[][], src: number, dst: number, k: number): number {
  const graph = new Map<number, [number, number][]>()
  for (let i = 0; i < n; i++) graph.set(i, [])
  for (const [u, v, w] of flights) graph.get(u)!.push([v, w])
  
  const dist = new Array(n).fill(Infinity)
  const pq: [number, number, number][] = [[0, src, 0]]
  
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0])
    const [cost, u, stops] = pq.shift()!
    
    if (u === dst) return cost
    if (stops > k) continue
    
    for (const [v, w] of graph.get(u) || []) {
      const newCost = cost + w
      if (newCost < dist[v]) {
        dist[v] = newCost
        pq.push([newCost, v, stops + 1])
      }
    }
  }
  return -1
}`,
  },
  {
    id: 'dijkstra-004',
    name: 'path-with-min-effort',
    language: 'typescript',
    expectedClass: 'shortest-path-dijkstra',
    difficulty: 'hard',
    description: 'Path with minimum effort in grid',
    code: `function minimumEffortPath(heights: number[][]): number {
  const rows = heights.length, cols = heights[0].length
  const dist = Array.from({ length: rows }, () => new Array(cols).fill(Infinity))
  dist[0][0] = 0
  
  const pq: [number, number, number][] = [[0, 0, 0]]
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0])
    const [effort, r, c] = pq.shift()!
    
    if (r === rows - 1 && c === cols - 1) return effort
    if (effort > dist[r][c]) continue
    
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const newEffort = Math.max(effort, Math.abs(heights[nr][nc] - heights[r][c]))
        if (newEffort < dist[nr][nc]) {
          dist[nr][nc] = newEffort
          pq.push([newEffort, nr, nc])
        }
      }
    }
  }
  return 0
}`,
  },
  {
    id: 'dijkstra-005',
    name: 'shortest-path-with-obstacles',
    language: 'typescript',
    expectedClass: 'shortest-path-dijkstra',
    difficulty: 'hard',
    description: 'Shortest path with obstacle elimination',
    code: `function shortestPath(grid: number[][], k: number): number {
  const rows = grid.length, cols = grid[0].length
  const visited = new Set<string>()
  const pq: [number, number, number, number][] = [[0, 0, 0, k]]
  
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0])
    const [dist, r, c, remaining] = pq.shift()!
    
    if (r === rows - 1 && c === cols - 1) return dist
    
    const key = \`\${r},\${c},\${remaining}\`
    if (visited.has(key)) continue
    visited.add(key)
    
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const newK = remaining - grid[nr][nc]
        if (newK >= 0) pq.push([dist + 1, nr, nc, newK])
      }
    }
  }
  return -1
}`,
  },
  {
    id: 'dijkstra-006',
    name: 'swim-in-rising-water',
    language: 'typescript',
    expectedClass: 'shortest-path-dijkstra',
    difficulty: 'hard',
    description: 'Minimum time to swim from corner to corner',
    code: `function swimInWater(grid: number[][]): number {
  const n = grid.length
  const dist = Array.from({ length: n }, () => new Array(n).fill(Infinity))
  dist[0][0] = grid[0][0]
  
  const pq: [number, number, number][] = [[grid[0][0], 0, 0]]
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0])
    const [time, r, c] = pq.shift()!
    
    if (r === n - 1 && c === n - 1) return time
    
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
        const newTime = Math.max(time, grid[nr][nc])
        if (newTime < dist[nr][nc]) {
          dist[nr][nc] = newTime
          pq.push([newTime, nr, nc])
        }
      }
    }
  }
  return -1
}`,
  },
  {
    id: 'dijkstra-007',
    name: 'dijkstra-with-path',
    language: 'typescript',
    expectedClass: 'shortest-path-dijkstra',
    difficulty: 'medium',
    description: 'Dijkstra with path reconstruction',
    code: `function dijkstraWithPath(graph: Map<number, [number, number][]>, start: number, end: number, n: number): { dist: number; path: number[] } {
  const dist = new Array(n).fill(Infinity)
  const prev = new Array(n).fill(-1)
  dist[start] = 0
  
  const pq: [number, number][] = [[0, start]]
  
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0])
    const [d, u] = pq.shift()!
    
    if (d > dist[u]) continue
    
    for (const [v, w] of graph.get(u) || []) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w
        prev[v] = u
        pq.push([dist[v], v])
      }
    }
  }
  
  const path: number[] = []
  for (let u = end; u !== -1; u = prev[u]) path.unshift(u)
  
  return { dist: dist[end], path: dist[end] === Infinity ? [] : path }
}`,
  },
  {
    id: 'dijkstra-008',
    name: 'min-cost-connect-points',
    language: 'typescript',
    expectedClass: 'shortest-path-dijkstra',
    difficulty: 'medium',
    description: 'Minimum cost to connect all points',
    code: `function minCostConnectPoints(points: number[][]): number {
  const n = points.length
  const visited = new Set<number>()
  const pq: [number, number][] = [[0, 0]]
  let totalCost = 0
  
  while (visited.size < n) {
    pq.sort((a, b) => a[0] - b[0])
    const [cost, u] = pq.shift()!
    
    if (visited.has(u)) continue
    visited.add(u)
    totalCost += cost
    
    for (let v = 0; v < n; v++) {
      if (!visited.has(v)) {
        const dist = Math.abs(points[u][0] - points[v][0]) + Math.abs(points[u][1] - points[v][1])
        pq.push([dist, v])
      }
    }
  }
  return totalCost
}`,
  },
  {
    id: 'dijkstra-009',
    name: 'shortest-path-binary-matrix',
    language: 'typescript',
    expectedClass: 'shortest-path-dijkstra',
    difficulty: 'medium',
    description: 'Shortest path in binary matrix (8 directions)',
    code: `function shortestPathBinaryMatrix(grid: number[][]): number {
  const n = grid.length
  if (grid[0][0] === 1 || grid[n-1][n-1] === 1) return -1
  
  const dist = Array.from({ length: n }, () => new Array(n).fill(Infinity))
  dist[0][0] = 1
  
  const pq: [number, number, number][] = [[1, 0, 0]]
  const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
  
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0])
    const [d, r, c] = pq.shift()!
    
    if (r === n - 1 && c === n - 1) return d
    if (d > dist[r][c]) continue
    
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] === 0) {
        if (d + 1 < dist[nr][nc]) {
          dist[nr][nc] = d + 1
          pq.push([d + 1, nr, nc])
        }
      }
    }
  }
  return -1
}`,
  },
  {
    id: 'dijkstra-010',
    name: 'trapping-rain-water-2d',
    language: 'typescript',
    expectedClass: 'shortest-path-dijkstra',
    difficulty: 'hard',
    description: 'Trapping rain water II (3D) using Dijkstra-like approach',
    code: `function trapRainWater(heightMap: number[][]): number {
  if (!heightMap.length) return 0
  const rows = heightMap.length, cols = heightMap[0].length
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false))
  const pq: [number, number, number][] = []
  
  for (let r = 0; r < rows; r++) {
    pq.push([heightMap[r][0], r, 0])
    pq.push([heightMap[r][cols-1], r, cols-1])
    visited[r][0] = visited[r][cols-1] = true
  }
  for (let c = 1; c < cols - 1; c++) {
    pq.push([heightMap[0][c], 0, c])
    pq.push([heightMap[rows-1][c], rows-1, c])
    visited[0][c] = visited[rows-1][c] = true
  }
  
  let water = 0
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]]
  
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0])
    const [h, r, c] = pq.shift()!
    
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        visited[nr][nc] = true
        water += Math.max(0, h - heightMap[nr][nc])
        pq.push([Math.max(h, heightMap[nr][nc]), nr, nc])
      }
    }
  }
  return water
}`,
  },
]

// =============================================================================
// STRING MATCHING - NAIVE (10 examples)
// =============================================================================

const STRING_MATCH_NAIVE_CASES: BenchmarkCase[] = [
  {
    id: 'strmatch-001',
    name: 'naive-string-search',
    language: 'typescript',
    expectedClass: 'string-match-naive',
    difficulty: 'easy',
    description: 'Basic naive string matching',
    code: `function naiveSearch(text: string, pattern: string): number {
  const n = text.length, m = pattern.length
  for (let i = 0; i <= n - m; i++) {
    let j = 0
    while (j < m && text[i + j] === pattern[j]) {
      j++
    }
    if (j === m) return i
  }
  return -1
}`,
  },
  {
    id: 'strmatch-002',
    name: 'find-all-occurrences',
    language: 'typescript',
    expectedClass: 'string-match-naive',
    difficulty: 'easy',
    description: 'Find all occurrences of pattern',
    code: `function findAllOccurrences(text: string, pattern: string): number[] {
  const result: number[] = []
  const n = text.length, m = pattern.length
  for (let i = 0; i <= n - m; i++) {
    let match = true
    for (let j = 0; j < m; j++) {
      if (text[i + j] !== pattern[j]) {
        match = false
        break
      }
    }
    if (match) result.push(i)
  }
  return result
}`,
  },
  {
    id: 'strmatch-003',
    name: 'strstr-implementation',
    language: 'typescript',
    expectedClass: 'string-match-naive',
    difficulty: 'easy',
    description: 'Implement strStr function',
    code: `function strStr(haystack: string, needle: string): number {
  if (needle.length === 0) return 0
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    if (haystack.substring(i, i + needle.length) === needle) {
      return i
    }
  }
  return -1
}`,
  },
  {
    id: 'strmatch-004',
    name: 'count-pattern',
    language: 'typescript',
    expectedClass: 'string-match-naive',
    difficulty: 'easy',
    description: 'Count non-overlapping occurrences',
    code: `function countPattern(text: string, pattern: string): number {
  let count = 0
  let i = 0
  while (i <= text.length - pattern.length) {
    let match = true
    for (let j = 0; j < pattern.length; j++) {
      if (text[i + j] !== pattern[j]) {
        match = false
        break
      }
    }
    if (match) {
      count++
      i += pattern.length
    } else {
      i++
    }
  }
  return count
}`,
  },
  {
    id: 'strmatch-005',
    name: 'repeated-substring-pattern',
    language: 'typescript',
    expectedClass: 'string-match-naive',
    difficulty: 'medium',
    description: 'Check if string is repeated pattern',
    code: `function repeatedSubstringPattern(s: string): boolean {
  const n = s.length
  for (let len = 1; len <= n / 2; len++) {
    if (n % len !== 0) continue
    const pattern = s.substring(0, len)
    let isRepeated = true
    for (let i = len; i < n; i += len) {
      for (let j = 0; j < len; j++) {
        if (s[i + j] !== pattern[j]) {
          isRepeated = false
          break
        }
      }
      if (!isRepeated) break
    }
    if (isRepeated) return true
  }
  return false
}`,
  },
  {
    id: 'strmatch-006',
    name: 'longest-common-prefix',
    language: 'typescript',
    expectedClass: 'string-match-naive',
    difficulty: 'easy',
    description: 'Longest common prefix of strings',
    code: `function longestCommonPrefix(strs: string[]): string {
  if (strs.length === 0) return ''
  let prefix = strs[0]
  for (let i = 1; i < strs.length; i++) {
    while (strs[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1)
      if (prefix === '') return ''
    }
  }
  return prefix
}`,
  },
  {
    id: 'strmatch-007',
    name: 'substring-with-wildcards',
    language: 'typescript',
    expectedClass: 'string-match-naive',
    difficulty: 'medium',
    description: 'Pattern matching with single-char wildcard',
    code: `function matchWithWildcard(text: string, pattern: string): boolean {
  const n = text.length, m = pattern.length
  for (let i = 0; i <= n - m; i++) {
    let match = true
    for (let j = 0; j < m; j++) {
      if (pattern[j] !== '?' && text[i + j] !== pattern[j]) {
        match = false
        break
      }
    }
    if (match) return true
  }
  return false
}`,
  },
  {
    id: 'strmatch-008',
    name: 'is-subsequence',
    language: 'typescript',
    expectedClass: 'string-match-naive',
    difficulty: 'easy',
    description: 'Check if s is subsequence of t',
    code: `function isSubsequence(s: string, t: string): boolean {
  let si = 0
  for (let ti = 0; ti < t.length && si < s.length; ti++) {
    if (s[si] === t[ti]) si++
  }
  return si === s.length
}`,
  },
  {
    id: 'strmatch-009',
    name: 'rotate-string',
    language: 'typescript',
    expectedClass: 'string-match-naive',
    difficulty: 'medium',
    description: 'Check if one string is rotation of another',
    code: `function rotateString(s: string, goal: string): boolean {
  if (s.length !== goal.length) return false
  const doubled = s + s
  const n = doubled.length, m = goal.length
  for (let i = 0; i <= n - m; i++) {
    let match = true
    for (let j = 0; j < m; j++) {
      if (doubled[i + j] !== goal[j]) {
        match = false
        break
      }
    }
    if (match) return true
  }
  return false
}`,
  },
  {
    id: 'strmatch-010',
    name: 'longest-repeating-substring',
    language: 'typescript',
    expectedClass: 'string-match-naive',
    difficulty: 'hard',
    description: 'Find longest repeating substring',
    code: `function longestRepeatingSubstring(s: string): string {
  let longest = ''
  const n = s.length
  for (let len = 1; len < n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const substr = s.substring(i, i + len)
      for (let j = i + 1; j <= n - len; j++) {
        let match = true
        for (let k = 0; k < len; k++) {
          if (s[j + k] !== substr[k]) {
            match = false
            break
          }
        }
        if (match && len > longest.length) {
          longest = substr
        }
      }
    }
  }
  return longest
}`,
  },
]

// =============================================================================
// STRING MATCHING - KMP (10 examples)
// =============================================================================

const STRING_MATCH_KMP_CASES: BenchmarkCase[] = [
  {
    id: 'kmp-001',
    name: 'kmp-search',
    language: 'typescript',
    expectedClass: 'string-match-kmp',
    difficulty: 'easy',
    description: 'Classic KMP string matching',
    code: `function kmpSearch(text: string, pattern: string): number {
  const n = text.length, m = pattern.length
  if (m === 0) return 0
  
  const lps = computeLPS(pattern)
  let i = 0, j = 0
  
  while (i < n) {
    if (pattern[j] === text[i]) {
      i++
      j++
    }
    if (j === m) return i - j
    else if (i < n && pattern[j] !== text[i]) {
      if (j !== 0) j = lps[j - 1]
      else i++
    }
  }
  return -1
}

function computeLPS(pattern: string): number[] {
  const m = pattern.length
  const lps = new Array(m).fill(0)
  let len = 0, i = 1
  
  while (i < m) {
    if (pattern[i] === pattern[len]) {
      len++
      lps[i] = len
      i++
    } else if (len !== 0) {
      len = lps[len - 1]
    } else {
      lps[i] = 0
      i++
    }
  }
  return lps
}`,
  },
  {
    id: 'kmp-002',
    name: 'kmp-all-occurrences',
    language: 'typescript',
    expectedClass: 'string-match-kmp',
    difficulty: 'medium',
    description: 'Find all occurrences using KMP',
    code: `function kmpFindAll(text: string, pattern: string): number[] {
  const result: number[] = []
  const n = text.length, m = pattern.length
  if (m === 0) return result
  
  const lps = buildLPS(pattern)
  let i = 0, j = 0
  
  while (i < n) {
    if (text[i] === pattern[j]) {
      i++
      j++
    }
    if (j === m) {
      result.push(i - j)
      j = lps[j - 1]
    } else if (i < n && text[i] !== pattern[j]) {
      if (j !== 0) j = lps[j - 1]
      else i++
    }
  }
  return result
}

function buildLPS(p: string): number[] {
  const lps = [0]
  let k = 0
  for (let i = 1; i < p.length; i++) {
    while (k > 0 && p[k] !== p[i]) k = lps[k - 1]
    if (p[k] === p[i]) k++
    lps.push(k)
  }
  return lps
}`,
  },
  {
    id: 'kmp-003',
    name: 'z-algorithm',
    language: 'typescript',
    expectedClass: 'string-match-kmp',
    difficulty: 'hard',
    description: 'Z-algorithm for pattern matching',
    code: `function zSearch(text: string, pattern: string): number[] {
  const concat = pattern + '$' + text
  const z = zFunction(concat)
  const result: number[] = []
  
  for (let i = pattern.length + 1; i < z.length; i++) {
    if (z[i] === pattern.length) {
      result.push(i - pattern.length - 1)
    }
  }
  return result
}

function zFunction(s: string): number[] {
  const n = s.length
  const z = new Array(n).fill(0)
  let l = 0, r = 0
  
  for (let i = 1; i < n; i++) {
    if (i < r) z[i] = Math.min(r - i, z[i - l])
    while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++
    if (i + z[i] > r) { l = i; r = i + z[i] }
  }
  return z
}`,
  },
  {
    id: 'kmp-004',
    name: 'shortest-palindrome',
    language: 'typescript',
    expectedClass: 'string-match-kmp',
    difficulty: 'hard',
    description: 'Shortest palindrome using KMP failure function',
    code: `function shortestPalindrome(s: string): string {
  const rev = s.split('').reverse().join('')
  const concat = s + '#' + rev
  const lps = new Array(concat.length).fill(0)
  
  let len = 0
  for (let i = 1; i < concat.length; i++) {
    while (len > 0 && concat[i] !== concat[len]) len = lps[len - 1]
    if (concat[i] === concat[len]) len++
    lps[i] = len
  }
  
  const add = rev.substring(0, s.length - lps[concat.length - 1])
  return add + s
}`,
  },
  {
    id: 'kmp-005',
    name: 'rabin-karp',
    language: 'typescript',
    expectedClass: 'string-match-kmp',
    difficulty: 'hard',
    description: 'Rabin-Karp rolling hash matching',
    code: `function rabinKarp(text: string, pattern: string): number[] {
  const result: number[] = []
  const n = text.length, m = pattern.length
  if (m > n) return result
  
  const base = 256
  const mod = 101
  let patHash = 0, txtHash = 0, h = 1
  
  for (let i = 0; i < m - 1; i++) h = (h * base) % mod
  for (let i = 0; i < m; i++) {
    patHash = (base * patHash + pattern.charCodeAt(i)) % mod
    txtHash = (base * txtHash + text.charCodeAt(i)) % mod
  }
  
  for (let i = 0; i <= n - m; i++) {
    if (patHash === txtHash) {
      let match = true
      for (let j = 0; j < m; j++) {
        if (text[i + j] !== pattern[j]) { match = false; break }
      }
      if (match) result.push(i)
    }
    if (i < n - m) {
      txtHash = (base * (txtHash - text.charCodeAt(i) * h) + text.charCodeAt(i + m)) % mod
      if (txtHash < 0) txtHash += mod
    }
  }
  return result
}`,
  },
  {
    id: 'kmp-006',
    name: 'longest-happy-prefix',
    language: 'typescript',
    expectedClass: 'string-match-kmp',
    difficulty: 'medium',
    description: 'Longest prefix that is also suffix',
    code: `function longestPrefix(s: string): string {
  const n = s.length
  const lps = new Array(n).fill(0)
  let len = 0
  
  for (let i = 1; i < n; i++) {
    while (len > 0 && s[i] !== s[len]) len = lps[len - 1]
    if (s[i] === s[len]) len++
    lps[i] = len
  }
  
  return s.substring(0, lps[n - 1])
}`,
  },
  {
    id: 'kmp-007',
    name: 'repeated-string-match',
    language: 'typescript',
    expectedClass: 'string-match-kmp',
    difficulty: 'medium',
    description: 'Min repeats of A to contain B',
    code: `function repeatedStringMatch(a: string, b: string): number {
  const lps = buildFailure(b)
  
  let repeats = Math.ceil(b.length / a.length)
  let text = a.repeat(repeats)
  
  for (let tries = 0; tries < 2; tries++) {
    if (kmpContains(text, b, lps)) return repeats
    text += a
    repeats++
  }
  return -1
}

function buildFailure(p: string): number[] {
  const f = [0]
  let k = 0
  for (let i = 1; i < p.length; i++) {
    while (k > 0 && p[k] !== p[i]) k = f[k - 1]
    if (p[k] === p[i]) k++
    f.push(k)
  }
  return f
}

function kmpContains(t: string, p: string, f: number[]): boolean {
  let j = 0
  for (let i = 0; i < t.length; i++) {
    while (j > 0 && p[j] !== t[i]) j = f[j - 1]
    if (p[j] === t[i]) j++
    if (j === p.length) return true
  }
  return false
}`,
  },
  {
    id: 'kmp-008',
    name: 'distinct-echo-substrings',
    language: 'typescript',
    expectedClass: 'string-match-kmp',
    difficulty: 'hard',
    description: 'Count distinct substrings of form a+a',
    code: `function distinctEchoSubstrings(text: string): number {
  const seen = new Set<string>()
  const n = text.length
  
  for (let len = 1; len <= n / 2; len++) {
    for (let i = 0; i + 2 * len <= n; i++) {
      const first = text.substring(i, i + len)
      const second = text.substring(i + len, i + 2 * len)
      if (first === second && !seen.has(first + first)) {
        const concat = first + '$' + second
        const lps = computeFailure(concat)
        if (lps[concat.length - 1] === len) {
          seen.add(first + first)
        }
      }
    }
  }
  return seen.size
}

function computeFailure(s: string): number[] {
  const f = new Array(s.length).fill(0)
  let k = 0
  for (let i = 1; i < s.length; i++) {
    while (k > 0 && s[k] !== s[i]) k = f[k - 1]
    if (s[k] === s[i]) k++
    f[i] = k
  }
  return f
}`,
  },
  {
    id: 'kmp-009',
    name: 'remove-duplicates-sorted',
    language: 'typescript',
    expectedClass: 'string-match-kmp',
    difficulty: 'medium',
    description: 'Remove duplicate patterns using LPS',
    code: `function removeDuplicateLetters(s: string): string {
  const lps = new Array(s.length).fill(0)
  let len = 0
  
  for (let i = 1; i < s.length; i++) {
    while (len > 0 && s[i] !== s[len]) len = lps[len - 1]
    if (s[i] === s[len]) len++
    lps[i] = len
  }
  
  const patternLen = s.length - lps[s.length - 1]
  if (s.length % patternLen === 0) {
    return s.substring(0, patternLen)
  }
  return s
}`,
  },
  {
    id: 'kmp-010',
    name: 'period-of-string',
    language: 'typescript',
    expectedClass: 'string-match-kmp',
    difficulty: 'medium',
    description: 'Find smallest period of string using failure function',
    code: `function findPeriod(s: string): number {
  const n = s.length
  const failure = new Array(n).fill(0)
  let k = 0
  
  for (let i = 1; i < n; i++) {
    while (k > 0 && s[k] !== s[i]) k = failure[k - 1]
    if (s[k] === s[i]) k++
    failure[i] = k
  }
  
  const longestBorder = failure[n - 1]
  const period = n - longestBorder
  
  if (n % period === 0) return period
  return n
}`,
  },
]

// =============================================================================
// MATRIX MULTIPLICATION (10 examples)
// =============================================================================

const MATRIX_MULTIPLY_CASES: BenchmarkCase[] = [
  {
    id: 'matrix-001',
    name: 'matrix-multiply-basic',
    language: 'typescript',
    expectedClass: 'matrix-multiply',
    difficulty: 'easy',
    description: 'Basic O(n³) matrix multiplication',
    code: `function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const n = A.length, m = B[0].length, k = B.length
  const C = Array.from({ length: n }, () => new Array(m).fill(0))
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      for (let p = 0; p < k; p++) {
        C[i][j] += A[i][p] * B[p][j]
      }
    }
  }
  return C
}`,
  },
  {
    id: 'matrix-002',
    name: 'matrix-vector-multiply',
    language: 'typescript',
    expectedClass: 'matrix-multiply',
    difficulty: 'easy',
    description: 'Matrix-vector multiplication',
    code: `function matrixVectorMultiply(A: number[][], v: number[]): number[] {
  const n = A.length
  const result = new Array(n).fill(0)
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < v.length; j++) {
      result[i] += A[i][j] * v[j]
    }
  }
  return result
}`,
  },
  {
    id: 'matrix-003',
    name: 'matrix-power',
    language: 'typescript',
    expectedClass: 'matrix-multiply',
    difficulty: 'medium',
    description: 'Matrix exponentiation',
    code: `function matrixPower(M: number[][], p: number): number[][] {
  const n = M.length
  let result = Array.from({ length: n }, (_, i) => 
    Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
  )
  let base = M.map(row => [...row])
  
  while (p > 0) {
    if (p & 1) result = multiply(result, base)
    base = multiply(base, base)
    p >>= 1
  }
  return result
}

function multiply(A: number[][], B: number[][]): number[][] {
  const n = A.length
  const C = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        C[i][j] += A[i][k] * B[k][j]
      }
    }
  }
  return C
}`,
  },
  {
    id: 'matrix-004',
    name: 'strassen-multiply',
    language: 'typescript',
    expectedClass: 'matrix-multiply',
    difficulty: 'hard',
    description: 'Strassen matrix multiplication O(n^2.807)',
    code: `function strassenMultiply(A: number[][], B: number[][]): number[][] {
  const n = A.length
  if (n <= 64) return naiveMultiply(A, B)
  
  const mid = n / 2
  const [A11, A12, A21, A22] = splitMatrix(A)
  const [B11, B12, B21, B22] = splitMatrix(B)
  
  const M1 = strassenMultiply(addMatrix(A11, A22), addMatrix(B11, B22))
  const M2 = strassenMultiply(addMatrix(A21, A22), B11)
  const M3 = strassenMultiply(A11, subMatrix(B12, B22))
  const M4 = strassenMultiply(A22, subMatrix(B21, B11))
  const M5 = strassenMultiply(addMatrix(A11, A12), B22)
  const M6 = strassenMultiply(subMatrix(A21, A11), addMatrix(B11, B12))
  const M7 = strassenMultiply(subMatrix(A12, A22), addMatrix(B21, B22))
  
  const C11 = addMatrix(subMatrix(addMatrix(M1, M4), M5), M7)
  const C12 = addMatrix(M3, M5)
  const C21 = addMatrix(M2, M4)
  const C22 = addMatrix(subMatrix(addMatrix(M1, M3), M2), M6)
  
  return combineMatrix(C11, C12, C21, C22)
}

function naiveMultiply(A: number[][], B: number[][]): number[][] {
  const n = A.length
  const C = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++)
        C[i][j] += A[i][k] * B[k][j]
  return C
}

function splitMatrix(M: number[][]): number[][][] {
  const n = M.length, mid = n / 2
  const a = [], b = [], c = [], d = []
  for (let i = 0; i < mid; i++) {
    a.push(M[i].slice(0, mid)); b.push(M[i].slice(mid))
    c.push(M[i + mid].slice(0, mid)); d.push(M[i + mid].slice(mid))
  }
  return [a, b, c, d]
}

function addMatrix(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v + B[i][j]))
}

function subMatrix(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v - B[i][j]))
}

function combineMatrix(A: number[][], B: number[][], C: number[][], D: number[][]): number[][] {
  const n = A.length * 2, mid = n / 2
  const result = Array.from({ length: n }, () => new Array(n))
  for (let i = 0; i < mid; i++) {
    for (let j = 0; j < mid; j++) {
      result[i][j] = A[i][j]; result[i][j + mid] = B[i][j]
      result[i + mid][j] = C[i][j]; result[i + mid][j + mid] = D[i][j]
    }
  }
  return result
}`,
  },
  {
    id: 'matrix-005',
    name: 'matrix-chain-order',
    language: 'typescript',
    expectedClass: 'matrix-multiply',
    difficulty: 'hard',
    description: 'Optimal matrix chain multiplication order',
    code: `function matrixChainOrder(dims: number[]): number {
  const n = dims.length - 1
  const dp = Array.from({ length: n }, () => new Array(n).fill(0))
  
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i < n - len + 1; i++) {
      const j = i + len - 1
      dp[i][j] = Infinity
      for (let k = i; k < j; k++) {
        const cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]
        dp[i][j] = Math.min(dp[i][j], cost)
      }
    }
  }
  return dp[0][n - 1]
}`,
  },
  {
    id: 'matrix-006',
    name: 'transpose-multiply',
    language: 'typescript',
    expectedClass: 'matrix-multiply',
    difficulty: 'medium',
    description: 'Multiply matrix by its transpose',
    code: `function multiplyByTranspose(A: number[][]): number[][] {
  const n = A.length, m = A[0].length
  const C = Array.from({ length: n }, () => new Array(n).fill(0))
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < m; k++) {
        C[i][j] += A[i][k] * A[j][k]
      }
    }
  }
  return C
}`,
  },
  {
    id: 'matrix-007',
    name: 'sparse-matrix-multiply',
    language: 'typescript',
    expectedClass: 'matrix-multiply',
    difficulty: 'medium',
    description: 'Sparse matrix multiplication',
    code: `function multiplySparse(A: number[][], B: number[][]): number[][] {
  const m = A.length, k = A[0].length, n = B[0].length
  const C = Array.from({ length: m }, () => new Array(n).fill(0))
  
  for (let i = 0; i < m; i++) {
    for (let p = 0; p < k; p++) {
      if (A[i][p] !== 0) {
        for (let j = 0; j < n; j++) {
          if (B[p][j] !== 0) {
            C[i][j] += A[i][p] * B[p][j]
          }
        }
      }
    }
  }
  return C
}`,
  },
  {
    id: 'matrix-008',
    name: 'block-matrix-multiply',
    language: 'typescript',
    expectedClass: 'matrix-multiply',
    difficulty: 'hard',
    description: 'Cache-friendly block matrix multiplication',
    code: `function blockMatrixMultiply(A: number[][], B: number[][], blockSize = 64): number[][] {
  const n = A.length
  const C = Array.from({ length: n }, () => new Array(n).fill(0))
  
  for (let i = 0; i < n; i += blockSize) {
    for (let j = 0; j < n; j += blockSize) {
      for (let k = 0; k < n; k += blockSize) {
        const iEnd = Math.min(i + blockSize, n)
        const jEnd = Math.min(j + blockSize, n)
        const kEnd = Math.min(k + blockSize, n)
        
        for (let ii = i; ii < iEnd; ii++) {
          for (let kk = k; kk < kEnd; kk++) {
            const aVal = A[ii][kk]
            for (let jj = j; jj < jEnd; jj++) {
              C[ii][jj] += aVal * B[kk][jj]
            }
          }
        }
      }
    }
  }
  return C
}`,
  },
  {
    id: 'matrix-009',
    name: 'dot-product',
    language: 'typescript',
    expectedClass: 'matrix-multiply',
    difficulty: 'easy',
    description: 'Dot product of two vectors',
    code: `function dotProduct(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i]
  }
  return sum
}`,
  },
  {
    id: 'matrix-010',
    name: 'outer-product',
    language: 'typescript',
    expectedClass: 'matrix-multiply',
    difficulty: 'easy',
    description: 'Outer product of two vectors',
    code: `function outerProduct(a: number[], b: number[]): number[][] {
  const m = a.length, n = b.length
  const C = Array.from({ length: m }, () => new Array(n))
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      C[i][j] = a[i] * b[j]
    }
  }
  return C
}`,
  },
]

// =============================================================================
// MEDIAN FINDING / SELECTION (10 examples)
// =============================================================================

const MEDIAN_FINDING_CASES: BenchmarkCase[] = [
  {
    id: 'median-001',
    name: 'quickselect',
    language: 'typescript',
    expectedClass: 'median-finding',
    difficulty: 'medium',
    description: 'Quickselect algorithm for kth element',
    code: `function quickselect(arr: number[], k: number): number {
  return select(arr, 0, arr.length - 1, k)
}

function select(arr: number[], left: number, right: number, k: number): number {
  if (left === right) return arr[left]
  
  let pivotIdx = partition(arr, left, right)
  
  if (k === pivotIdx) return arr[k]
  if (k < pivotIdx) return select(arr, left, pivotIdx - 1, k)
  return select(arr, pivotIdx + 1, right, k)
}

function partition(arr: number[], left: number, right: number): number {
  const pivot = arr[right]
  let i = left
  for (let j = left; j < right; j++) {
    if (arr[j] < pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]]
      i++
    }
  }
  [arr[i], arr[right]] = [arr[right], arr[i]]
  return i
}`,
  },
  {
    id: 'median-002',
    name: 'find-median',
    language: 'typescript',
    expectedClass: 'median-finding',
    difficulty: 'easy',
    description: 'Find median of array',
    code: `function findMedian(arr: number[]): number {
  const n = arr.length
  const mid = Math.floor(n / 2)
  
  const kth = quickSelect(arr.slice(), mid)
  
  if (n % 2 === 1) return kth
  const kth2 = quickSelect(arr.slice(), mid - 1)
  return (kth + kth2) / 2
}

function quickSelect(arr: number[], k: number): number {
  let left = 0, right = arr.length - 1
  while (left < right) {
    const pivot = arr[right]
    let i = left
    for (let j = left; j < right; j++) {
      if (arr[j] < pivot) {
        [arr[i], arr[j]] = [arr[j], arr[i]]
        i++
      }
    }
    [arr[i], arr[right]] = [arr[right], arr[i]]
    if (i === k) return arr[i]
    if (i < k) left = i + 1
    else right = i - 1
  }
  return arr[left]
}`,
  },
  {
    id: 'median-003',
    name: 'kth-largest',
    language: 'typescript',
    expectedClass: 'median-finding',
    difficulty: 'easy',
    description: 'Find kth largest element',
    code: `function findKthLargest(nums: number[], k: number): number {
  return quickSelect(nums, 0, nums.length - 1, nums.length - k)
}

function quickSelect(arr: number[], lo: number, hi: number, k: number): number {
  const pivot = arr[hi]
  let i = lo
  for (let j = lo; j < hi; j++) {
    if (arr[j] <= pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]]
      i++
    }
  }
  [arr[i], arr[hi]] = [arr[hi], arr[i]]
  
  if (i === k) return arr[i]
  if (i < k) return quickSelect(arr, i + 1, hi, k)
  return quickSelect(arr, lo, i - 1, k)
}`,
  },
  {
    id: 'median-004',
    name: 'median-of-medians',
    language: 'typescript',
    expectedClass: 'median-finding',
    difficulty: 'hard',
    description: 'Median of medians (worst-case O(n))',
    code: `function medianOfMedians(arr: number[], k: number): number {
  if (arr.length <= 5) {
    arr.sort((a, b) => a - b)
    return arr[k]
  }
  
  const medians: number[] = []
  for (let i = 0; i < arr.length; i += 5) {
    const group = arr.slice(i, Math.min(i + 5, arr.length))
    group.sort((a, b) => a - b)
    medians.push(group[Math.floor(group.length / 2)])
  }
  
  const pivot = medianOfMedians(medians, Math.floor(medians.length / 2))
  
  const lows: number[] = [], highs: number[] = [], pivots: number[] = []
  for (const x of arr) {
    if (x < pivot) lows.push(x)
    else if (x > pivot) highs.push(x)
    else pivots.push(x)
  }
  
  if (k < lows.length) return medianOfMedians(lows, k)
  if (k < lows.length + pivots.length) return pivot
  return medianOfMedians(highs, k - lows.length - pivots.length)
}`,
  },
  {
    id: 'median-005',
    name: 'kth-smallest',
    language: 'typescript',
    expectedClass: 'median-finding',
    difficulty: 'easy',
    description: 'Find kth smallest element',
    code: `function kthSmallest(arr: number[], k: number): number {
  return partition(arr.slice(), 0, arr.length - 1, k - 1)
}

function partition(arr: number[], lo: number, hi: number, k: number): number {
  if (lo === hi) return arr[lo]
  
  const pivot = arr[lo + Math.floor(Math.random() * (hi - lo + 1))]
  let i = lo, j = hi
  
  while (i <= j) {
    while (arr[i] < pivot) i++
    while (arr[j] > pivot) j--
    if (i <= j) {
      [arr[i], arr[j]] = [arr[j], arr[i]]
      i++
      j--
    }
  }
  
  if (k <= j) return partition(arr, lo, j, k)
  if (k >= i) return partition(arr, i, hi, k)
  return arr[k]
}`,
  },
  {
    id: 'median-006',
    name: 'top-k-frequent',
    language: 'typescript',
    expectedClass: 'median-finding',
    difficulty: 'medium',
    description: 'Top K frequent elements using quickselect',
    code: `function topKFrequent(nums: number[], k: number): number[] {
  const freq = new Map<number, number>()
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1)
  
  const unique = Array.from(freq.keys())
  const n = unique.length
  
  quickSelect(unique, 0, n - 1, n - k, freq)
  return unique.slice(n - k)
}

function quickSelect(arr: number[], lo: number, hi: number, k: number, freq: Map<number, number>): void {
  if (lo >= hi) return
  
  const pivot = freq.get(arr[hi])!
  let i = lo
  for (let j = lo; j < hi; j++) {
    if (freq.get(arr[j])! < pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]]
      i++
    }
  }
  [arr[i], arr[hi]] = [arr[hi], arr[i]]
  
  if (i === k) return
  if (i < k) quickSelect(arr, i + 1, hi, k, freq)
  else quickSelect(arr, lo, i - 1, k, freq)
}`,
  },
  {
    id: 'median-007',
    name: 'wiggle-sort',
    language: 'typescript',
    expectedClass: 'median-finding',
    difficulty: 'hard',
    description: 'Wiggle sort using median finding',
    code: `function wiggleSort(nums: number[]): void {
  const n = nums.length
  const median = findMedian(nums.slice())
  
  const newIndex = (i: number) => (1 + 2 * i) % (n | 1)
  
  let i = 0, j = 0, k = n - 1
  while (j <= k) {
    if (nums[newIndex(j)] > median) {
      [nums[newIndex(i)], nums[newIndex(j)]] = [nums[newIndex(j)], nums[newIndex(i)]]
      i++
      j++
    } else if (nums[newIndex(j)] < median) {
      [nums[newIndex(j)], nums[newIndex(k)]] = [nums[newIndex(k)], nums[newIndex(j)]]
      k--
    } else {
      j++
    }
  }
}

function findMedian(arr: number[]): number {
  const mid = Math.floor(arr.length / 2)
  return quickSelectValue(arr, mid)
}

function quickSelectValue(arr: number[], k: number): number {
  let lo = 0, hi = arr.length - 1
  while (lo < hi) {
    const pi = partition(arr, lo, hi)
    if (pi === k) return arr[k]
    if (pi < k) lo = pi + 1
    else hi = pi - 1
  }
  return arr[lo]
}

function partition(arr: number[], lo: number, hi: number): number {
  const pivot = arr[hi]
  let i = lo
  for (let j = lo; j < hi; j++) {
    if (arr[j] < pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]]
      i++
    }
  }
  [arr[i], arr[hi]] = [arr[hi], arr[i]]
  return i
}`,
  },
  {
    id: 'median-008',
    name: 'kth-largest-stream',
    language: 'typescript',
    expectedClass: 'median-finding',
    difficulty: 'medium',
    description: 'Kth largest in stream using selection',
    code: `class KthLargest {
  private k: number
  private nums: number[]

  constructor(k: number, nums: number[]) {
    this.k = k
    this.nums = nums.slice()
  }

  add(val: number): number {
    this.nums.push(val)
    return this.findKthLargest(this.nums.slice(), this.k)
  }

  private findKthLargest(arr: number[], k: number): number {
    return this.quickSelect(arr, 0, arr.length - 1, arr.length - k)
  }

  private quickSelect(arr: number[], lo: number, hi: number, k: number): number {
    const pivot = arr[hi]
    let i = lo
    for (let j = lo; j < hi; j++) {
      if (arr[j] <= pivot) {
        [arr[i], arr[j]] = [arr[j], arr[i]]
        i++
      }
    }
    [arr[i], arr[hi]] = [arr[hi], arr[i]]
    if (i === k) return arr[i]
    if (i < k) return this.quickSelect(arr, i + 1, hi, k)
    return this.quickSelect(arr, lo, i - 1, k)
  }
}`,
  },
  {
    id: 'median-009',
    name: 'smallest-range',
    language: 'typescript',
    expectedClass: 'median-finding',
    difficulty: 'hard',
    description: 'Find k closest elements to target',
    code: `function findClosestElements(arr: number[], k: number, x: number): number[] {
  const diffs = arr.map((v, i) => ({ idx: i, diff: Math.abs(v - x), val: v }))
  
  const kth = quickSelectK(diffs, k)
  
  const result = diffs
    .filter(d => d.diff <= kth || (d.diff === kth))
    .slice(0, k)
    .map(d => d.val)
    .sort((a, b) => a - b)
  
  return result
}

function quickSelectK(arr: { idx: number; diff: number; val: number }[], k: number): number {
  let lo = 0, hi = arr.length - 1
  while (lo < hi) {
    const pivot = arr[hi].diff
    let i = lo
    for (let j = lo; j < hi; j++) {
      if (arr[j].diff < pivot) {
        [arr[i], arr[j]] = [arr[j], arr[i]]
        i++
      }
    }
    [arr[i], arr[hi]] = [arr[hi], arr[i]]
    if (i === k - 1) return arr[i].diff
    if (i < k - 1) lo = i + 1
    else hi = i - 1
  }
  return arr[lo].diff
}`,
  },
  {
    id: 'median-010',
    name: 'percentile',
    language: 'typescript',
    expectedClass: 'median-finding',
    difficulty: 'easy',
    description: 'Calculate percentile using selection',
    code: `function percentile(arr: number[], p: number): number {
  if (arr.length === 0) throw new Error('Empty array')
  const k = Math.ceil((p / 100) * arr.length) - 1
  return quickSelect(arr.slice(), Math.max(0, k))
}

function quickSelect(arr: number[], k: number): number {
  let lo = 0, hi = arr.length - 1
  while (lo <= hi) {
    const pivot = arr[hi]
    let i = lo
    for (let j = lo; j < hi; j++) {
      if (arr[j] < pivot) {
        [arr[i], arr[j]] = [arr[j], arr[i]]
        i++
      }
    }
    [arr[i], arr[hi]] = [arr[hi], arr[i]]
    
    if (i === k) return arr[i]
    if (i < k) lo = i + 1
    else hi = i - 1
  }
  return arr[lo]
}`,
  },
]

// =============================================================================
// EXPORT COMPLETE BENCHMARK
// =============================================================================

export const CLASSIFICATION_BENCHMARK: BenchmarkCase[] = [
  ...COMPARISON_SORT_CASES,
  ...BINARY_SEARCH_CASES,
  ...LINEAR_SEARCH_CASES,
  ...GRAPH_BFS_CASES,
  ...GRAPH_DFS_CASES,
  ...DIJKSTRA_CASES,
  ...STRING_MATCH_NAIVE_CASES,
  ...STRING_MATCH_KMP_CASES,
  ...MATRIX_MULTIPLY_CASES,
  ...MEDIAN_FINDING_CASES,
]

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get benchmark cases by problem class
 */
export function getCasesByClass(problemClass: ProblemClass): BenchmarkCase[] {
  return CLASSIFICATION_BENCHMARK.filter((c) => c.expectedClass === problemClass)
}

/**
 * Get benchmark cases by difficulty
 */
export function getCasesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): BenchmarkCase[] {
  return CLASSIFICATION_BENCHMARK.filter((c) => c.difficulty === difficulty)
}

/**
 * Get summary statistics for the benchmark
 */
export function getBenchmarkStats(): {
  total: number
  byClass: Record<ProblemClass, number>
  byDifficulty: Record<string, number>
} {
  const byClass: Record<string, number> = {}
  const byDifficulty: Record<string, number> = { easy: 0, medium: 0, hard: 0 }

  for (const c of CLASSIFICATION_BENCHMARK) {
    byClass[c.expectedClass] = (byClass[c.expectedClass] || 0) + 1
    byDifficulty[c.difficulty]++
  }

  return {
    total: CLASSIFICATION_BENCHMARK.length,
    byClass: byClass as Record<ProblemClass, number>,
    byDifficulty,
  }
}
