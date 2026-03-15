import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Healthspan | Longevity & Wellness Research",
  description:
    "Your trusted source for evidence-based longevity research, anti-aging science, and wellness insights. Discover the latest in healthspan optimization.",
  keywords: [
    "longevity",
    "healthspan",
    "anti-aging",
    "wellness",
    "lifespan",
    "cellular health",
    "longevity research",
  ],
  authors: [{ name: "Healthspan" }],
  openGraph: {
    title: "Healthspan | Longevity & Wellness Research",
    description:
      "Your trusted source for evidence-based longevity research, anti-aging science, and wellness insights.",
    type: "website",
    locale: "en_US",
    siteName: "Healthspan",
  },
  twitter: {
    card: "summary_large_image",
    title: "Healthspan | Longevity & Wellness Research",
    description:
      "Your trusted source for evidence-based longevity research, anti-aging science, and wellness insights.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${manrope.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
