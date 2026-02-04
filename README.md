# Orion

**The stars are the limit.** Release readiness analysis that measures how high your code can fly.

## Features

- **Altitude scoring** - measures max concurrent users your codebase can handle (from Runway to Interplanetary)
- **12 category analysis** - Frontend, Backend, Database, Auth, Security, Testing, Deployment, and more
- **Gap detection** - blockers, critical issues, and warnings with fix suggestions
- **Compile verification** - optional sandbox-based build verification via E2B
- **Space-themed visualization** - rocket that climbs through atmosphere layers as your code improves
- Clean, futuristic UI with real-time progress updates
- PDF export for stakeholder reports

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