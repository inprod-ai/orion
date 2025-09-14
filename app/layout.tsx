import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "inprod.ai - Production Readiness Analysis",
  description: "Get an intelligent analysis of your GitHub repository's production readiness with comprehensive scoring across security, performance, and best practices.",
  keywords: "production readiness, code analysis, github, repository analysis, security audit, performance check",
  authors: [{ name: "inprod.ai" }],
  openGraph: {
    title: "inprod.ai - Is Your Code Production Ready?",
    description: "Comprehensive production readiness analysis for GitHub repositories",
    type: "website",
    url: "https://inprod.ai",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black`}>
        {children}
      </body>
    </html>
  );
}