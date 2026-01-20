import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import type { UserTier } from "@prisma/client"
import type { Adapter } from "next-auth/adapters"

// Validate required environment variables
if (!process.env.GITHUB_CLIENT_ID) {
  throw new Error('GITHUB_CLIENT_ID is required')
}
if (!process.env.GITHUB_CLIENT_SECRET) {
  throw new Error('GITHUB_CLIENT_SECRET is required')
}
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is required')
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      tier: UserTier
      monthlyScans: number
    }
  }
  
  interface User {
    tier: UserTier
    monthlyScans: number
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      // Request repo scope to list and access private repositories
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Use default cookie settings - NextAuth handles secure cookies automatically
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id
        // Fetch the latest user data to get current tier and usage
        const currentUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { tier: true, monthlyScans: true }
        })
        
        if (currentUser) {
          session.user.tier = currentUser.tier
          session.user.monthlyScans = currentUser.monthlyScans
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
})
