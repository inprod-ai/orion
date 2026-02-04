import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { AnalysisResult } from '@/types/analysis'

// Create styles
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 40,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  gradeText: {
    fontSize: 16,
    color: '#666666',
  },
  finding: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  findingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1a1a1a',
  },
  findingText: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 3,
  },
  findingMeta: {
    flexDirection: 'row',
    marginTop: 8,
  },
  findingBadge: {
    fontSize: 10,
    color: '#666666',
    marginRight: 15,
  },
  category: {
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  categoryScore: {
    fontSize: 12,
    color: '#666666',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
  },
})

export default function PDFReport({ result }: { result: AnalysisResult }) {
  const getScoreGrade = (score: number): string => {
    if (score >= 90) return 'A+'
    if (score >= 85) return 'A'
    if (score >= 80) return 'A-'
    if (score >= 75) return 'B+'
    if (score >= 70) return 'B'
    if (score >= 65) return 'B-'
    if (score >= 60) return 'C+'
    if (score >= 55) return 'C'
    if (score >= 50) return 'C-'
    if (score >= 40) return 'D'
    return 'F'
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Release Readiness Report</Text>
          <Text style={styles.subtitle}>{result.repo}</Text>
          <Text style={styles.subtitle}>{new Date(result.timestamp).toLocaleDateString()}</Text>
        </View>

        <View style={styles.scoreContainer}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreText}>{Math.round(result.overallScore)}</Text>
          </View>
          <View>
            <Text style={styles.gradeText}>Grade: {getScoreGrade(result.overallScore)}</Text>
            <Text style={styles.gradeText}>Confidence: {result.confidence.level}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Scores</Text>
          {result.categories.map((category, i) => (
            <View key={i} style={styles.category}>
              <Text style={styles.categoryName}>{category.displayName}</Text>
              <Text style={styles.categoryScore}>
                Score: {category.score}/{category.maxScore} ({Math.round((category.score / category.maxScore) * 100)}%)
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Findings</Text>
          {result.findings.slice(0, 10).map((finding, i) => (
            <View key={i} style={styles.finding}>
              <Text style={styles.findingTitle}>{finding.title}</Text>
              <Text style={styles.findingText}>{finding.description}</Text>
              <Text style={styles.findingText}>Fix: {finding.fix}</Text>
              <View style={styles.findingMeta}>
                <Text style={styles.findingBadge}>+{finding.points} points</Text>
                <Text style={styles.findingBadge}>{finding.severity} priority</Text>
                <Text style={styles.findingBadge}>{finding.estimatedTime}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.findingText}>Strengths:</Text>
            {result.summary.strengths.map((strength, i) => (
              <Text key={i} style={styles.findingText}>• {strength}</Text>
            ))}
          </View>
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.findingText}>Areas to Improve:</Text>
            {result.summary.weaknesses.map((weakness, i) => (
              <Text key={i} style={styles.findingText}>• {weakness}</Text>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          Generated by Orion - Release Readiness Analysis
        </Text>
      </Page>
    </Document>
  )
}
