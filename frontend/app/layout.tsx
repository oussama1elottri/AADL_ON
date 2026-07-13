import type { Metadata } from "next";
import { Inter, Amiri, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "الجمهورية الجزائرية الديمقراطية الشعبية | AADL_ON Verification Notary Portal",
  description: "Official algorithmically transparent, cryptographically verifiable housing allocation notary portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${inter.variable} ${amiri.variable} ${playfair.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
