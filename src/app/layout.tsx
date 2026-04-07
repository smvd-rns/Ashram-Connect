import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import PolicyModal from "@/components/PolicyModal";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Spiritual Echoes - Devotional Discourses",
  description: "A sanctuary of spiritual knowledge, housing enlightening discourses and lectures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          {/* Main Content Area */}
          <main className="w-full pt-0 md:pt-16 lg:pt-8 pb-24 md:pb-8 flex-grow">
            <AuthGuard>
              {children}
            </AuthGuard>
          </main>
          
          {/* Global Policy Modal */}
          <PolicyModal />
          {/* Simplified elegant footer */}
          <footer className="w-full bg-slate-900/5 py-6 mt-12 border-t border-devo-200 text-center">
            <p className="text-sm font-medium text-devo-800">
              © {new Date().getFullYear()} Devotional Discourses Hub. All rights reserved.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
