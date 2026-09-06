"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

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
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0, textDecoration: "none", color: "inherit" }}>
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
        </Link>

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
              }}
            >{n.label}</button>
          ))}
          <Link href="/summary" style={{
            padding: "6px 13px", borderRadius: 8, textDecoration: "none",
            color: t.muted, fontSize: 12, fontWeight: 500,
          }}>Day</Link>
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={toggleTheme}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: `1px solid ${t.border}`, background: t.surface,
              color: t.muted, fontSize: 13, cursor: "pointer",
            }}
          >{isDark ? "☀" : "🌙"}</button>

          {status === "loading" ? (
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: t.surface, border: `1px solid ${t.border}` }} />
          ) : !session ? (
            <button
              onClick={() => signIn("twitter")}
              style={{
                padding: "7px 14px", borderRadius: 9,
                background: t.accent, border: "none", color: "#fff",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >Connect X</button>
          ) : (
            <div ref={menuRef} style={{ position: "relative" }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 8px 4px 5px", borderRadius: 9,
                  border: `1px solid ${t.border}`, background: t.surface,
                }}
              >
                <button
                  type="button"
                  onClick={() => { setActiveTab("profile"); setMenuOpen(false); }}
                  title="Profile"
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
                >
                  <Avatar username={user?.username || user?.name || "user"} imageUrl={user?.image} size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <span className="hide-mobile" style={{ fontSize: 11, color: t.text, fontWeight: 600 }}>
                    @{user?.username || user?.name}
                  </span>
                </button>
              </div>
              {menuOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 6px)",
                  minWidth: 160, background: t.bg, border: `1px solid ${t.border}`,
                  borderRadius: 10, padding: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", zIndex: 20,
                }}>
                  {[
                    { label: "Profile", run: () => setActiveTab("profile") },
                    { label: "Settings", run: () => setActiveTab("profile") },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => { item.run(); setMenuOpen(false); }}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        background: "none", border: "none", color: t.text,
                        fontSize: 13, fontWeight: 600, padding: "8px 10px",
                        borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >{item.label}</button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); signOut(); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      background: "none", border: "none", color: t.accent,
                      fontSize: 13, fontWeight: 600, padding: "8px 10px",
                      borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >Log out</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
