import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import MobileTabBar from "@/components/MobileTabBar";
import FloatingAIButton from "@/components/FloatingAIButton";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "题库系统",
  description: "共享题库，支持文本和图片上传",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-brand-50 text-brand-900">
        <ThemeProvider>
          <Navbar />
          <AnnouncementBanner />
          <main className="min-h-screen pb-16 sm:pb-0">
            {children}
          </main>
          <Footer />
          <MobileTabBar />
          <FloatingAIButton />
        </ThemeProvider>
      </body>
    </html>
  );
}