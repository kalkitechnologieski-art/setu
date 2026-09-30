import { AppSidebar } from "@/components/app/sidebar";
import { AppTopbar } from "@/components/app/topbar";
import { BottomNav } from "@/components/app/bottom-nav";
import { CommandPalette } from "@/components/app/command-palette";
import { SiddhiPanel } from "@/components/siddhi/siddhi-panel";
import { SiddhiLauncher } from "@/components/siddhi/siddhi-launcher";
import { OnboardingTour } from "@/components/guided/onboarding-tour";
import { ShortcutsOverlay } from "@/components/keyboard/shortcuts-overlay";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 md:py-6 md:pb-6 lg:p-8">
          {children}
        </main>
      </div>
      <BottomNav />
      <CommandPalette />
      <SiddhiPanel />
      <SiddhiLauncher />
      <OnboardingTour />
      <ShortcutsOverlay />
      {/* CRT scanline overlay — decorative */}
      <div
        aria-hidden
        className="crt-overlay pointer-events-none fixed inset-0 z-[100] scanlines opacity-30"
      />
    </div>
  );
}
