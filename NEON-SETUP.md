# Quick Neon Database Setup

## Option A: Through Vercel Integration (Recommended)
1. Go to: https://vercel.com/christians-projects-c43994b5/orion/integrations
2. Search for "Neon" → Add Integration
3. It auto-creates database and adds DATABASE_URL to Vercel

## Option B: Direct Setup
1. Go to https://neon.tech
2. Sign up with GitHub
3. Create new project:
   - Project name: `orion-db`
   - Region: Choose closest to you
   - Database name: `orion`
4. Copy the connection string (looks like):
   ```
   postgresql://[user]:[password]@[host]/[database]?sslmode=require
   ```

## Add to Vercel Environment Variables
```bash
# Pull current env vars
vercel env pull .env.local

# Add DATABASE_URL
vercel env add DATABASE_URL production
# Paste your Neon connection string when prompted

# Also add for preview/development
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development
```

## Initialize Database
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

Your database will be ready in ~30 seconds!
