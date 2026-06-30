import { SiteShell } from "@/components/common";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteShell>{children}</SiteShell>;
}
