import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: { default: "Beo School of Art", template: "%s · Beo School of Art" },
  description: "Structured drawing and painting education, guided by practice.",
  icons: {
    icon: "/favicon.ico",
    apple: "/images/beo-favicon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <Script id="microsoft-clarity" strategy="beforeInteractive">
          {`(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "xzn4supbg9");`}
        </Script>
      </head>
      <body className={`${inter.variable} ${playfair.variable}`}>
        {children}
        <SiteFooter />
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
