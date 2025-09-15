# inprod.ai

Release readiness analysis for GitHub repositories.

## Features

- Instant 0-100 release readiness score
- Actionable findings showing exactly how many points each fix adds
- Focus on Security (40%), Performance (30%), and Best Practices (30%)
- Confidence scoring based on available repository data
- Clean, futuristic UI with real-time progress updates
- Perfect for pre-launch gates and due diligence

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