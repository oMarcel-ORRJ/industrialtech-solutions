import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IndustrialTech | Gestão de Manutenção",
  description: "Plataforma de gestão de manutenção industrial — IndustrialTech Solutions.",
  icons: { icon: "/favicon.svg" }
};

export default function RootLayout({ children }: Readonly<{ children: import("react").ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
