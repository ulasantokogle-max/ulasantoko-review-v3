export const metadata = {
  title: "Dashboard | ReputasiPro",
  robots: {
    index: false,
    follow: false,
  },
};

import LocalizedText from "../components/LocalizedText";
import DashboardNav from "./DashboardNav";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ProviderMfaGate from "../components/ProviderMfaGate";
import "./dashboard.css";
import { cookies } from "next/headers";
import { DashboardThemeShell, DashboardThemePicker } from "./DashboardTheme";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const savedTheme = (await cookies()).get("reputasipro-dashboard-theme")?.value;
  const initialTheme = savedTheme === "smoothie" || savedTheme === "ocean" ? savedTheme : "modern";
  return (
    <ProviderMfaGate allowCustomers><DashboardThemeShell initialTheme={initialTheme}>
      <div className="dashboard-grid">
        <aside className="dashboard-sidebar">
          <div
            className="dashboard-brand-eyebrow"
            style={{
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 0.7,
              textTransform: "uppercase",
              color: "#6b7280",
              marginBottom: 6,
            }}
          >
            ReputasiPro
          </div>

          <div
            className="dashboard-brand-title"
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "#111827",
              marginBottom: 16,
            }}
          >
            <LocalizedText text="Dashboard" />
          </div>

          <div style={{ marginBottom: 14 }}><LanguageSwitcher /></div>
          <DashboardThemePicker />

          <DashboardNav />
        </aside>

        <div className="dashboard-content">{children}</div>
      </div>
    </DashboardThemeShell></ProviderMfaGate>
  );
}
