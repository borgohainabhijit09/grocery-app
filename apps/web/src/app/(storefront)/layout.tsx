import { prisma } from "database";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { LeadCapturePopup } from "@/components/home/lead-capture-popup";
import { DeliveryCheckerFloat } from "@/components/delivery-checker-float";
import { PwaInstallBanner } from "@/components/pwa-install-banner";

export default async function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  let defaultCoords: { latitude: number; longitude: number } | null = null;
  if (session?.user) {
    try {
      defaultCoords = await prisma.address.findFirst({
        where: { userId: session.user.id },
        orderBy: { isDefault: "desc" },
        select: { latitude: true, longitude: true },
      });
    } catch {
      defaultCoords = null;
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <LeadCapturePopup />
      <DeliveryCheckerFloat defaultCoordinates={defaultCoords} />
      <PwaInstallBanner />
    </div>
  );
}
