import type { Metadata } from "next";
import { Geist, Geist_Mono, Changa } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const changa = Changa({
  variable: "--font-changa",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AADL_ON Verification Notary Portal",
  description: "Algorithmically transparent, cryptographically verifiable housing allocation notary.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${changa.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
