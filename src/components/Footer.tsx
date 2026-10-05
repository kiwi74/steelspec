import { useNavigate } from "react-router-dom";

// The three social glyphs that used to live here went with the icon row they fed;
// nothing else referenced them.

export default function Footer() {
  const navigate = useNavigate();

  const goToSection = (id: string) => {
    navigate(`/#${id}`);
    // Give the landing page a moment to mount before scrolling
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  // An entry is a link only when it has somewhere to go. An entry with neither a
  // route nor a section renders as plain text — no anchor, no pointer cursor and no
  // hover colour — because each of those three is a promise that a click will do
  // something, and for "About", "Support" and the two legal documents there is
  // nothing behind them yet. This is deliberately not "give every entry a
  // destination": a plausible-looking destination that is not the real one would be
  // a worse lie than the dead link it replaced.
  //
  // The dead entries are dimmed to the same 0.45 the copyright line already uses,
  // so they read as the footer's own quiet text rather than as controls.
  const linkCol = (title: string, links: { label: string; to?: string; scrollTo?: string }[]) => (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(245,237,228,0.4)", marginBottom: 16 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {links.map((l) => {
          if (!l.to && !l.scrollTo) {
            return <span key={l.label} style={{ fontSize: 13.5, color: "rgba(245,237,228,0.45)" }}>{l.label}</span>;
          }
          // A button, not an anchor. These entries navigate or scroll, and an <a>
          // with no href is not a tab stop — the whole column was unreachable by
          // keyboard. alignSelf keeps the hit area the size the text was.
          return (
            <button key={l.label}
              type="button"
              className="ss-focus"
              onClick={() => { if (l.to) navigate(l.to); else if (l.scrollTo) goToSection(l.scrollTo); }}
              style={{
                fontSize: 13.5, color: "rgba(245,237,228,0.75)", background: "none", border: "none",
                padding: 0, fontFamily: "inherit", textAlign: "left", alignSelf: "flex-start", cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e8854a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(245,237,228,0.75)")}>
              {l.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <footer style={{ background: "#141414", color: "#f5ede4", padding: "72px 40px 0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="ss-footer-grid">
          <div style={{ maxWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, background: "#c4633a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#f5ede4" }}>S</div>
              <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 3, color: "#c4633a" }}>STEELSPEC</span>
            </div>
            {/* The 20px bottom margin this paragraph used to carry existed only to
                separate it from the icon row below; with that row gone the paragraph
                is the last thing in the column. */}
            <p style={{ fontSize: 13, color: "rgba(245,237,228,0.6)", lineHeight: 1.7 }}>
              Structural steel takeoff, automated. Upload your engineer's model, get an itemised steel schedule in minutes. Fabrication drawings are on the roadmap.
            </p>
            {/* Four social/mail icons used to sit here. Each was a button with no
                destination — no profile exists and no mailto address is published —
                and an icon has no text to fall back on, so de-linking one would have
                left an empty tile that still looked pressable. They were removed
                rather than pointed somewhere plausible but wrong. */}
          </div>

          {linkCol("Product", [
            { label: "Sample Output", scrollTo: "output" },
            { label: "Features", scrollTo: "features" },
            { label: "How it works", scrollTo: "how" },
            { label: "FAQ", to: "/faq" },
          ])}
          {linkCol("Company", [
            { label: "About" },
            { label: "Contact", to: "/contact" },
            { label: "Support" },
          ])}
          {linkCol("Legal", [
            { label: "Privacy Policy" },
            { label: "Terms of Service" },
          ])}
        </div>

        <div style={{ borderTop: "1px solid rgba(245,237,228,0.1)", marginTop: 56, padding: "24px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 12.5, color: "rgba(245,237,228,0.45)" }}>© {new Date().getFullYear()} SteelSpec. All rights reserved.</span>
          <span style={{ fontSize: 12.5, color: "rgba(245,237,228,0.45)", display: "flex", alignItems: "center", gap: 6 }}>
            Made in Aotearoa <span style={{ fontSize: 14 }}>🇳🇿</span>
          </span>
        </div>
      </div>
    </footer>
  );
}