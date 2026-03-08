import type { Metadata, Viewport } from "next";
import { Manrope, Marcellus } from "next/font/google";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body-face",
});

const headingFont = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading-face",
});

const SITE_URL = (() => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) {
    return "https://itngoldloan.in";
  }
  const withProtocol = configured.startsWith("http://") || configured.startsWith("https://")
    ? configured
    : `https://${configured}`;
  return withProtocol.replace(/\/$/, "");
})();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ITN GOLD LOAN | Instant Gold Loan in Thrissur",
    template: "%s | ITN GOLD LOAN",
  },
  description:
    "Get instant gold loan support in Thrissur with live gold-rate based valuation, secure vault storage, and same-day disbursal.",
  keywords: [
    "gold loan Thrissur",
    "instant gold loan Kerala",
    "gold loan EMI calculator",
    "jewellery loan",
    "ITN GOLD LOAN",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "ITN GOLD LOAN",
    title: "ITN GOLD LOAN | Instant Gold Loan in Thrissur",
    description:
      "Live-rate valuation, secure custody, and same-day disbursal for your gold loan needs.",
    images: ["/maxresdefault.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ITN GOLD LOAN | Instant Gold Loan in Thrissur",
    description:
      "Check eligibility, estimate EMI, and connect with ITN GOLD LOAN for same-day gold loan disbursal.",
    images: ["/maxresdefault.jpg"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
  category: "finance",
};

export const viewport: Viewport = {
  themeColor: "#d6a756",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headingFont.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
