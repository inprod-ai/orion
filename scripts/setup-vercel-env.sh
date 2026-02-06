#!/bin/bash

echo "🚀 Setting up Vercel environment variables for orion.archi"
echo ""
echo "This script will help you add all required environment variables to Vercel."
echo "Make sure you have the following ready:"
echo "1. Neon DATABASE_URL"
echo "2. Anthropic API Key"
echo "3. GitHub OAuth App credentials"
echo "4. Stripe keys (can be added later)"
echo ""
echo "Press Enter to continue..."
read

# Add DATABASE_URL
echo "📊 Adding DATABASE_URL..."
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development

# Add ANTHROPIC_API_KEY
echo "🤖 Adding ANTHROPIC_API_KEY..."
vercel env add ANTHROPIC_API_KEY production
vercel env add ANTHROPIC_API_KEY preview
vercel env add ANTHROPIC_API_KEY development

# Add NEXTAUTH_SECRET (using the generated one)
echo "🔐 Adding NEXTAUTH_SECRET..."
echo "vUqYcqzb5qVBCC5WQxHwy4JaOxdhZjSdUrAH/cSP8e8=" | vercel env add NEXTAUTH_SECRET production
echo "vUqYcqzb5qVBCC5WQxHwy4JaOxdhZjSdUrAH/cSP8e8=" | vercel env add NEXTAUTH_SECRET preview
echo "vUqYcqzb5qVBCC5WQxHwy4JaOxdhZjSdUrAH/cSP8e8=" | vercel env add NEXTAUTH_SECRET development

# Add NEXTAUTH_URL
echo "🌐 Adding NEXTAUTH_URL..."
echo "https://orion.archi" | vercel env add NEXTAUTH_URL production
echo "https://orion-preview.vercel.app" | vercel env add NEXTAUTH_URL preview
echo "http://localhost:3000" | vercel env add NEXTAUTH_URL development

# Add NEXT_PUBLIC_URL
echo "🔗 Adding NEXT_PUBLIC_URL..."
echo "https://orion.archi" | vercel env add NEXT_PUBLIC_URL production
echo "https://orion-preview.vercel.app" | vercel env add NEXT_PUBLIC_URL preview
echo "http://localhost:3000" | vercel env add NEXT_PUBLIC_URL development

# GitHub OAuth (optional for now)
echo ""
echo "📱 For GitHub OAuth (optional now, can add later):"
echo "1. Go to https://github.com/settings/developers"
echo "2. Create new OAuth App with callback: https://orion.archi/api/auth/callback/github"
echo ""
echo "Add GitHub credentials? (y/n)"
read add_github

if [ "$add_github" = "y" ]; then
  echo "🔑 Adding GITHUB_CLIENT_ID..."
  vercel env add GITHUB_CLIENT_ID production
  vercel env add GITHUB_CLIENT_ID preview
  vercel env add GITHUB_CLIENT_ID development
  
  echo "🔐 Adding GITHUB_CLIENT_SECRET..."
  vercel env add GITHUB_CLIENT_SECRET production
  vercel env add GITHUB_CLIENT_SECRET preview
  vercel env add GITHUB_CLIENT_SECRET development
fi

# Stripe (optional for now)
echo ""
echo "💳 For Stripe (optional now, can add later):"
echo "Add Stripe credentials? (y/n)"
read add_stripe

if [ "$add_stripe" = "y" ]; then
  echo "💰 Adding STRIPE_SECRET_KEY..."
  vercel env add STRIPE_SECRET_KEY production
  
  echo "🔔 Adding STRIPE_WEBHOOK_SECRET..."
  vercel env add STRIPE_WEBHOOK_SECRET production
  
  echo "📦 Adding STRIPE_PRICE_ID..."
  vercel env add STRIPE_PRICE_ID production
fi

echo ""
echo "✅ Environment variables setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: vercel env pull .env.local"
echo "2. Run: npx prisma db push"
echo "3. Run: vercel --prod"
