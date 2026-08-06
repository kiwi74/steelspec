import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Layers, FileText, Shield, RefreshCw,
  BarChart3, Zap, ChevronDown, Check, Menu, X, Mail,
} from "lucide-react";
import { theme as C } from "../lib/theme";

// === HOOKS ===
function useInView(options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.15, ...options }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView] as const;
}

function Counter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [ref, inView] = useInView();
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handler = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, zIndex: 200 }}>
      <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${C.rustDark}, ${C.rustLight}, ${C.rust})`, transition: "width 0.1s linear" }} />
    </div>
  );
}

function Reveal({ children, delay = 0, direction = "up" }: { children: ReactNode; delay?: number; direction?: "up" | "down" | "left" | "right" | "scale" }) {
  const [ref, inView] = useInView();
  const transforms: Record<string, string> = {
    up: "translateY(32px)", down: "translateY(-32px)",
    left: "translateX(32px)", right: "translateX(-32px)", scale: "scale(0.96)",
  };
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "none" : transforms[direction],
      transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}

// === STEEL FRAME (3D hero visual, restyled for white background) ===
function SteelFrame() {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMouseX(((e.clientX - rect.left) / rect.width - 0.5) * 20);
    setMouseY(((e.clientY - rect.top) / rect.height - 0.5) * -15);
  }, []);

  const beamStyle = (extra: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    background: "linear-gradient(135deg, rgba(196,99,58,0.85), rgba(196,99,58,0.65))",
    border: "1px solid rgba(158,78,44,0.9)",
    boxShadow: "0 4px 14px rgba(196,99,58,0.18)",
    ...extra,
  });
  const glowStyle = (top: any, left: any, delay: number): React.CSSProperties => ({
    position: "absolute", top, left, width: 6, height: 6, borderRadius: "50%",
    background: C.rust, boxShadow: `0 0 12px ${C.rustLight}`,
    animation: `pulse 3s ease-in-out ${delay}s infinite`,
  });

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove}
      style={{ width: "100%", height: 420, display: "flex", justifyContent: "center", alignItems: "center", perspective: 900, maxWidth: "100%", overflow: "hidden" }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        @keyframes floatSpec { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ss-frame-scale { transform: scale(1); }
        @media (max-width: 480px) { .ss-frame-scale { transform: scale(0.72); } }
      `}</style>
      <div className="ss-frame-scale" style={{
        position: "relative", width: 300, height: 320, transformStyle: "preserve-3d",
        transform: `rotateY(${mouseX}deg) rotateX(${mouseY}deg)`, transition: "transform 0.15s ease-out",
      }}>
        <div style={beamStyle({ left: 30, bottom: 0, width: 18, height: 260 })} />
        <div style={beamStyle({ right: 30, bottom: 0, width: 18, height: 260 })} />
        <div style={beamStyle({ left: 30, top: 50, width: 240, height: 14 })} />
        <div style={beamStyle({ left: 30, top: 160, width: 240, height: 8, opacity: 0.5, borderStyle: "dashed" })} />
        <div style={beamStyle({ left: 18, top: 46, width: 42, height: 6 })} />
        <div style={beamStyle({ right: 18, top: 46, width: 42, height: 6 })} />
        <div style={beamStyle({ left: 12, bottom: -4, width: 54, height: 7, borderRadius: 1 })} />
        <div style={beamStyle({ right: 12, bottom: -4, width: 54, height: 7, borderRadius: 1 })} />
        <svg style={{ position: "absolute", inset: 0 }} viewBox="0 0 300 320" fill="none">
          <line x1="48" y1="64" x2="252" y2="260" stroke="rgba(196,99,58,0.35)" strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1="252" y1="64" x2="48" y2="260" stroke="rgba(196,99,58,0.35)" strokeWidth="1.5" strokeDasharray="4 3" />
        </svg>
        <div style={glowStyle(47, 30, 0)} />
        <div style={glowStyle(47, 252, 0.8)} />
        <div style={{ ...glowStyle(0, 0, 0.4), top: "auto", bottom: 0, left: 30 }} />
        <div style={{ ...glowStyle(0, 0, 1.2), top: "auto", bottom: 0, right: 30, left: "auto" }} />
        {[
          { text: "310UB40.4", top: 20, right: -90, delay: "0s" },
          { text: "Gr 300PLUS", bottom: 30, left: -100, delay: "1.5s" },
          { text: "5017 mm", top: "45%", right: -110, delay: "0.7s" },
          { text: "M20 Gr8.8", bottom: 80, right: -85, delay: "2s" },
        ].map((s, i) => (
          <div key={i} style={{
            position: "absolute", fontSize: 11, fontFamily: C.mono, color: C.rustDark, opacity: 0.7,
            whiteSpace: "nowrap", letterSpacing: 1, animation: `floatSpec 4s ease-in-out ${s.delay} infinite`,
            top: s.top, right: s.right, bottom: s.bottom, left: s.left, fontWeight: 600,
          }}>{s.text}</div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, delay }: { icon: any; title: string; desc: string; delay: number }) {
  const [hover, setHover] = useState(false);
  return (
    <Reveal delay={delay}>
      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          padding: "32px 28px", borderRadius: 12,
          border: `1px solid ${hover ? C.rustBorder : C.border}`,
          background: hover ? C.rustBg : C.card, transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
          transform: hover ? "translateY(-4px)" : "none",
          boxShadow: hover ? "0 12px 32px rgba(196,99,58,0.1)" : "0 1px 2px rgba(0,0,0,0.02)", cursor: "default",
        }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          background: C.rustBg, border: `1px solid ${C.rustBorder}`, marginBottom: 18, transition: "all 0.3s",
        }}>
          <Icon size={20} color={C.rust} strokeWidth={1.5} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: C.ink }}>{title}</h3>
        <p style={{ fontSize: 13, color: C.grey, lineHeight: 1.65, margin: 0 }}>{desc}</p>
      </div>
    </Reveal>
  );
}

function Step({ num, title, desc, delay }: { num: string; title: string; desc: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div style={{ textAlign: "center", flex: 1, position: "relative", padding: "0 12px" }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", margin: "0 auto 16px", display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff",
          background: C.rust, boxShadow: "0 4px 16px rgba(196,99,58,0.28)",
        }}>{num}</div>
        <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: C.ink }}>{title}</h4>
        <p style={{ fontSize: 12, color: C.grey, lineHeight: 1.55, margin: 0 }}>{desc}</p>
      </div>
    </Reveal>
  );
}

// === OUTPUT SAMPLE MOCKUPS ===

function ScheduleMock() {
  const rows = [
    { mark: "B1", section: "310UB40.4", len: "5017", qty: "1", kg: "222.0" },
    { mark: "B2", section: "200UB25.4", len: "12635", qty: "1", kg: "326.7" },
    { mark: "C1", section: "150UC30.0", len: "2700", qty: "2", kg: "162.0" },
    { mark: "BR1", section: "75x75x6EA", len: "3200", qty: "4", kg: "87.2" },
  ];
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}>
      <div style={{ background: C.rust, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>STEEL MEMBER SCHEDULE</span>
        <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 10.5, fontFamily: C.mono }}>Henderson Residence</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
        <thead>
          <tr style={{ background: C.bg }}>
            {["Mark", "Section", "Length", "Qty", "kg"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 9.5, fontWeight: 700, color: C.greyLight, textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: `1px solid ${C.borderLight}` }}>
              <td style={{ padding: "8px 12px", fontFamily: C.mono, fontWeight: 600 }}>{r.mark}</td>
              <td style={{ padding: "8px 12px", fontFamily: C.mono, color: C.ink2 }}>{r.section}</td>
              <td style={{ padding: "8px 12px", fontFamily: C.mono, color: C.grey }}>{r.len}</td>
              <td style={{ padding: "8px 12px", fontFamily: C.mono, color: C.grey }}>{r.qty}</td>
              <td style={{ padding: "8px 12px", fontFamily: C.mono, color: C.grey }}>{r.kg}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: "10px 16px", background: C.bg, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 11 }}>
        <span style={{ color: C.grey }}>37 members · 13 sections</span>
        <span style={{ fontWeight: 700, color: C.rust }}>3.09 tonnes total</span>
      </div>
    </div>
  );
}

function ConnectionMock() {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}>
      <div style={{ background: C.rust, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>CONNECTION CN004</span>
        <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 10.5, fontFamily: C.mono }}>Grid C1</span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12.5, color: C.ink2, marginBottom: 12, fontWeight: 500 }}>
          Upper beam B4 to Column C2 — bolted end plate
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            ["Bolts", "6× M20 Gr8.8"],
            ["Plate", "16mm × 200 × 340"],
            ["Gauge / Pitch", "90 / 70mm"],
            ["Detail ref", "D2"],
          ].map(([l, v]) => (
            <div key={l} style={{ padding: "8px 10px", background: C.bg, borderRadius: 7, border: `1px solid ${C.borderLight}` }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, color: C.greyLight }}>{l}</div>
              <div style={{ fontSize: 12, fontWeight: 600, fontFamily: C.mono, marginTop: 1 }}>{v}</div>
            </div>
          ))}
        </div>
        {/* mini schematic */}
        <div style={{ marginTop: 14, height: 74, position: "relative", background: C.bg, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
          <div style={{ position: "absolute", left: "38%", top: 8, bottom: 8, width: 12, background: "rgba(196,99,58,0.25)", border: "1px solid rgba(196,99,58,0.5)" }} />
          <div style={{ position: "absolute", left: "44%", top: "42%", width: "42%", height: 10, background: "rgba(196,99,58,0.25)", border: "1px solid rgba(196,99,58,0.5)" }} />
          {[0, 1].map((r) => (
            <div key={r} style={{ position: "absolute", left: "50%", top: `${34 + r * 20}%`, width: 5, height: 5, borderRadius: "50%", background: C.rust }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FabDrawingMock() {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}>
      <div style={{ background: C.rust, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>FAB DRAWING — MARK 005</span>
        <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 10.5, fontFamily: C.mono }}>310UB40.4</span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ height: 110, position: "relative", background: C.bg, borderRadius: 8, border: `1px solid ${C.borderLight}`, marginBottom: 12 }}>
          {/* beam */}
          <div style={{ position: "absolute", left: "12%", right: "30%", top: "44%", height: 14, background: "rgba(196,99,58,0.22)", border: "1px solid rgba(196,99,58,0.5)" }} />
          <div style={{ position: "absolute", left: "12%", right: "30%", top: "36%", height: 4, background: "rgba(196,99,58,0.35)" }} />
          <div style={{ position: "absolute", left: "12%", right: "30%", top: "58%", height: 4, background: "rgba(196,99,58,0.35)" }} />
          {/* end plate */}
          <div style={{ position: "absolute", right: "26%", top: "26%", bottom: "26%", width: 8, background: C.rustDark }} />
          {/* bolts */}
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ position: "absolute", right: "23%", top: `${30 + (i % 2) * 34}%`, left: i > 1 ? "auto" : undefined, width: 5, height: 5, borderRadius: "50%", border: `1px solid ${C.rustDark}`, background: "#fff" }} />
          ))}
          <div style={{ position: "absolute", left: "12%", right: "30%", bottom: 6, textAlign: "center", fontSize: 9, fontFamily: C.mono, color: C.grey }}>5017 LG</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
          <span style={{ color: C.grey }}>PL008 end plate · 4× M22</span>
          <span style={{ fontWeight: 700, color: C.rust }}>222.0 kg</span>
        </div>
      </div>
    </div>
  );
}

// Custom social icons (lucide-react no longer ships brand/logo icons)
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

// === FLOATING LABEL INPUT ===
function FloatingInput({
  label, type = "text", value, onChange, name,
}: { label: string; type?: string; value: string; onChange: (v: string) => void; name: string }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div style={{ position: "relative", marginTop: 10 }}>
      <input
        id={`ss-auth-${name}`}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "13px 14px", background: "transparent",
          border: `1.5px solid ${active ? "#c4633a" : "rgba(245,237,228,0.22)"}`,
          borderRadius: 8, color: "#f5ede4", fontSize: 14, fontFamily: "inherit",
          outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
        }}
      />
      <label
        htmlFor={`ss-auth-${name}`}
        style={{
          position: "absolute", left: 11, pointerEvents: "none",
          top: active ? -8 : "50%", transform: active ? "none" : "translateY(-50%)",
          fontSize: active ? 11 : 14, padding: active ? "0 5px" : 0,
          background: active ? "#1a1a1a" : "transparent",
          color: active ? "#c4633a" : "rgba(245,237,228,0.5)",
          transition: "all 0.15s ease-out", fontWeight: active ? 600 : 400,
          letterSpacing: active ? 0.3 : 0,
        }}
      >
        {label}
      </label>
    </div>
  );
}

// === AUTH POPOVER (sign in / sign up) ===
function AuthPopover({ onClose, align = "right" }: { onClose: () => void; align?: "left" | "right" | "center" }) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  const positionStyle: React.CSSProperties = align === "center"
    ? { left: "50%", transform: "translateX(-50%)" }
    : align === "left" ? { left: 0 } : { right: 0 };

  return (
    <div ref={popRef} style={{
      position: "absolute", top: "calc(100% + 12px)",
      ...positionStyle,
      width: 340, maxWidth: "calc(100vw - 32px)",
      background: "#1a1a1a", borderRadius: 14, padding: 28,
      boxShadow: "0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(245,237,228,0.06)",
      zIndex: 200, color: "#f5ede4",
    }}>
      <button onClick={onClose} aria-label="Close" style={{
        position: "absolute", top: 16, right: 16, background: "none", border: "none",
        color: "rgba(245,237,228,0.5)", cursor: "pointer", padding: 4,
      }}>
        <X size={16} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 22 }}>
        <div style={{ width: 26, height: 26, background: "#c4633a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#f5ede4" }}>S</div>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 2.5, color: "#c4633a" }}>STEELSPEC</span>
      </div>

      <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6, color: "#fff" }}>
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </h3>
      <p style={{ fontSize: 12.5, color: "rgba(245,237,228,0.55)", marginBottom: 20, lineHeight: 1.5 }}>
        {mode === "signup"
          ? "Start turning steel models into schedules in minutes."
          : "Sign in to pick up where you left off."}
      </p>

      <form onSubmit={handleSubmit}>
        {mode === "signup" && (
          <FloatingInput label="Full name" name="name" value={name} onChange={setName} />
        )}
        <FloatingInput label="Email address" type="email" name="email" value={email} onChange={setEmail} />
        <FloatingInput label="Password" type="password" name="password" value={password} onChange={setPassword} />

        <button type="submit" style={{
          width: "100%", marginTop: 20, padding: "13px 18px", background: "#c4633a", color: "#fff",
          border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit", transition: "background 0.2s",
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#d4722a")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#c4633a")}>
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 18, fontSize: 12.5, color: "rgba(245,237,228,0.5)" }}>
        {mode === "signup" ? (
          <>Already have an account?{" "}
            <a onClick={() => setMode("signin")} style={{ color: "#c4633a", fontWeight: 600, cursor: "pointer" }}>Sign in</a>
          </>
        ) : (
          <>New to SteelSpec?{" "}
            <a onClick={() => setMode("signup")} style={{ color: "#c4633a", fontWeight: 600, cursor: "pointer" }}>Create an account</a>
          </>
        )}
      </div>
    </div>
  );
}

// === MAIN PAGE ===
export default function LandingPage() {
  const navigate = useNavigate();
  const [navSolid, setNavSolid] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const handler = () => setNavSolid(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const smoothScroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const goToDashboard = () => navigate("/dashboard");

  const navLinks = ["output", "features", "how"];

  return (
    <div style={{ fontFamily: "Inter,-apple-system,BlinkMacSystemFont,sans-serif", background: C.bg, color: C.ink, minHeight: "100vh", overflowX: "hidden" }}>
      <ScrollProgress />

      <nav className="ss-nav" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "0 40px", height: 64,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: navSolid || mobileMenuOpen ? "rgba(255,255,255,0.92)" : "transparent",
        backdropFilter: navSolid || mobileMenuOpen ? "blur(20px)" : "none",
        borderBottom: navSolid ? `1px solid ${C.border}` : "1px solid transparent",
        transition: "all 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: C.rust, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0 }}>S</div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 3, color: C.ink }}>STEELSPEC</span>
        </div>

        <div className="ss-nav-links ss-nav-desktop" style={{ display: "flex", gap: 28, alignItems: "center", position: "relative" }}>
          {navLinks.map((id) => (
            <a key={id} onClick={() => smoothScroll(id)} style={{ color: C.ink2, fontSize: 13, textDecoration: "none", cursor: "pointer", letterSpacing: 0.3 }}>
              {id === "output" ? "Sample Output" : id === "how" ? "How it works" : id.charAt(0).toUpperCase() + id.slice(1)}
            </a>
          ))}
          <button onClick={() => setAuthOpen((v) => !v)} style={{
            padding: "9px 18px", background: C.rust, color: "#fff", border: "none", borderRadius: 7,
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            Dashboard
          </button>
          {authOpen && <AuthPopover onClose={() => setAuthOpen(false)} align="right" />}
        </div>

        <button
          className="ss-nav-mobile-btn"
          onClick={() => setMobileMenuOpen((v) => !v)}
          style={{ display: "none", background: "none", border: "none", color: C.ink, padding: 6, cursor: "pointer" }}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div style={{
          position: "fixed", top: 64, left: 0, right: 0, zIndex: 99,
          background: "rgba(255,255,255,0.98)", backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", padding: "8px 20px 20px",
        }}>
          {navLinks.map((id) => (
            <a key={id} onClick={() => { smoothScroll(id); setMobileMenuOpen(false); }}
              style={{ color: C.ink2, fontSize: 15, textDecoration: "none", cursor: "pointer", padding: "14px 4px", borderBottom: `1px solid ${C.borderLight}` }}>
              {id === "output" ? "Sample Output" : id === "how" ? "How it works" : id.charAt(0).toUpperCase() + id.slice(1)}
            </a>
          ))}
          <div style={{ position: "relative", marginTop: 14 }}>
            <button onClick={() => setAuthOpen((v) => !v)} style={{
              width: "100%", padding: "12px 18px", background: C.rust, color: "#fff", border: "none", borderRadius: 7,
              fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>
              Dashboard
            </button>
            {authOpen && <AuthPopover onClose={() => setAuthOpen(false)} align="center" />}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          .ss-nav-desktop { display: none !important; }
          .ss-nav-mobile-btn { display: flex !important; align-items: center; justify-content: center; }
        }
      `}</style>

      {/* HERO */}
      <section className="ss-hero ss-section" style={{ minHeight: "92vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.035, backgroundImage: "linear-gradient(rgba(196,99,58,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(196,99,58,0.6) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div style={{ position: "absolute", top: "25%", right: "15%", width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,99,58,0.08) 0%, transparent 70%)", filter: "blur(50px)" }} />

        <div className="ss-hero-content">
          <div>
            <Reveal>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 4, color: C.rust, textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 20, height: 1, background: C.rust }} />
                STRUCTURAL STEEL TAKEOFF
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 style={{ fontSize: "clamp(32px, 8vw, 58px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, margin: "0 0 22px", color: C.ink }}>
                Steel takeoff,<br /><span style={{ color: C.rust }}>automated.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p style={{ fontSize: 17, color: C.grey, lineHeight: 1.65, maxWidth: 440, margin: "0 auto 36px" }}>
                Upload your engineer's IFC or DWG file. Get a complete steel schedule and connection report in minutes — not days. Price the job same-day instead of losing an evening to a manual count.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="ss-cta-row">
                <button onClick={goToDashboard} style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 28px",
                  background: C.rust, color: "#fff", border: "none", borderRadius: 8, fontSize: 14,
                  fontWeight: 600, cursor: "pointer", transition: "all 0.25s", fontFamily: "inherit",
                  boxShadow: "0 6px 20px rgba(196,99,58,0.25)",
                }}>
                  Go to Dashboard <ArrowRight size={16} />
                </button>
                <button onClick={() => smoothScroll("output")} style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 28px",
                  background: "transparent", color: C.ink2, border: `1px solid ${C.border}`,
                  borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                }}>
                  See sample output
                </button>
              </div>
            </Reveal>
          </div>
          <div className="ss-frame-wrap">
            <Reveal delay={0.2} direction="scale"><SteelFrame /></Reveal>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: C.greyLight, letterSpacing: 2, textTransform: "uppercase" }}>Scroll</span>
          <ChevronDown size={16} color={C.greyLight} style={{ animation: "floatSpec 2s ease-in-out infinite" }} />
        </div>
      </section>

      {/* STATS */}
      <section className="ss-section" style={{ background: C.card, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "48px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-around", textAlign: "center", flexWrap: "wrap", gap: 32 }}>
          {[{ val: 218, suffix: "", label: "Steel sections" }, { val: 29, suffix: "", label: "Fab drawings" }, { val: 100, suffix: "%", label: "NZ/AU standards" }].map((s, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div>
                <div style={{ fontSize: 36, fontWeight: 700, color: C.rust, fontFamily: C.mono, letterSpacing: -1 }}><Counter end={s.val} suffix={s.suffix} /></div>
                <div style={{ fontSize: 11, color: C.grey, marginTop: 4, textTransform: "uppercase", letterSpacing: 2, fontWeight: 500 }}>{s.label}</div>
              </div>
            </Reveal>
          ))}
          <Reveal delay={0.3}><div><div style={{ fontSize: 36, fontWeight: 700, color: C.rust, fontFamily: C.mono, letterSpacing: -1 }}>&lt;2min</div><div style={{ fontSize: 11, color: C.grey, marginTop: 4, textTransform: "uppercase", letterSpacing: 2, fontWeight: 500 }}>Processing time</div></div></Reveal>
        </div>
      </section>

      {/* SAMPLE OUTPUT */}
      <section id="output" className="ss-section" style={{ padding: "110px 40px", background: C.bg }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <Reveal><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: C.rust, textTransform: "uppercase", marginBottom: 12, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}><span style={{ width: 20, height: 1, background: C.rust }} />Sample Output</div></Reveal>
            <Reveal delay={0.1}><h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.6, marginBottom: 14, color: C.ink }}>See exactly what you get</h2></Reveal>
            <Reveal delay={0.15}><p style={{ fontSize: 15.5, color: C.grey, maxWidth: 560, margin: "0 auto", lineHeight: 1.65 }}>Three parts to every takeoff — the schedule you quote from, the connection detail your fabricator needs, and the drawing your workshop cuts to.</p></Reveal>
          </div>

          {/* Row 1: Schedule */}
          <div className="ss-output-row">
            <Reveal direction="left">
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.rust, textTransform: "uppercase", marginBottom: 10 }}>01 · Steel Schedule</div>
                <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 14, color: C.ink, letterSpacing: -0.4 }}>Every member, itemised and weighed</h3>
                <p style={{ fontSize: 14.5, color: C.grey, lineHeight: 1.7, marginBottom: 18 }}>
                  Mark numbers, sections, lengths, quantities, and weights — extracted straight from the engineer's model and matched against 218 NZ/AU steel sections. No manual counting, no misread callouts.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["Total tonnage calculated instantly", "Grouped by section family and member type", "Ready to quote from the same day it lands"].map((b) => (
                    <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13.5, color: C.ink2 }}>
                      <Check size={15} color={C.rust} strokeWidth={2.5} style={{ marginTop: 2, flexShrink: 0 }} />{b}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1} direction="right"><ScheduleMock /></Reveal>
          </div>

          {/* Row 2: Connection */}
          <div className="ss-output-row ss-output-row-reverse">
            <Reveal direction="right">
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.rust, textTransform: "uppercase", marginBottom: 10 }}>02 · Connection Report</div>
                <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 14, color: C.ink, letterSpacing: -0.4 }}>Bolts, plates and welds — already decided</h3>
                <p style={{ fontSize: 14.5, color: C.grey, lineHeight: 1.7, marginBottom: 18 }}>
                  Every connection the engineer specified — bolt size and grade, plate dimensions, weld callouts — pulled out and organised by grid reference, so nothing gets missed between drawing and workshop.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["Reports what's already specified — no design decisions made for you", "Cross-referenced to the members it connects", "Schematic diagram alongside every bolt group"].map((b) => (
                    <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13.5, color: C.ink2 }}>
                      <Check size={15} color={C.rust} strokeWidth={2.5} style={{ marginTop: 2, flexShrink: 0 }} />{b}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1} direction="left"><ConnectionMock /></Reveal>
          </div>

          {/* Row 3: Fab drawing */}
          <div className="ss-output-row">
            <Reveal direction="left">
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.rust, textTransform: "uppercase", marginBottom: 10 }}>03 · Fabrication Drawing</div>
                <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 14, color: C.ink, letterSpacing: -0.4 }}>Shop-ready, per mark</h3>
                <p style={{ fontSize: 14.5, color: C.grey, lineHeight: 1.7, marginBottom: 18 }}>
                  A dedicated drawing for every mark — member elevation, fitted plates, bolt hole patterns, and section views — laid out the way your workshop already reads them.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["One page per mark, dimensioned and labelled", "Matches standard NZ fabrication drawing conventions", "Roadmap feature — available on eligible projects"].map((b) => (
                    <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13.5, color: C.ink2 }}>
                      <Check size={15} color={C.rust} strokeWidth={2.5} style={{ marginTop: 2, flexShrink: 0 }} />{b}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1} direction="right"><FabDrawingMock /></Reveal>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="ss-section" style={{ padding: "100px 40px", background: C.card, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Reveal><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: C.rust, textTransform: "uppercase", marginBottom: 12 }}>Features</div></Reveal>
            <Reveal delay={0.1}><h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, marginBottom: 12, color: C.ink }}>Built for fabricators</h2></Reveal>
            <Reveal delay={0.15}><p style={{ fontSize: 15, color: C.grey, maxWidth: 460, margin: "0 auto" }}>Every feature designed around how NZ steel fabricators and estimators actually work.</p></Reveal>
          </div>
          <div className="ss-features-grid">
            <FeatureCard icon={Zap} title="Automatic extraction" desc="Steel members, sections, lengths, and weights pulled directly from your engineer's model. No manual data entry." delay={0.05} />
            <FeatureCard icon={Layers} title="Connection reporting" desc="Bolt sizes, grades, plate thicknesses, and weld details extracted and presented alongside the members they connect." delay={0.1} />
            <FeatureCard icon={BarChart3} title="NZ steel database" desc="218 sections across UB, UC, PFC, EA, RHS, SHS, CHS families. All matched to AS/NZS standards." delay={0.15} />
            <FeatureCard icon={FileText} title="Professional PDF output" desc="Steel schedules, connection summaries, and schematic diagrams in a clean report you can hand to your workshop." delay={0.2} />
            <FeatureCard icon={Shield} title="Confidence indicators" desc="Every extracted member flagged with extraction confidence. Review anything uncertain before downloading." delay={0.25} />
            <FeatureCard icon={RefreshCw} title="Multiple formats" desc="IFC, DWG, and DXF files supported. Works with output from Revit, Tekla, ArchiCAD, and standard CAD software." delay={0.3} />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="ss-section" style={{ padding: "100px 40px", background: C.bg, borderTop: `1px solid ${C.border}` }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Reveal><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: C.rust, textTransform: "uppercase", marginBottom: 12 }}>Process</div></Reveal>
          <Reveal delay={0.1}><h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, color: C.ink }}>Three steps to your steel schedule</h2></Reveal>
        </div>
        <div className="ss-steps">
          <div style={{ position: "absolute", top: 26, left: 80, right: 80, height: 1, background: `linear-gradient(90deg, transparent, ${C.rustBorder}, transparent)` }} />
          <Step num="1" title="Upload" desc="Drop your IFC or DWG/DXF file from the structural engineer" delay={0.1} />
          <Step num="2" title="Extract" desc="We parse every steel member, section, and connection detail automatically" delay={0.2} />
          <Step num="3" title="Download" desc="Review the schedule on screen, then download your professional PDF report" delay={0.3} />
        </div>
      </section>

      {/* CTA */}
      <section className="ss-section" style={{ padding: "90px 40px", textAlign: "center", background: C.rust, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.08, backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
        <div style={{ position: "relative" }}>
          <Reveal><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", marginBottom: 12 }}>Ready?</div></Reveal>
          <Reveal delay={0.1}><h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 28, letterSpacing: -0.5, color: "#fff" }}>Stop counting steel by hand</h2></Reveal>
          <Reveal delay={0.2}>
            <button onClick={goToDashboard} style={{
              padding: "16px 36px", background: "#fff", color: C.rust, border: "none", borderRadius: 8,
              fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}>
              Go to Dashboard <span style={{ marginLeft: 6 }}>→</span>
            </button>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

// === FOOTER (dark, GoodFi-style) ===
function Footer() {
  const linkCol = (title: string, links: string[]) => (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(245,237,228,0.4)", marginBottom: 16 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {links.map((l) => (
          <a key={l} style={{ fontSize: 13.5, color: "rgba(245,237,228,0.75)", textDecoration: "none", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e8854a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(245,237,228,0.75)")}>
            {l}
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

          {linkCol("Product", ["Sample Output", "Features", "How it works", "Dashboard"])}
          {linkCol("Company", ["About", "Contact", "Support"])}
          {linkCol("Legal", ["Privacy Policy", "Terms of Service"])}
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