import type { Metadata } from "next";
import "./globals.css";
import { ThemeScript } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: "Fresh Basket — Online Grocery",
    template: "%s | Fresh Basket",
  },
  description:
    "Order fresh groceries online with home delivery slots or store pickup. Fruits, vegetables, dairy, staples and more.",
  manifest: "/manifest.webmanifest",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#16a34a" },
    { media: "(prefers-color-scheme: dark)", color: "#15803d" },
  ],
  appleWebApp: {
    capable: true,
    title: "Fresh Basket",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
