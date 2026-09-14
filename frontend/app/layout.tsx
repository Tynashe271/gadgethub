// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StoreProvider } from "./context/StoreContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./globals.css";
import "./demo.css";
import "./styles/forms.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GadgetHub — Tech That Moves With You",
  description: "Curated devices, honest advice and support that stays with you.",
  metadataBase: new URL("https://gadgethub.example"),
  openGraph: {
    title: "GadgetHub",
    description: "Tech that moves with you.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>
        <ErrorBoundary>
          <StoreProvider>
            {children}
          </StoreProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
