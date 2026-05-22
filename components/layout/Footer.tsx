export function Footer() {
  return (
    <footer style={{
      background: "#0a0a0a",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      padding: "36px 20px 24px",
      marginTop: 40,
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap", gap: 28, marginBottom: 28,
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#e01c1c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <circle cx="4" cy="8" r="2.4" fill="white" />
                  <circle cx="12" cy="4" r="2.4" fill="white" opacity=".6" />
                  <circle cx="12" cy="12" r="2.4" fill="white" opacity=".6" />
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>
                Talkin<span style={{ color: "#e01c1c" }}>Pulse</span>
              </span>
            </div>
            <p style={{ fontSize: 11, color: "#444", lineHeight: 1.7, maxWidth: 200 }}>
              CT prediction markets, takes, debates, and signal intelligence. Auto-generated. Real-time.
            </p>
          </div>

          {/* Links */}
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>Product</div>
              {["Feed", "Signals", "Profile", "Docs"].map((l) => (
                <div key={l} style={{ fontSize: 12, color: "#555", marginBottom: 7, cursor: "pointer" }}>{l}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>Ecosystem</div>
              {["TraitKeeper", "Parallel Lines", "Outerflow"].map((l) => (
                <div key={l} style={{ fontSize: 12, color: "#555", marginBottom: 7, cursor: "pointer" }}>{l}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>Community</div>
              {["Twitter / X", "Discord", "Telegram"].map((l) => (
                <div key={l} style={{ fontSize: 12, color: "#555", marginBottom: 7, cursor: "pointer" }}>{l}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: 16,
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap", gap: 8,
        }}>
          <span style={{ fontSize: 11, color: "#333" }}>
            © {new Date().getFullYear()} TalkinPulse. All rights reserved.{" "}
            A <span style={{ color: "#e01c1c", fontWeight: 700 }}>TraitKeeper</span> Ecosystem Product.
          </span>
          <div style={{ display: "flex", gap: 16 }}>
            {["Privacy", "Terms", "Contact"].map((l) => (
              <span key={l} style={{ fontSize: 11, color: "#444", cursor: "pointer" }}>{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
