import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Partake — Split the bill in seconds",
  description: "Scan your receipt, claim what you ordered, and send payment requests.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Partake",
    description: "Split the bill in seconds. Scan • Claim • Pay.",
    siteName: "Partake",
    type: "website",
    url: "https://partake-app.vercel.app",
    images: [
      {
        url: "https://partake-app.vercel.app/api/og",
        width: 1200,
        height: 630,
        alt: "Partake — Split the bill in seconds",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Partake",
    description: "Split the bill in seconds. Scan • Claim • Pay.",
    images: ["https://partake-app.vercel.app/api/og"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Partake",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FBF8F4",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><Providers>{children}</Providers></body>
    </html>
  );
}
