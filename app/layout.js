/* eslint-disable @next/next/next-script-for-ga */
import "./globals.css";

export const metadata = {
  title: "MUVA | CyberSertão",
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
      <head>
        {/* Google Analytics */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-YSSJYM5M67"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-YSSJYM5M67');
            `,
          }}
        />

        {/* Preload da fonte Jaapokki para melhor performance */}
        <link
          rel="preload"
          href="/fonts/jaapokki-regular.woff"
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className="antialiased min-h-screen"
        style={{
          fontFamily: "Jaapokki, Arial, Helvetica, sans-serif",
          background: "#212121",
          overflow: "hidden",
        }}
      >
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
