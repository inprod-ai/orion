import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

// Validate required environment variables
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is required for webhook security')
}

export async function POST(request: NextRequest) {
  try {
    // Validate request size
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
      return new NextResponse('Request too large', { status: 413 })
    }

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')
    
    if (!signature) {
      return new NextResponse('Missing Stripe signature', { status: 400 })
    }
    
    let event: Stripe.Event
    
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (error) {
      console.error('Webhook signature verification failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
      return new NextResponse('Invalid signature', { status: 400 })
    }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.payment_status === 'paid' && session.metadata?.userId) {
          // Update user to Pro tier
          await prisma.user.update({
            where: { id: session.metadata.userId },
            data: { 
              tier: 'PRO',
              stripeCustomerId: session.customer as string,
            }
          })
          
          // Create subscription record
          if (session.subscription) {
            const subscriptionId = session.subscription as string
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            
            await prisma.subscription.create({
              data: {
                userId: session.metadata.userId,
                stripeSubscriptionId: subscription.id,
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                status: subscription.status as any,
              }
            })
          }
        }
        break
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status as any,
            stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          }
        })
        
        // Update user tier based on subscription status
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          await prisma.user.update({
            where: { stripeCustomerId: subscription.customer as string },
            data: { tier: 'PRO' }
          })
        }
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Update subscription record
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: 'canceled' }
        })
        
        // Downgrade user to free tier
        await prisma.user.update({
          where: { stripeCustomerId: subscription.customer as string },
          data: { tier: 'FREE' }
        })
        break
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Handle failed payment
        const subscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: (invoice as any).subscription as string }
        })
        
        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'past_due' }
          })
        }
        break
      }
    }
    
    return new NextResponse('Webhook processed', { status: 200 })
  } catch (error) {
    console.error('Webhook processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      eventType: event?.type || 'unknown',
      timestamp: new Date().toISOString()
    })
    return new NextResponse('Webhook processing failed', { status: 500 })
  }
  } catch (outerError) {
    console.error('Webhook outer error:', {
      error: outerError instanceof Error ? outerError.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
    return new NextResponse('Invalid request', { status: 400 })
  }
}
