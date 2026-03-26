import type { Metadata } from "next";
import { Space_Grotesk, Syne } from "next/font/google";
import { WalletProvider } from "@/components/WalletProvider";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "ShelbyStorage — Decentralized File Storage",
  description:
    "Upload and retrieve files on the Shelby decentralized hot storage network, powered by Aptos.",
  openGraph: {
    title: "ShelbyStorage",
    description: "The first decentralized hot storage network",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${spaceGrotesk.variable}`}>
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
