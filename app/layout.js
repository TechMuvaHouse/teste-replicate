import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MUVA + Replicate",
  description: "Transforme suas imagens usando inteligência artificial",
  keywords: [
    "IA",
    "transformação de imagens",
    "arte digital",
    "processamento de imagem",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100`}
      >
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
