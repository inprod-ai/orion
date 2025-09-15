#!/bin/bash

echo "Add Stripe Webhook Secret to Vercel"
echo "===================================="
echo ""
echo "1. Go to https://dashboard.stripe.com/webhooks"
echo "2. Click on your webhook endpoint (https://inprod.ai/api/stripe/webhook)"
echo "3. Copy the 'Signing secret' (starts with whsec_)"
echo ""
read -p "Paste your webhook signing secret here: " WEBHOOK_SECRET

if [[ $WEBHOOK_SECRET == whsec_* ]]; then
  echo ""
  echo "Adding webhook secret to Vercel..."
  vercel env add STRIPE_WEBHOOK_SECRET production <<< "$WEBHOOK_SECRET"
  echo ""
  echo "✅ Webhook secret added successfully!"
  echo ""
  echo "For local development, you can use:"
  echo "stripe listen --forward-to localhost:3000/api/stripe/webhook"
  echo ""
  echo "This will give you a local webhook secret for testing."
else
  echo "❌ Invalid webhook secret. Should start with 'whsec_'"
  exit 1
fi
