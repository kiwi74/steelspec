import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { theme as C } from "../lib/theme";
import { btnGhost, btnRust, panel } from "../lib/ui";

// The catch-all route. Every path that matches no route in App.tsx lands here.
//
// It is deliberately public: a reader who is not signed in and mistypes a
// protected address should be told the address does not exist, not sent to a
// sign-in screen for a page that will still not exist afterwards. Nothing here
// reads the session, the database or the API, and nothing here asserts anything
// about a project — it states one fact, that this address has no page.
//
// The two links are safe for a signed-out visitor: "/" is public, and
// "/dashboard" is guarded by ProtectedRoute, which already sends a signed-out
// reader to sign-in honestly. Needing no session check is why this page can be
// rendered for every visitor with a single code path.
export default function NotFoundPage() {
  return (
    <div style={{ fontFamily: "Inter,-apple-system,BlinkMacSystemFont,sans-serif", background: C.bg, color: C.ink, minHeight: "100vh" }}>
      <nav style={{
        position: "sticky", top: 0, zIndex: 50, padding: "0 40px", height: 64,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`,
      }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, background: C.rust, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>S</div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 3, color: C.ink }}>STEELSPEC</span>
        </Link>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 7, color: C.ink2, fontSize: 13, textDecoration: "none" }}>
          <ArrowLeft size={15} /> Back to site
        </Link>
      </nav>

      <section style={{ maxWidth: 560, margin: "0 auto", padding: "88px 24px 100px" }}>
        <div style={{ ...panel, padding: "44px 32px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: C.rust, textTransform: "uppercase", marginBottom: 16, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <span style={{ width: 20, height: 1, background: C.rust }} />404
          </div>

          <h1 style={{ fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 800, letterSpacing: -0.8, marginBottom: 12, color: C.ink }}>
            Page not found
          </h1>
          <p style={{ fontSize: 15, color: C.grey, lineHeight: 1.6, margin: 0 }}>
            There is no page at this address.
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
            <Link to="/" style={{ ...btnRust, textDecoration: "none" }}>Back to the site</Link>
            <Link to="/dashboard" style={{ ...btnGhost, textDecoration: "none" }}>Go to dashboard</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
