import type { Metadata, Viewport } from "next";
import { Cairo, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "جدول الحصص",
  applicationName: "جدول الحصص",
  appleWebApp: { capable: true, title: "جدول الحصص", statusBarStyle: "default" },
  description: "لوحة لعرض جدول الحصص اليومي وإدارته",
};

export const viewport: Viewport = { themeColor: "#0066df" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} antialiased bg-slate-100 text-slate-900`}
      >
        {children}
      </body>
    </html>
  );
}
