import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relay Maintenance",
  description: "AI maintenance coordination for landlords"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
