import type { ReactNode } from "react";
import Script from "next/script";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <body>
        {children}
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="0f2031e2-563f-43b2-bbcd-ec1398b170fc"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
