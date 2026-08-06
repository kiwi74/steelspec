import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { theme as C } from "../lib/theme";

function FloatingInput({
  label, type = "text", value, onChange, name,
}: { label: string; type?: string; value: string; onChange: (v: string) => void; name: string }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div style={{ position: "relative", marginTop: 18 }}>
      <input
        id={`ss-authpage-${name}`}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "14px 15px", background: "transparent",
          border: `1.5px solid ${active ? C.rust : "rgba(245,237,228,0.22)"}`,
          borderRadius: 9, color: "#f5ede4", fontSize: 15, fontFamily: "inherit",
          outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
        }}
      />
      <label
        htmlFor={`ss-authpage-${name}`}
        style={{
          position: "absolute", left: 12, pointerEvents: "none",
          top: active ? -9 : "50%", transform: active ? "none" : "translateY(-50%)",
          fontSize: active ? 11.5 : 15, padding: active ? "0 6px" : 0,
          background: active ? "#1a1a1a" : "transparent",
          color: active ? C.rust : "rgba(245,237,228,0.5)",
          transition: "all 0.15s ease-out", fontWeight: active ? 600 : 400,
          letterSpacing: active ? 0.3 : 0,
        }}
      >
        {label}
      </label>
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "signin" ? "signin" : "signup";
  const [mode, setMode] = useState<"signup" | "signin">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setMode(searchParams.get("mode") === "signin" ? "signin" : "signup");
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#141414", color: "#f5ede4",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Inter,-apple-system,BlinkMacSystemFont,sans-serif", padding: 24, position: "relative",
    }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.035, backgroundImage: "linear-gradient(rgba(196,99,58,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(196,99,58,0.6) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      <div style={{ position: "absolute", top: "20%", right: "18%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,99,58,0.1) 0%, transparent 70%)", filter: "blur(60px)" }} />

      <Link to="/" style={{
        position: "absolute", top: 28, left: 28, display: "flex", alignItems: "center", gap: 7,
        color: "rgba(245,237,228,0.6)", fontSize: 13, textDecoration: "none", zIndex: 2,
      }}>
        <ArrowLeft size={15} /> Home
      </Link>

      <div style={{
        width: "100%", maxWidth: 400, background: "#1a1a1a", borderRadius: 16, padding: "40px 36px",
        boxShadow: "0 30px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,237,228,0.06)", position: "relative", zIndex: 1,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, justifyContent: "center" }}>
          <div style={{ width: 30, height: 30, background: C.rust, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#f5ede4" }}>S</div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 3, color: C.rust }}>STEELSPEC</span>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", background: "rgba(245,237,228,0.05)", borderRadius: 9, padding: 4, marginBottom: 26 }}>
          {(["signup", "signin"] as const).map((m) => (
            <button key={m} onClick={() => navigate(`/signup${m === "signin" ? "?mode=signin" : ""}`, { replace: true })}
              style={{
                flex: 1, padding: "9px 0", border: "none", borderRadius: 6, cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s",
                background: mode === m ? C.rust : "transparent",
                color: mode === m ? "#fff" : "rgba(245,237,228,0.55)",
              }}>
              {m === "signup" ? "Sign Up" : "Sign In"}
            </button>
          ))}
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, textAlign: "center", color: "#fff" }}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p style={{ fontSize: 13, color: "rgba(245,237,228,0.55)", marginBottom: 8, lineHeight: 1.55, textAlign: "center" }}>
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

          {mode === "signin" && (
            <div style={{ textAlign: "right", marginTop: 10 }}>
              <a style={{ fontSize: 12.5, color: "rgba(245,237,228,0.5)", cursor: "pointer" }}>Forgot password?</a>
            </div>
          )}

          <button type="submit" style={{
            width: "100%", marginTop: 24, padding: "14px 18px", background: C.rust, color: "#fff",
            border: "none", borderRadius: 9, fontSize: 14.5, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", transition: "background 0.2s",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.rustLight)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.rust)}>
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: 12.5, color: "rgba(245,237,228,0.45)" }}>
          By continuing you agree to our{" "}
          <a style={{ color: "rgba(245,237,228,0.7)", cursor: "pointer" }}>Terms</a> and{" "}
          <a style={{ color: "rgba(245,237,228,0.7)", cursor: "pointer" }}>Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}