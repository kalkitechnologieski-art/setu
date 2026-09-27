import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL &&
  process.env.NEXT_PUBLIC_APP_URL !== "__SET_ME__"
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://setu-kalki.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Setu Kalki — AI workforce for revenue teams",
    template: "%s · Setu Kalki",
  },
  description:
    "Four autonomous AI employees — lead discovery, voice outreach, nurture sequences, and performance marketing — operating in parallel from one control plane.",
  applicationName: "Setu Kalki",
  keywords: [
    "AI marketing",
    "AI sales development",
    "AI SDR",
    "performance marketing automation",
    "voice AI",
    "lead generation",
  ],
  openGraph: {
    type: "website",
    siteName: "Setu Kalki",
    title: "Setu Kalki — AI workforce for revenue teams",
    description:
      "Four autonomous AI employees running your revenue motions in parallel.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Setu Kalki — AI workforce for revenue teams",
    description:
      "Four autonomous AI employees running your revenue motions in parallel.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={inter.variable}
      style={{ colorScheme: "light" }}
    >
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
