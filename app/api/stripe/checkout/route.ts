import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/github-auth'
import { stripe, PRICE_ID } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session?.userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, stripeCustomerId: true }
    })
    
    if (!user?.email) {
      return new NextResponse('User not found', { status: 404 })
    }
    
    // Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId
    
    if (!stripeCustomerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id
        }
      })
      
      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id }
      })
      
      stripeCustomerId = customer.id
    }
    
    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/?upgraded=true`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/upgrade`,
      metadata: {
        userId: user.id,
      },
    })
    
    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return new NextResponse('Failed to create checkout session', { status: 500 })
  }
}
