import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "inprod.ai - Release Readiness Analysis",
  description: "Instant 0-100 release readiness score with actionable fixes. See exactly how many points each improvement adds. Perfect for pre-launch gates and due diligence.",
  keywords: "release readiness, code analysis, github, repository analysis, security audit, performance check, pre-launch, due diligence",
  authors: [{ name: "inprod.ai" }],
  openGraph: {
    title: "inprod.ai - Is Your Code Release Ready?",
    description: "Instant release readiness score with quantified remediation path",
    type: "website",
    url: "https://inprod.ai",
  },
};

import Providers from '@/components/Providers'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}