import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeScript } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://grocery-app.sygmiainnovative.co.in";
const siteName = "Fresh Basket";
const defaultTitle = "Fresh Basket — Fresh Groceries Delivered in Dibrugarh";
const defaultDescription =
  "Order fresh vegetables, fruits, dairy, staples and more online from Fresh Basket. Home delivery and store pickup in Dibrugarh, Assam.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  keywords: [
    "grocery delivery Dibrugarh",
    "online grocery Assam",
    "fresh vegetables Dibrugarh",
    "Fresh Basket",
    "grocery home delivery",
    "fruits vegetables online",
  ],
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName,
    title: defaultTitle,
    description: defaultDescription,
    url: siteUrl,
    locale: "en_IN",
    images: [
      {
        url: "/grocery-hero.png",
        width: 1200,
        height: 630,
        alt: "Fresh Basket — Fresh Groceries Delivered",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/grocery-hero.png"],
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  verification: {},
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#16a34a" },
    { media: "(prefers-color-scheme: dark)", color: "#15803d" },
  ],
};

function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    name: siteName,
    url: siteUrl,
    description: defaultDescription,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Sygmia Learning, AT Road",
      addressLocality: "Dibrugarh",
      addressRegion: "Assam",
      postalCode: "786001",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 27.4728,
      longitude: 94.912,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "08:00",
        closes: "21:00",
      },
    ],
    hasMap: `https://maps.google.com/?q=27.4728,94.9120`,
    servesCuisine: "Grocery",
    priceRange: "₹",
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <OrganizationSchema />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
