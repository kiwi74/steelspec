import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronDown, ArrowLeft } from "lucide-react";
import { theme as C } from "../lib/theme";
import Footer from "../components/Footer";

const FAQS: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: "Getting started",
    items: [
      {
        q: "What file formats does SteelSpec accept?",
        a: "IFC (BIM models from Revit, Tekla, or ArchiCAD), and DWG/DXF (CAD drawings). IFC extractions carry higher confidence since section properties are already structured in the model; DWG/DXF extractions go through a review step before you download.",
      },
      {
        q: "Do I need the source model, or will a PDF work?",
        a: "SteelSpec needs the source IFC or DWG/DXF file — not a PDF export. If you've only received a PDF at quoting stage, ask your engineer for the underlying model file, which most structural engineering software can export directly.",
      },
      {
        q: "How long does a takeoff take?",
        a: "Most residential and light commercial models process in under two minutes. Larger or more complex models with hundreds of members may take a little longer.",
      },
    ],
  },
  {
    category: "What you get",
    items: [
      {
        q: "What's actually in the PDF report?",
        a: "A full steel member schedule (mark, section, length, quantity, weight), a connection summary (bolts, plates, welds by grid reference), and total tonnage. Fabrication drawings for individual marks are available on eligible projects.",
      },
      {
        q: "Does SteelSpec design connections?",
        a: "No. SteelSpec reports and itemises connection details that your structural engineer has already specified in the model — it does not perform structural design or make engineering decisions. Always verify extracted data against the original drawings before fabrication.",
      },
      {
        q: "How accurate is the extraction?",
        a: "IFC extractions are typically high-confidence since the data is already structured. DWG/DXF extractions rely on matching text labels to geometry, so we flag anything uncertain and ask you to confirm it before the report is finalised.",
      },
    ],
  },
  {
    category: "Pricing & billing",
    items: [
      {
        q: "How does pricing work?",
        a: "Pay-as-you-go: $199 (+GST) per takeoff, billed when you download the report. If you're running five or more takeoffs a month, the Workshop plan at $749/month works out cheaper per job.",
      },
      {
        q: "Can I see the extracted data before I pay?",
        a: "Yes. The full steel schedule and connection summary are visible on screen as soon as processing finishes. Payment only unlocks the downloadable PDF.",
      },
      {
        q: "What payment methods are supported?",
        a: "Card payments are supported today. BlinkPay open banking is coming soon, pending approval — once live, you'll be able to pay directly from your business bank account with no card fees.",
      },
    ],
  },
  {
    category: "Security & data",
    items: [
      {
        q: "Is my project data kept private?",
        a: "Yes. Uploaded files and extracted data are only accessible within your account and are never shared with other users or third parties.",
      },
      {
        q: "How long do you keep my files?",
        a: "Uploaded models and generated reports remain in your project history for as long as your account is active, so you can re-download past reports at any time.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.borderLight}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 4px", background: "none", border: "none", cursor: "pointer",
          textAlign: "left", fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: C.ink, paddingRight: 16 }}>{q}</span>
        <ChevronDown
          size={18}
          color={open ? C.rust : C.grey}
          style={{ flexShrink: 0, transition: "transform 0.25s", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>
      <div style={{
        maxHeight: open ? 300 : 0, overflow: "hidden", transition: "max-height 0.3s ease-out",
      }}>
        <p style={{ fontSize: 13.5, color: C.grey, lineHeight: 1.7, padding: "0 4px 20px", margin: 0 }}>{a}</p>
      </div>
    </div>
  );
}

export default function FAQPage() {
  const navigate = useNavigate();

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

      <section style={{ padding: "72px 24px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: C.rust, textTransform: "uppercase", marginBottom: 14, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
          <span style={{ width: 20, height: 1, background: C.rust }} />FAQ
        </div>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 800, letterSpacing: -1, marginBottom: 14, color: C.ink }}>
          Frequently asked questions
        </h1>
        <p style={{ fontSize: 15.5, color: C.grey, maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
          Everything you need to know about how SteelSpec works, what it produces, and how billing works.
        </p>
      </section>

      <section style={{ maxWidth: 720, margin: "0 auto", padding: "20px 24px 100px" }}>
        {FAQS.map((group) => (
          <div key={group.category} style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.rust, textTransform: "uppercase", marginBottom: 8 }}>
              {group.category}
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "4px 20px" }}>
              {group.items.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}

        <div style={{
          marginTop: 48, padding: "32px 28px", background: C.rust, borderRadius: 14, textAlign: "center",
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Still have questions?</h3>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.85)", marginBottom: 20 }}>
            We're happy to walk through your specific project before you upload anything.
          </p>
          <button onClick={() => navigate("/signup")} style={{
            padding: "12px 26px", background: "#fff", color: C.rust, border: "none", borderRadius: 8,
            fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            Get started
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}