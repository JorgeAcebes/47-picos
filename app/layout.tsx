import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "52 Picos · Tu reto provincial",
  description: "Registra los techos de las 50 provincias españolas, Ceuta y Melilla.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
