import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RagProvider } from "@/hooks/use-rag";
import { BenchmarkProvider } from "@/hooks/use-benchmark";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RAG Lab",
  description: "Visualize and debug your RAG pipeline in real-time",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <RagProvider>
            <BenchmarkProvider>
              {children}
            </BenchmarkProvider>
          </RagProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
