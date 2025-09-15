#!/bin/bash

echo "Setting up database for inprod.ai..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Push database schema
echo "Pushing database schema..."
npx prisma db push

# Optionally seed the database
# echo "Seeding database..."
# npx prisma db seed

echo "Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure all environment variables are set in .env"
echo "2. Configure GitHub OAuth app with callback URL: http://localhost:3000/api/auth/callback/github"
echo "3. Set up Stripe products and webhook endpoint"
echo "4. Run 'npm run dev' to start the development server"
