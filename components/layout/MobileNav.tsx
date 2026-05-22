"use client";
import { useAppStore } from "@/store";

export function MobileNav() {
  const { theme, activeTab, setActiveTab } = useAppStore();
  const isDark = theme === "dark";

  const t = {
    bg: isDark ? "#0f0f0f" : "#ffffff",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8",
    accent: "#e01c1c",
    muted: isDark ? "#555" : "#aaa",
  };

  const items = [
    { id: "feed", icon: "⚡", label: "Feed" },
    { id: "signals", icon: "📡", label: "Signals" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];

  return (
    <nav
      className="mobile-nav"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: t.bg,
        borderTop: `1px solid ${t.border}`,
        display: "flex", alignItems: "center",
        height: 58,
        boxShadow: isDark ? "0 -4px 20px rgba(0,0,0,0.5)" : "0 -2px 12px rgba(0,0,0,0.07)",
      }}
    >
      {items.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            style={{
              flex: 1, height: "100%",
              background: "transparent", border: "none",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 3,
              cursor: "pointer", fontFamily: "inherit",
              borderTop: active ? `2px solid ${t.accent}` : "2px solid transparent",
              transition: "border-color .15s",
            }}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{
              fontSize: 9, letterSpacing: 1, textTransform: "uppercase",
              fontWeight: 700, color: active ? t.accent : t.muted,
            }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
