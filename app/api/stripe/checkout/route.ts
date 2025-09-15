import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { stripe, PRICE_ID } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    
    // Get or create Stripe customer
    let stripeCustomerId = (session.user as any).stripeCustomerId
    
    if (!stripeCustomerId) {
      // Check if user exists in database
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { stripeCustomerId: true }
      })
      
      if (user?.stripeCustomerId) {
        stripeCustomerId = user.stripeCustomerId
      } else {
        // Create new Stripe customer
        const customer = await stripe.customers.create({
          email: session.user.email,
          metadata: {
            userId: session.user.id
          }
        })
        
        // Update user with Stripe customer ID
        await prisma.user.update({
          where: { id: session.user.id },
          data: { stripeCustomerId: customer.id }
        })
        
        stripeCustomerId = customer.id
      }
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
      success_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/upgrade`,
      metadata: {
        userId: session.user.id,
      },
    })
    
    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return new NextResponse('Failed to create checkout session', { status: 500 })
  }
}
