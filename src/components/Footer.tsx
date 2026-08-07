import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";

function LinkedInIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/>
    </svg>
  );
}
function InstagramIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function FacebookIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 13.5h2.5l1-4H14V7.5c0-1.03 0-2 2-2h1.5V2.14c-.35-.05-1.5-.14-2.72-.14C11.3 2 9.5 3.66 9.5 6.7V9.5H6.5v4h3V22h4.5v-8.5z"/>
    </svg>
  );
}

export default function Footer() {
  const navigate = useNavigate();

  const goToSection = (id: string) => {
    navigate(`/#${id}`);
    // Give the landing page a moment to mount before scrolling
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  const linkCol = (title: string, links: { label: string; to?: string; scrollTo?: string }[]) => (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(245,237,228,0.4)", marginBottom: 16 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {links.map((l) => (
          <a key={l.label}
            onClick={() => { if (l.to) navigate(l.to); else if (l.scrollTo) goToSection(l.scrollTo); }}
            style={{ fontSize: 13.5, color: "rgba(245,237,228,0.75)", textDecoration: "none", cursor: (l.to || l.scrollTo) ? "pointer" : "default" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e8854a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(245,237,228,0.75)")}>
            {l.label}
          </a>
        ))}
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
            <p style={{ fontSize: 13, color: "rgba(245,237,228,0.6)", lineHeight: 1.7, marginBottom: 20 }}>
              Structural steel takeoff, automated. Upload your engineer's model, get a fabrication-ready steel schedule in minutes.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {[LinkedInIcon, InstagramIcon, FacebookIcon, Mail].map((Icon, i) => (
                <a key={i} style={{
                  width: 34, height: 34, borderRadius: 8, background: "rgba(245,237,228,0.06)",
                  border: "1px solid rgba(245,237,228,0.12)", display: "flex", alignItems: "center",
                  justifyContent: "center", color: "rgba(245,237,228,0.7)", cursor: "pointer", transition: "all 0.2s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#c4633a"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#c4633a"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(245,237,228,0.06)"; e.currentTarget.style.color = "rgba(245,237,228,0.7)"; e.currentTarget.style.borderColor = "rgba(245,237,228,0.12)"; }}>
                  <Icon size={15} />
                </a>
              ))}
            </div>
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