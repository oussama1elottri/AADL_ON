import type { Metadata } from "next";
import { Roboto, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
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
        className={`${roboto.variable} ${notoSansArabic.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
