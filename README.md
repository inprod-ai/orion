# inprod.ai

Production readiness analysis for GitHub repositories.

## Features

- Comprehensive analysis across 12+ categories
- Security, performance, and best practices evaluation
- Intelligent scoring with AI-powered insights
- Clean, futuristic UI with real-time progress updates
- Rate-limited to prevent abuse (5 analyses per IP per day)

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and add your Anthropic API key
4. Run the development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Framer Motion for animations
- Claude 3.5 Sonnet for analysis
- Deployed on Vercel

## Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude

## License

MIT