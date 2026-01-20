import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getSession } from '@/lib/github-auth'
import { prisma } from '@/lib/prisma'
import PDFReport from '@/components/PDFReport'
import type { AnalysisResult } from '@/types/analysis'

export async function POST(request: NextRequest) {
  try {
    // Validate request size
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 512) { // 512 bytes limit
      return new NextResponse('Request too large', { status: 413 })
    }

    const session = await getSession()
    
    if (!session?.userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    
    // Check if user is Pro
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tier: true }
    })
    
    if (!user || user.tier !== 'PRO') {
      return new NextResponse('PDF export is a Pro feature', { status: 403 })
    }
    
    const body = await request.json()
    
    // Validate input - require scanId
    if (!body.scanId || typeof body.scanId !== 'string') {
      return new NextResponse('Invalid scanId', { status: 400 })
    }

    const { scanId } = body
    
    // Fetch scan data - ONLY scans belonging to the authenticated user
    const scan = await prisma.scan.findFirst({
      where: { 
        id: scanId,
        userId: session.userId // CRITICAL: Only allow user's own scans
      },
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
      return new NextResponse('Scan not found or access denied', { status: 404 })
    }
    
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
    
    // Return PDF as response with sanitized filename
    const sanitizedFilename = scan.repo.replace(/[^a-zA-Z0-9_-]/g, '_')
    return new Response(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizedFilename}-analysis.pdf"`,
      },
    })
  } catch (error) {
    const sanitizedMessage = process.env.NODE_ENV === 'production'
      ? 'Failed to generate PDF'
      : error instanceof Error ? error.message : 'Failed to generate PDF'
      
    console.error('PDF export error:', {
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
      userId: 'masked'
    })
    
    return new NextResponse(sanitizedMessage, { status: 500 })
  }
}
