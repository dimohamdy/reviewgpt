import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/nav";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReviewGPT - AI-Powered Review Analytics",
  description: "RAG-powered App Store review analytics with semantic search and insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Nav />
        <main className="container mx-auto px-4 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
