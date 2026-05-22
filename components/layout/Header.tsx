"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useAppStore } from "@/store";
import { Avatar } from "@/components/ui/Avatar";

export function Header() {
  const { data: session, status } = useSession();
  const { theme, toggleTheme, activeTab, setActiveTab } = useAppStore();
  const isDark = theme === "dark";

  const t = {
    bg: isDark ? "#0f0f0f" : "#ffffff",
    border: isDark ? "rgba(255,255,255,0.07)" : "#e8e8e8",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
    muted: isDark ? "#555" : "#999",
    accent: "#e01c1c",
    accentDim: "rgba(224,28,28,0.08)",
    surface: isDark ? "#1a1a1a" : "#f3f3f3",
  };

  const user = session?.user as any;

  return (
    <header style={{
      background: t.bg,
      borderBottom: `1px solid ${t.border}`,
      position: "sticky", top: 0, zIndex: 100,
      boxShadow: isDark ? "0 1px 12px rgba(0,0,0,0.5)" : "0 1px 10px rgba(0,0,0,0.06)",
    }}>
      <div style={{
        maxWidth: 900, margin: "0 auto",
        padding: "0 20px",
        display: "flex", alignItems: "center",
        height: 58, gap: 12,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, background: t.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(224,28,28,0.4)", flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="4" cy="8" r="2.4" fill="white" />
              <circle cx="12" cy="4" r="2.4" fill="white" opacity=".6" />
              <circle cx="12" cy="12" r="2.4" fill="white" opacity=".6" />
              <line x1="6.4" y1="7" x2="9.6" y2="5" stroke="white" strokeWidth="1.1" opacity=".5" />
              <line x1="6.4" y1="9" x2="9.6" y2="11" stroke="white" strokeWidth="1.1" opacity=".5" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1 }}>
              Talkin<span style={{ color: t.accent }}>Pulse</span>
            </div>
            <div style={{ fontSize: 7, letterSpacing: 2, color: t.muted, textTransform: "uppercase", marginTop: 1 }}>
              CT Intelligence
            </div>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="desktop-nav" style={{ display: "flex", gap: 2, marginLeft: 12 }}>
          {[
            { id: "feed", label: "Feed" },
            { id: "signals", label: "Signals" },
            { id: "profile", label: "Profile" },
          ].map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveTab(n.id as any)}
              style={{
                padding: "6px 13px", borderRadius: 8, border: "none",
                background: activeTab === n.id ? t.accentDim : "transparent",
                color: activeTab === n.id ? t.accent : t.muted,
                fontSize: 12, fontWeight: activeTab === n.id ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit",
                borderBottom: activeTab === n.id ? `2px solid ${t.accent}` : "2px solid transparent",
                transition: "all .15s",
              }}
            >{n.label}</button>
          ))}
        </nav>

        {/* Right */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {/* Theme */}
          <button
            onClick={toggleTheme}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: `1px solid ${t.border}`, background: t.surface,
              color: t.muted, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >{isDark ? "☀" : "🌙"}</button>

          {/* Auth */}
          {status === "loading" ? (
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: t.surface, border: `1px solid ${t.border}` }} />
          ) : !session ? (
            <button
              onClick={() => signIn("twitter")}
              style={{
                padding: "7px 14px", borderRadius: 9,
                background: t.accent, border: "none", color: "#fff",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", letterSpacing: 0.4,
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 2px 10px rgba(224,28,28,0.35)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Connect X
            </button>
          ) : (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 8px 4px 5px", borderRadius: 9,
                border: `1px solid ${t.border}`, background: t.surface,
                cursor: "pointer",
              }}
              onClick={() => signOut()}
              title="Sign out"
            >
              <Avatar
                username={user?.username || user?.name || "user"}
                imageUrl={user?.image}
                size={22}
              />
              <span className="hide-mobile" style={{ fontSize: 11, color: t.text, fontWeight: 600 }}>
                @{user?.username || user?.name}
              </span>
              <span style={{ fontSize: 8, color: t.muted }}>▼</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
