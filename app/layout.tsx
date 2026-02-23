import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "ITN GOLD LOAN",
  description: "ITN GOLD LOAN landing page with live market price and EMI calculator",
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
