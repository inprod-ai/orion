// =============================================================================
// CLASSIFIER TESTS
// =============================================================================
// Tests for problem classification - heuristic and pattern detection

import { describe, it, expect } from 'vitest'
import {
  detectCodePatterns,
  heuristicClassify,
  getClassLabel,
} from '@/lib/inprod/efficiency/classifier'
import type { CodePatterns } from '@/lib/inprod/efficiency/types'

describe('detectCodePatterns', () => {
  it('should detect comparison patterns', () => {
    const code = `
      function sort(arr) {
        if (arr[i] < arr[j]) {
          swap(arr, i, j)
        }
      }
    `
    const patterns = detectCodePatterns(code)
    expect(patterns.hasComparisons).toBe(true)
  })

  it('should detect graph adjacency patterns', () => {
    const code = `
      function bfs(graph) {
        for (const neighbor of graph[node].edges) {
          if (!visited.has(neighbor)) {
            adjacencyList.push(neighbor)
          }
        }
      }
    `
    const patterns = detectCodePatterns(code)
    expect(patterns.hasGraphStructure).toBe(true)
  })

  it('should detect hash/map access patterns', () => {
    const code = `
      function findDuplicate(arr) {
        const seen = new Map()
        for (const item of arr) {
          if (hashMap.get(item)) {
            return item
          }
          seen.set(item, true)
        }
      }
    `
    const patterns = detectCodePatterns(code)
    expect(patterns.hasHashAccess).toBe(true)
  })

  it('should detect loop patterns', () => {
    const code = `
      function bubbleSort(arr) {
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (arr[i] > arr[j]) swap(i, j)
          }
        }
      }
    `
    const patterns = detectCodePatterns(code)
    expect(patterns.hasLoops).toBe(true)
  })

  it('should detect recursive patterns', () => {
    const code = `
      function factorial(n) {
        if (n <= 1) return 1
        return n * factorial(n - 1)
      }
    `
    const patterns = detectCodePatterns(code)
    expect(patterns.hasRecursion).toBe(true)
  })

  it('should detect queue operations (BFS pattern)', () => {
    const code = `
      function bfs(graph, start) {
        const queue = [start]
        while (queue.length > 0) {
          const node = queue.shift()
          neighbors.forEach(n => queue.push(n))
        }
      }
    `
    const patterns = detectCodePatterns(code)
    expect(patterns.hasQueueOperations).toBe(true)
  })

  it('should detect stack operations (DFS pattern)', () => {
    const code = `
      function dfs(graph, start) {
        const stack = [start]
        while (stack.length > 0) {
          const node = stack.pop()
          neighbors.forEach(n => stack.push(n))
        }
      }
    `
    const patterns = detectCodePatterns(code)
    expect(patterns.hasStackOperations).toBe(true)
  })

  it('should detect array swap patterns', () => {
    const code = `
      function sort(arr) {
        [arr[i], arr[j]] = [arr[j], arr[i]]
      }
    `
    const patterns = detectCodePatterns(code)
    expect(patterns.hasArraySwaps).toBe(true)
  })
})

describe('heuristicClassify', () => {
  it('should classify BFS with graph structure and queue ops', () => {
    const code = `
      function bfs(graph, start) {
        const queue = [start]
        while (queue.length > 0) {
          const node = queue.shift()
          for (const neighbor of graph.adjacencyList[node]) {
            queue.push(neighbor)
          }
        }
      }
    `
    const patterns = detectCodePatterns(code)
    const result = heuristicClassify(code, patterns)
    expect(result).toBe('graph-bfs')
  })

  it('should classify DFS with graph structure and recursion', () => {
    const code = `
      function dfs(graph, node, visited) {
        if (visited.has(node)) return
        visited.add(node)
        for (const neighbor of graph.adjacencyList[node]) {
          dfs(graph, neighbor, visited)
        }
      }
    `
    const patterns = detectCodePatterns(code)
    const result = heuristicClassify(code, patterns)
    expect(result).toBe('graph-dfs')
  })

  it('should classify linear search', () => {
    const code = `
      function search(arr, target) {
        for (let i = 0; i < arr.length; i++) {
          if (arr[i] === target) return i
        }
        return -1
      }
    `
    const patterns = detectCodePatterns(code)
    const result = heuristicClassify(code, patterns)
    expect(result).toBe('linear-search')
  })

  it('should classify string matching', () => {
    const code = `
      function findPattern(text, pattern) {
        return text.indexOf(pattern)
      }
    `
    const patterns = detectCodePatterns(code)
    const result = heuristicClassify(code, patterns)
    expect(result).toBe('string-match-naive')
  })

  it('should return null for ambiguous code', () => {
    const code = `
      function mystery(x) {
        return x + 1
      }
    `
    const patterns = detectCodePatterns(code)
    const result = heuristicClassify(code, patterns)
    expect(result).toBeNull()
  })

  it('should classify binary search pattern', () => {
    const code = `
      function binarySearch(arr, target) {
        let left = 0
        let right = arr.length - 1
        while (left <= right) {
          const mid = Math.floor((left + right) / 2)
          if (arr[mid] === target) return mid
          if (arr[mid] < target) left = mid + 1
          else right = mid - 1
        }
        return -1
      }
    `
    const patterns = detectCodePatterns(code)
    const result = heuristicClassify(code, patterns)
    expect(result).toBe('binary-search')
  })

  it('should classify comparison sort with explicit sort keyword', () => {
    // Sort algorithm using bubble sort technique
    const code = `
      function sort(arr) {
        for (let i = 0; i < arr.length; i++) {
          for (let j = 0; j < arr.length - 1; j++) {
            if (arr[j] > arr[j + 1]) {
              swap(arr, j, j + 1)
            }
          }
        }
        return arr
      }
    `
    const patterns = detectCodePatterns(code)
    const result = heuristicClassify(code, patterns)
    expect(result).toBe('comparison-sort')
  })

  it('should classify median finding', () => {
    const code = `
      function quickselect(arr, k) {
        const pivot = arr[0]
        const left = arr.filter(x => x < pivot)
        if (left.length === k) return partition(arr)
        return select(arr, k)
      }
    `
    const patterns = detectCodePatterns(code)
    const result = heuristicClassify(code, patterns)
    expect(result).toBe('median-finding')
  })
})

describe('getClassLabel', () => {
  it('should return human-readable labels for all classes', () => {
    expect(getClassLabel('comparison-sort')).toBe('Comparison-Based Sort')
    expect(getClassLabel('binary-search')).toBe('Binary Search')
    expect(getClassLabel('linear-search')).toBe('Linear Search')
    expect(getClassLabel('hash-lookup')).toBe('Hash Table Lookup')
    expect(getClassLabel('graph-bfs')).toBe('Breadth-First Search')
    expect(getClassLabel('graph-dfs')).toBe('Depth-First Search')
    expect(getClassLabel('shortest-path-dijkstra')).toBe('Dijkstra Shortest Path')
    expect(getClassLabel('string-match-naive')).toBe('Naive String Matching')
    expect(getClassLabel('string-match-kmp')).toBe('KMP String Matching')
    expect(getClassLabel('matrix-multiply')).toBe('Matrix Multiplication')
    expect(getClassLabel('tree-traversal')).toBe('Tree Traversal')
    expect(getClassLabel('median-finding')).toBe('Median/Selection')
    expect(getClassLabel('unknown')).toBe('Unknown Problem Class')
  })
})

describe('edge cases and robustness', () => {
  it('should handle empty code', () => {
    const patterns = detectCodePatterns('')
    expect(patterns.hasComparisons).toBe(false)
    expect(patterns.hasLoops).toBe(false)
  })

  it('should handle minified code', () => {
    const code = 'function a(b){for(var c=0;c<b.length;c++)if(b[c]>b[c+1])return false;return true}'
    const patterns = detectCodePatterns(code)
    expect(patterns.hasComparisons).toBe(true)
    expect(patterns.hasLoops).toBe(true)
  })

  it('should handle code with syntax errors gracefully', () => {
    const code = 'function broken( { for for if'
    expect(() => detectCodePatterns(code)).not.toThrow()
  })

  it('should handle unicode characters', () => {
    const code = `
      function 計算(配列) {
        for (const 要素 of 配列) {
          if (要素 > 0) return true
        }
        return false
      }
    `
    const patterns = detectCodePatterns(code)
    expect(patterns.hasComparisons).toBe(true)
    expect(patterns.hasLoops).toBe(true)
  })

  it('should handle very long code', () => {
    const longCode = 'function f() {\n' + '  x = 1;\n'.repeat(10000) + '}'
    expect(() => detectCodePatterns(longCode)).not.toThrow()
  })
})
