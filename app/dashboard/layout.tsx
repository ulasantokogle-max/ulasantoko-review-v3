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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProviderMfaGate allowCustomers><div className="dashboard-shell">
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

          <DashboardNav />
        </aside>

        <div className="dashboard-content">{children}</div>
      </div>
    </div></ProviderMfaGate>
  );
}
