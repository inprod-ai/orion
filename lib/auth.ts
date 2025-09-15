import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import type { UserTier } from "@prisma/client"

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
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
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
