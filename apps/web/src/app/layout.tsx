import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fresh Basket — Online Grocery",
    template: "%s | Fresh Basket",
  },
  description:
    "Order fresh groceries online with home delivery slots or store pickup. Fruits, vegetables, dairy, staples and more.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
