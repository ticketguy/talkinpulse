"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAppStore } from "@/store";

export default function SummaryPage() {
  const { theme } = useAppStore();
  const isDark = theme === "dark";
  const [range, setRange] = useState<"day" | "week">("day");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setData(null);
    setErr("");
    fetch(range === "week" ? "/api/summary?range=week" : "/api/summary")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setErr("Could not load summary"));
  }, [range]);

  const t = {
    bg: isDark ? "#0a0a0a" : "#f8f8f8",
    text: isDark ? "#f0f0f0" : "#0a0a0a",
    muted: isDark ? "#888" : "#666",
    surface: isDark ? "#141414" : "#fff",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8",
    accent: "#e01c1c",
    accentDim: "rgba(224,28,28,0.08)",
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'Syne','Outfit',sans-serif" }}>
      <Header />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 90px" }}>
        <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: t.accent, fontWeight: 700 }}>
          {range === "week" ? "Week" : "End of day"}
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "8px 0 6px" }}>
          {range === "week" ? "This week on Pulse" : "Today on Pulse"}
        </h1>
        <div style={{ display: "flex", gap: 8, margin: "12px 0 22px" }}>
          {(["day", "week"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
              border: `1.5px solid ${range === r ? t.accent : t.border}`,
              background: range === r ? t.accentDim : "transparent",
              color: range === r ? t.accent : t.muted, fontWeight: 700, fontSize: 12,
            }}>{r === "day" ? "Today" : "This week"}</button>
          ))}
        </div>

        {err && <p style={{ color: t.accent }}>{err}</p>}
        {!data && !err && <p style={{ color: t.muted }}>Writing the brief…</p>}
        {data && (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 11, color: t.muted, marginBottom: 8 }}>{data.date} · {data.count} cards · {data.range}</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>{data.headline}</h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{data.brief}</p>
            {data.watch && (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: t.accent, fontWeight: 700, marginBottom: 6 }}>Watch</div>
                <p style={{ fontSize: 14, lineHeight: 1.65, margin: 0, color: t.muted }}>{data.watch}</p>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
