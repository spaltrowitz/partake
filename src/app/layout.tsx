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
  description: "Snap your receipt, claim what you ordered, and send payment requests ",
  manifest: "/manifest.json",
  openGraph: {
    title: "Partake — Split the bill in seconds",
    description: "Snap your receipt, claim what you ordered, and send payment requests ",
    siteName: "Partake",
    type: "website",
    url: "https://partake-app.vercel.app",
  },
  twitter: {
    card: "summary",
    title: "Partake — Split the bill in seconds",
    description: "Snap your receipt, claim what you ordered, and send payment requests ",
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
