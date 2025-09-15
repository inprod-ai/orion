import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PDFReport from '@/components/PDFReport'
import type { AnalysisResult } from '@/types/analysis'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    
    // Check if user is Pro
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true }
    })
    
    if (!user || user.tier !== 'PRO') {
      return new NextResponse('PDF export is a Pro feature', { status: 403 })
    }
    
    const { scanId } = await request.json()
    
    // Fetch scan data
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      select: {
        repoUrl: true,
        owner: true,
        repo: true,
        overallScore: true,
        confidence: true,
        categories: true,
        findings: true,
        summary: true,
        createdAt: true,
      }
    })
    
    if (!scan) {
      return new NextResponse('Scan not found', { status: 404 })
    }
    
    // Ensure the scan belongs to the user or handle accordingly
    // For now, we'll allow any Pro user to export any scan
    
    // Convert Prisma data to AnalysisResult format
    const result: AnalysisResult = {
      repoUrl: scan.repoUrl,
      owner: scan.owner,
      repo: scan.repo,
      overallScore: scan.overallScore,
      timestamp: scan.createdAt,
      confidence: scan.confidence as any,
      categories: scan.categories as any,
      findings: scan.findings as any,
      summary: scan.summary as any,
    }
    
    // Generate PDF
    const pdfBuffer = await renderToBuffer(PDFReport({ result }))
    
    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${scan.repo}-analysis.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF export error:', error)
    return new NextResponse('Failed to generate PDF', { status: 500 })
  }
}
