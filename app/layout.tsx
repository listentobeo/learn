import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: { default: "Beo School of Art", template: "%s · Beo School of Art" },
  description: "Structured drawing and painting education, guided by practice.",
  icons: {
    icon: "/images/beo-art-studio-logo.png",
    apple: "/images/beo-art-studio-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable}`}>
        {children}
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
