import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "My Calm Head",
    template: "%s · My Calm Head",
  },
  description: "A personal migraine tracker.",
  appleWebApp: {
    capable: true,
    title: "My Calm Head",
    statusBarStyle: "default",
  },
};

/**
 * `viewportFit: "cover"` lets the bottom tab bar sit against the bottom edge on
 * a notched phone, with `env(safe-area-inset-bottom)` keeping its contents
 * clear of the home indicator. `maximumScale` is deliberately left alone so
 * pinch-zoom keeps working.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f7fc",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
