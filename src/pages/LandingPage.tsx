import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload, ArrowRight, Layers, FileText, Shield, RefreshCw,
  BarChart3, Zap, ChevronDown, Check,
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
      <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${C.rustDark}, ${C.rustLight}, ${C.rustGlow})`, transition: "width 0.1s linear" }} />
    </div>
  );
}

function Reveal({ children, delay = 0, direction = "up" }: { children: ReactNode; delay?: number; direction?: "up" | "down" | "left" | "right" | "scale" }) {
  const [ref, inView] = useInView();
  const transforms: Record<string, string> = {
    up: "translateY(40px)", down: "translateY(-40px)",
    left: "translateX(40px)", right: "translateX(-40px)", scale: "scale(0.95)",
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

// === STEEL FRAME (3D hero visual) ===
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
    background: "linear-gradient(135deg, rgba(196,99,58,0.15), rgba(196,99,58,0.06))",
    border: "1px solid rgba(196,99,58,0.3)", ...extra,
  });
  const glowStyle = (top: any, left: any, delay: number): React.CSSProperties => ({
    position: "absolute", top, left, width: 5, height: 5, borderRadius: "50%",
    background: C.rustGlow, boxShadow: `0 0 14px ${C.rustGlow}`,
    animation: `pulse 3s ease-in-out ${delay}s infinite`,
  });

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove}
      style={{ width: "100%", height: 420, display: "flex", justifyContent: "center", alignItems: "center", perspective: 900 }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:0.3; } 50% { opacity:0.8; } }
        @keyframes floatSpec { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes gridPulse { 0%,100% { opacity:0.03; } 50% { opacity:0.07; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{
        position: "relative", width: 300, height: 320, transformStyle: "preserve-3d",
        transform: `rotateY(${mouseX}deg) rotateX(${mouseY}deg)`, transition: "transform 0.15s ease-out",
      }}>
        <div style={beamStyle({ left: 30, bottom: 0, width: 18, height: 260, background: "linear-gradient(180deg, rgba(196,99,58,0.2), rgba(196,99,58,0.08))" })} />
        <div style={beamStyle({ right: 30, bottom: 0, width: 18, height: 260 })} />
        <div style={beamStyle({ left: 30, top: 50, width: 240, height: 14, background: "linear-gradient(90deg, rgba(196,99,58,0.2), rgba(196,99,58,0.1))" })} />
        <div style={beamStyle({ left: 30, top: 160, width: 240, height: 10, borderStyle: "dashed", opacity: 0.5 })} />
        <div style={beamStyle({ left: 18, top: 46, width: 42, height: 5, background: "rgba(196,99,58,0.25)" })} />
        <div style={beamStyle({ right: 18, top: 46, width: 42, height: 5, background: "rgba(196,99,58,0.25)" })} />
        <div style={beamStyle({ left: 12, bottom: -4, width: 54, height: 6, background: "rgba(196,99,58,0.2)", borderRadius: 1 })} />
        <div style={beamStyle({ right: 12, bottom: -4, width: 54, height: 6, background: "rgba(196,99,58,0.2)", borderRadius: 1 })} />
        <svg style={{ position: "absolute", inset: 0 }} viewBox="0 0 300 320" fill="none">
          <line x1="48" y1="64" x2="252" y2="260" stroke="rgba(196,99,58,0.15)" strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1="252" y1="64" x2="48" y2="260" stroke="rgba(196,99,58,0.15)" strokeWidth="1.5" strokeDasharray="4 3" />
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
            position: "absolute", fontSize: 11, fontFamily: C.mono, color: C.rust, opacity: 0.5,
            whiteSpace: "nowrap", letterSpacing: 1, animation: `floatSpec 4s ease-in-out ${s.delay} infinite`,
            top: s.top, right: s.right, bottom: s.bottom, left: s.left,
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
          padding: "32px 28px", borderRadius: 10,
          border: `1px solid ${hover ? "rgba(196,99,58,0.3)" : "rgba(122,122,122,0.12)"}`,
          background: hover ? C.dark2 : C.dark, transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
          transform: hover ? "translateY(-4px)" : "none",
          boxShadow: hover ? "0 12px 40px rgba(196,99,58,0.08)" : "none", cursor: "default",
        }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          background: `rgba(196,99,58,${hover ? 0.15 : 0.08})`,
          border: `1px solid rgba(196,99,58,${hover ? 0.35 : 0.15})`, marginBottom: 18, transition: "all 0.3s",
        }}>
          <Icon size={20} color={C.rust} strokeWidth={1.5} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: C.cream }}>{title}</h3>
        <p style={{ fontSize: 13, color: C.warmGrey, lineHeight: 1.65, margin: 0 }}>{desc}</p>
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
          alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: C.rust,
          background: C.charcoal, border: `2px solid ${C.rustDark}`, boxShadow: "0 0 20px rgba(196,99,58,0.15)",
        }}>{num}</div>
        <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: C.cream }}>{title}</h4>
        <p style={{ fontSize: 12, color: C.steelLight, lineHeight: 1.55, margin: 0 }}>{desc}</p>
      </div>
    </Reveal>
  );
}

// === MAIN PAGE ===
export default function LandingPage() {
  const navigate = useNavigate();
  const [navSolid, setNavSolid] = useState(false);
  const [uploadHover, setUploadHover] = useState(false);
  const [showProcess, setShowProcess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Parsing model file...");

  useEffect(() => {
    const handler = () => setNavSolid(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (!showProcess) return;
    const stages = [
      { at: 15, t: "Reading structural elements..." }, { at: 35, t: "Matching steel sections..." },
      { at: 55, t: "Identifying connections..." }, { at: 75, t: "Calculating weights..." },
      { at: 90, t: "Building report..." },
    ];
    let p = 0;
    const timer = setInterval(() => {
      p += 1.5;
      if (p > 100) p = 100;
      setProgress(p);
      const s = stages.find((s) => s.at <= p && s.at > p - 1.5);
      if (s) setStage(s.t);
      if (p >= 100) {
        clearInterval(timer);
        setTimeout(() => navigate("/dashboard"), 500);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [showProcess, navigate]);

  const smoothScroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div style={{ fontFamily: "Inter,-apple-system,BlinkMacSystemFont,sans-serif", background: C.charcoal, color: C.cream, minHeight: "100vh", overflowX: "hidden" }}>
      <ScrollProgress />

      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "0 40px", height: 60,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: navSolid ? "rgba(20,20,20,0.92)" : "transparent",
        backdropFilter: navSolid ? "blur(20px)" : "none",
        borderBottom: navSolid ? "1px solid rgba(196,99,58,0.12)" : "1px solid transparent",
        transition: "all 0.4s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: C.rust, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: C.cream }}>S</div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 3, color: C.rust }}>STEELSPEC</span>
        </div>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {["upload", "features", "how"].map((id) => (
            <a key={id} onClick={() => smoothScroll(id)} style={{ color: C.steelLight, fontSize: 13, textDecoration: "none", cursor: "pointer", letterSpacing: 0.5 }}>
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </a>
          ))}
          <a onClick={() => navigate("/dashboard")} style={{ color: C.rust, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Dashboard →
          </a>
        </div>
      </nav>

      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", padding: "120px 40px 80px" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "linear-gradient(rgba(196,99,58,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(196,99,58,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px", animation: "gridPulse 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "30%", right: "20%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,99,58,0.06) 0%, transparent 70%)", filter: "blur(60px)" }} />

        <div style={{ maxWidth: 1200, width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <Reveal>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 4, color: C.rust, textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 20, height: 1, background: C.rust }} />
                STRUCTURAL STEEL TAKEOFF
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 style={{ fontSize: "clamp(36px, 5vw, 58px)", fontWeight: 800, lineHeight: 1.04, letterSpacing: -2, margin: "0 0 22px" }}>
                Steel takeoff,<br /><span style={{ color: C.rust }}>automated.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p style={{ fontSize: 17, color: C.warmGrey, lineHeight: 1.65, maxWidth: 440, margin: "0 0 36px" }}>
                Upload your engineer's IFC or DWG file. Get a complete steel schedule and connection report in minutes — not days.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <button onClick={() => smoothScroll("upload")} style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 28px",
                  background: C.rust, color: C.cream, border: "none", borderRadius: 8, fontSize: 14,
                  fontWeight: 600, cursor: "pointer", transition: "all 0.25s", fontFamily: "inherit",
                }}>
                  Upload your file <ArrowRight size={16} />
                </button>
                <button onClick={() => smoothScroll("how")} style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 28px",
                  background: "transparent", color: C.steelLight, border: `1px solid ${C.steelDark}`,
                  borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                }}>
                  See how it works
                </button>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.2} direction="scale"><SteelFrame /></Reveal>
        </div>

        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: C.steelDark, letterSpacing: 2, textTransform: "uppercase" }}>Scroll</span>
          <ChevronDown size={16} color={C.steelDark} style={{ animation: "floatSpec 2s ease-in-out infinite" }} />
        </div>
      </section>

      <section id="upload" style={{ padding: "100px 40px", background: C.dark, borderTop: "1px solid rgba(196,99,58,0.12)", borderBottom: "1px solid rgba(196,99,58,0.12)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <Reveal><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: C.rust, textTransform: "uppercase", marginBottom: 12 }}>Upload</div></Reveal>
          <Reveal delay={0.1}><h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, marginBottom: 12 }}>Drop your structural file</h2></Reveal>
          <Reveal delay={0.15}><p style={{ fontSize: 15, color: C.warmGrey, lineHeight: 1.6, marginBottom: 40 }}>We'll extract every steel member, section size, length, and connection detail — then generate a professional PDF report.</p></Reveal>
          <Reveal delay={0.2}>
            <div onClick={() => setShowProcess(true)}
              onMouseEnter={() => setUploadHover(true)} onMouseLeave={() => setUploadHover(false)}
              onDragOver={(e) => { e.preventDefault(); setUploadHover(true); }}
              onDragLeave={() => setUploadHover(false)}
              onDrop={(e) => { e.preventDefault(); setUploadHover(false); setShowProcess(true); }}
              style={{
                position: "relative", padding: "52px 32px", borderRadius: 10, cursor: "pointer",
                border: `1.5px dashed ${uploadHover ? C.rust : C.steelDark}`,
                background: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(196,99,58,${uploadHover ? 0.04 : 0.015}) 20px, rgba(196,99,58,${uploadHover ? 0.04 : 0.015}) 21px)`,
                transition: "all 0.3s", boxShadow: uploadHover ? "0 0 40px rgba(196,99,58,0.08)" : "none",
              }}>
              {[{ top: 12, left: 12 }, { top: 12, right: 12 }, { bottom: 12, left: 12 }, { bottom: 12, right: 12 }].map((pos, i) => (
                <div key={i} style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", border: `1px solid ${C.steelDark}`, background: `radial-gradient(circle at 35% 35%, ${C.dark3}, ${C.dark})`, ...pos }} />
              ))}
              <div style={{ width: 56, height: 56, margin: "0 auto 14px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${uploadHover ? C.rust : C.steelDark}`, color: uploadHover ? C.rust : C.steel, transition: "all 0.3s" }}>
                <Upload size={24} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Drop your file here or click to browse</div>
              <div style={{ fontSize: 13, color: C.steelLight }}>We'll handle the rest</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
                {[".IFC", ".DWG", ".DXF"].map((f) => (
                  <span key={f} style={{ padding: "5px 14px", fontSize: 11, fontWeight: 600, letterSpacing: 1, borderRadius: 5, background: "rgba(196,99,58,0.08)", color: C.rust, border: "1px solid rgba(196,99,58,0.18)" }}>{f}</span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ background: C.dark2, borderBottom: "1px solid rgba(196,99,58,0.12)", padding: "52px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-around", textAlign: "center", flexWrap: "wrap", gap: 32 }}>
          {[{ val: 218, suffix: "", label: "Steel sections" }, { val: 29, suffix: "", label: "Fab drawings" }, { val: 100, suffix: "%", label: "NZ/AU standards" }].map((s, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div>
                <div style={{ fontSize: 38, fontWeight: 700, color: C.rust, fontFamily: C.mono, letterSpacing: -1 }}><Counter end={s.val} suffix={s.suffix} /></div>
                <div style={{ fontSize: 11, color: C.steelLight, marginTop: 4, textTransform: "uppercase", letterSpacing: 2, fontWeight: 500 }}>{s.label}</div>
              </div>
            </Reveal>
          ))}
          <Reveal delay={0.3}><div><div style={{ fontSize: 38, fontWeight: 700, color: C.rust, fontFamily: C.mono, letterSpacing: -1 }}>&lt;2min</div><div style={{ fontSize: 11, color: C.steelLight, marginTop: 4, textTransform: "uppercase", letterSpacing: 2, fontWeight: 500 }}>Processing time</div></div></Reveal>
        </div>
      </section>

      <section id="features" style={{ padding: "100px 40px", background: C.charcoal }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Reveal><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: C.rust, textTransform: "uppercase", marginBottom: 12 }}>Features</div></Reveal>
            <Reveal delay={0.1}><h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, marginBottom: 12 }}>Built for fabricators</h2></Reveal>
            <Reveal delay={0.15}><p style={{ fontSize: 15, color: C.warmGrey, maxWidth: 460, margin: "0 auto" }}>Every feature designed around how NZ steel fabricators and estimators actually work.</p></Reveal>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            <FeatureCard icon={Zap} title="Automatic extraction" desc="Steel members, sections, lengths, and weights pulled directly from your engineer's model. No manual data entry." delay={0.05} />
            <FeatureCard icon={Layers} title="Connection reporting" desc="Bolt sizes, grades, plate thicknesses, and weld details extracted and presented alongside the members they connect." delay={0.1} />
            <FeatureCard icon={BarChart3} title="NZ steel database" desc="218 sections across UB, UC, PFC, EA, RHS, SHS, CHS families. All matched to AS/NZS standards." delay={0.15} />
            <FeatureCard icon={FileText} title="Professional PDF output" desc="Steel schedules, connection summaries, and schematic diagrams in a clean report you can hand to your workshop." delay={0.2} />
            <FeatureCard icon={Shield} title="Confidence indicators" desc="Every extracted member flagged with extraction confidence. Review anything uncertain before downloading." delay={0.25} />
            <FeatureCard icon={RefreshCw} title="Multiple formats" desc="IFC, DWG, and DXF files supported. Works with output from Revit, Tekla, ArchiCAD, and standard CAD software." delay={0.3} />
          </div>
        </div>
      </section>

      <section id="how" style={{ padding: "100px 40px", background: C.dark, borderTop: "1px solid rgba(196,99,58,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Reveal><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: C.rust, textTransform: "uppercase", marginBottom: 12 }}>Process</div></Reveal>
          <Reveal delay={0.1}><h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>Three steps to your steel schedule</h2></Reveal>
        </div>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", position: "relative" }}>
          <div style={{ position: "absolute", top: 26, left: 80, right: 80, height: 1, background: `linear-gradient(90deg, ${C.rust}, ${C.steelDark}, ${C.rust})`, opacity: 0.25 }} />
          <Step num="1" title="Upload" desc="Drop your IFC or DWG/DXF file from the structural engineer" delay={0.1} />
          <Step num="2" title="Extract" desc="We parse every steel member, section, and connection detail automatically" delay={0.2} />
          <Step num="3" title="Download" desc="Review the schedule on screen, then download your professional PDF report" delay={0.3} />
        </div>
      </section>

      <section style={{ padding: "100px 40px", background: C.charcoal, borderTop: "1px solid rgba(196,99,58,0.12)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <Reveal><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: C.rust, textTransform: "uppercase", marginBottom: 12 }}>Output</div></Reveal>
          <Reveal delay={0.1}><h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, marginBottom: 12 }}>What you get</h2></Reveal>
          <Reveal delay={0.15}><p style={{ fontSize: 15, color: C.warmGrey, maxWidth: 500, margin: "0 auto 40px" }}>A complete steel package — schedule, connections, and fabrication drawings.</p></Reveal>
          <Reveal delay={0.2}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {[
                { title: "Steel Schedule", items: ["Member marks & sections", "Lengths & quantities", "Weight per member", "Total tonnage"] },
                { title: "Connection Report", items: ["Bolt sizes & grades", "Plate dimensions", "Weld specifications", "Grid references"] },
                { title: "Fab Drawings", items: ["Member elevations", "Fitted plate details", "Bolt hole patterns", "Section views"] },
              ].map((card, i) => (
                <div key={i} style={{ padding: "28px 24px", borderRadius: 10, textAlign: "left", background: C.dark, border: "1px solid rgba(122,122,122,0.12)" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: C.rust }}>{card.title}</h3>
                  {card.items.map((item, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13, color: C.warmGrey }}>
                      <Check size={14} color={C.rust} strokeWidth={2} />{item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ padding: "80px 40px", textAlign: "center", background: C.dark, borderTop: "1px solid rgba(196,99,58,0.12)" }}>
        <Reveal><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: C.rust, textTransform: "uppercase", marginBottom: 12 }}>Ready?</div></Reveal>
        <Reveal delay={0.1}><h2 style={{ fontSize: 30, fontWeight: 700, marginBottom: 28, letterSpacing: -0.5 }}>Stop counting steel by hand</h2></Reveal>
        <Reveal delay={0.2}>
          <button onClick={() => smoothScroll("upload")} style={{ padding: "16px 36px", background: C.rust, color: C.cream, border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Upload your file <span style={{ marginLeft: 6 }}>→</span>
          </button>
        </Reveal>
      </section>

      <footer style={{ padding: "32px 40px", borderTop: "1px solid rgba(122,122,122,0.08)", textAlign: "center", fontSize: 12, color: C.steelDark }}>
        <span style={{ color: C.rust, fontWeight: 700, letterSpacing: 2, fontSize: 11 }}>STEELSPEC</span>
        <div style={{ marginTop: 6 }}>Structural steel takeoff — automated. Built in Auckland, New Zealand.</div>
      </footer>

      {showProcess && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(14,14,14,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.rust, letterSpacing: 3, marginBottom: 32 }}>STEELSPEC</div>
          <div style={{ width: 56, height: 56, borderRadius: "50%", border: `2px solid ${C.dark3}`, borderTopColor: C.rust, animation: "spin 1s linear infinite", marginBottom: 24 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{stage}</div>
          <div style={{ fontSize: 13, color: C.steelLight, marginBottom: 20 }}>WA-2026-0847_Structural.ifc</div>
          <div style={{ width: 300, height: 4, background: C.dark3, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${C.rustDark}, ${C.rustLight})`, borderRadius: 2, transition: "width 0.15s linear" }} />
          </div>
          <div style={{ fontSize: 12, color: C.steelDark, marginTop: 8 }}>{Math.round(progress)}%</div>
        </div>
      )}
    </div>
  );
}
