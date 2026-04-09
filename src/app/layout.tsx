import "./globals.css";
import type { ReactNode } from "react";
import { Manrope, Space_Grotesk } from "next/font/google";
import { AudienceModeProvider } from "../components/AudienceMode";
import AppShell from "../components/AppShell";

const bodyFont = Manrope({ subsets: ["latin"], variable: "--font-body" });
const displayFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata = {
  title: "Power Haven | Flex Dispatch Demo",
  description: "Investor-grade interactive demo for UK grid flexibility dispatch."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <AudienceModeProvider>
          <AppShell>{children}</AppShell>
        </AudienceModeProvider>
      </body>
    </html>
  );
}
