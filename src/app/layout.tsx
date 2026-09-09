import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const APP_NAME = "Pulse";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: "Pulse — Personal Productivity OS",
  description: "A premium personal productivity operating system: dashboard, tasks, focus timer, goals and analytics.",
  manifest: "/manifest.json",
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#061B14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
