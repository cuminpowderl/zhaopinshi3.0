import { AppShell } from "@/components/app-shell";
import { ShareGateDenied } from "@/components/share-gate-denied";
import { isShareAccessAllowed } from "@/lib/share-access";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const allowed = await isShareAccessAllowed();
  if (!allowed) {
    return <ShareGateDenied />;
  }
  return <AppShell>{children}</AppShell>;
}