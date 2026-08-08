import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { theme as C } from "../lib/theme";
import { useAuth } from "../lib/AuthContext";

function FloatingInput({
  label, type = "text", value, onChange, name, error,
}: { label: string; type?: string; value: string; onChange: (v: string) => void; name: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ position: "relative" }}>
        <input
          id={`ss-authpage-${name}`}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: "14px 15px", background: "#fff",
            border: `1.5px solid ${error ? "#c44" : active ? C.rust : C.border}`,
            borderRadius: 9, color: C.ink, fontSize: 15, fontFamily: "inherit",
            outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
          }}
        />
        <label
          htmlFor={`ss-authpage-${name}`}
          style={{
            position: "absolute", left: 12, pointerEvents: "none",
            top: active ? -9 : "50%", transform: active ? "none" : "translateY(-50%)",
            fontSize: active ? 11.5 : 15, padding: active ? "0 6px" : 0,
            background: active ? "#fff" : "transparent",
            color: error ? "#c44" : active ? C.rust : C.grey,
            transition: "all 0.15s ease-out", fontWeight: active ? 600 : 400,
            letterSpacing: active ? 0.3 : 0,
          }}
        >
          {label}
        </label>
      </div>
      {error && (
        <div style={{ fontSize: 12, color: "#c44", marginTop: 6, paddingLeft: 2 }}>{error}</div>
      )}
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { signUp, signIn, session } = useAuth();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "signin" ? "signin" : "signup";
  const [mode, setMode] = useState<"signup" | "signin">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  useEffect(() => {
    setMode(searchParams.get("mode") === "signin" ? "signin" : "signup");
    setErrors({});
    setServerError(null);
  }, [searchParams]);

  // Already signed in? Skip straight to the dashboard.
  useEffect(() => {
    if (session) navigate("/dashboard", { replace: true });
  }, [session, navigate]);

  const validate = () => {
    const next: { name?: string; email?: string; password?: string } = {};
    if (mode === "signup" && name.trim().length === 0) {
      next.name = "Enter your full name";
    }
    if (email.trim().length === 0) {
      next.email = "Enter your email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (password.length === 0) {
      next.password = "Enter your password";
    } else if (mode === "signup" && password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const friendlyError = (msg: string): string => {
    if (/already registered|already exists|User already registered/i.test(msg)) {
      return "An account with that email already exists. Try signing in instead.";
    }
    if (/invalid login credentials/i.test(msg)) {
      return "Incorrect email or password.";
    }
    if (/email not confirmed/i.test(msg)) {
      return "Please check your inbox and confirm your email before signing in.";
    }
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setSubmitting(true);
    if (mode === "signup") {
      const { error, needsConfirmation } = await signUp(email.trim(), password, name.trim());
      setSubmitting(false);
      if (error) {
        setServerError(friendlyError(error));
        return;
      }
      if (needsConfirmation) {
        setNeedsConfirmation(true);
        return;
      }
      navigate("/dashboard");
    } else {
      const { error } = await signIn(email.trim(), password);
      setSubmitting(false);
      if (error) {
        setServerError(friendlyError(error));
        return;
      }
      navigate("/dashboard");
    }
  };

  const updateName = (v: string) => { setName(v); if (errors.name) setErrors((e) => ({ ...e, name: undefined })); };
  const updateEmail = (v: string) => { setEmail(v); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); };
  const updatePassword = (v: string) => { setPassword(v); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.ink,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Inter,-apple-system,BlinkMacSystemFont,sans-serif", padding: 24, position: "relative",
    }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.035, backgroundImage: "linear-gradient(rgba(196,99,58,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(196,99,58,0.6) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      <div style={{ position: "absolute", top: "20%", right: "18%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,99,58,0.08) 0%, transparent 70%)", filter: "blur(60px)" }} />

      <Link to="/" style={{
        position: "absolute", top: 28, left: 28, display: "flex", alignItems: "center", gap: 7,
        color: C.grey, fontSize: 13, textDecoration: "none", zIndex: 2,
      }}>
        <ArrowLeft size={15} /> Back to site
      </Link>

      <div style={{
        width: "100%", maxWidth: 400, background: "#fff", borderRadius: 16, padding: "40px 36px",
        boxShadow: "0 30px 80px rgba(0,0,0,0.1), 0 0 0 1px " + C.border, position: "relative", zIndex: 1,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, justifyContent: "center" }}>
          <div style={{ width: 30, height: 30, background: C.rust, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>S</div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 3, color: C.rust }}>STEELSPEC</span>
        </div>

        {/* Mode tabs */}
        {needsConfirmation ? (
          <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: C.greenBg, color: C.green,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 24,
            }}>
              ✓
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: C.ink }}>Check your inbox</h1>
            <p style={{ fontSize: 13.5, color: C.grey, lineHeight: 1.65, marginBottom: 24 }}>
              We've sent a confirmation link to <strong style={{ color: C.ink }}>{email}</strong>. Click it to activate your account, then come back and sign in.
            </p>
            <button onClick={() => { setNeedsConfirmation(false); navigate("/signup?mode=signin", { replace: true }); }} style={{
              width: "100%", padding: "13px 18px", background: "transparent", color: C.rust,
              border: `1.5px solid ${C.rustBorder}`, borderRadius: 9, fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Back to sign in
            </button>
          </div>
        ) : (
        <>
        <div style={{ display: "flex", background: C.bg, borderRadius: 9, padding: 4, marginBottom: 26, border: `1px solid ${C.borderLight}` }}>
          {(["signup", "signin"] as const).map((m) => (
            <button key={m} onClick={() => navigate(`/signup${m === "signin" ? "?mode=signin" : ""}`, { replace: true })}
              style={{
                flex: 1, padding: "9px 0", border: "none", borderRadius: 6, cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s",
                background: mode === m ? C.rust : "transparent",
                color: mode === m ? "#fff" : C.grey,
              }}>
              {m === "signup" ? "Sign Up" : "Sign In"}
            </button>
          ))}
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, textAlign: "center", color: C.ink }}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p style={{ fontSize: 13, color: C.grey, marginBottom: 8, lineHeight: 1.55, textAlign: "center" }}>
          {mode === "signup"
            ? "Start turning steel models into schedules in minutes."
            : "Sign in to pick up where you left off."}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {mode === "signup" && (
            <FloatingInput label="Full name" name="name" value={name} onChange={updateName} error={errors.name} />
          )}
          <FloatingInput label="Email address" type="email" name="email" value={email} onChange={updateEmail} error={errors.email} />
          <FloatingInput label="Password" type="password" name="password" value={password} onChange={updatePassword} error={errors.password} />

          {mode === "signin" && (
            <div style={{ textAlign: "right", marginTop: 10 }}>
              <a style={{ fontSize: 12.5, color: C.grey, cursor: "pointer" }}>Forgot password?</a>
            </div>
          )}

          {serverError && (
            <div style={{
              marginTop: 16, padding: "10px 14px", background: "rgba(204,68,68,0.06)",
              border: "1px solid rgba(204,68,68,0.25)", borderRadius: 8, color: "#c44", fontSize: 12.5,
            }}>
              {serverError}
            </div>
          )}

          <button type="submit" disabled={submitting} style={{
            width: "100%", marginTop: 24, padding: "14px 18px", background: C.rust, color: "#fff",
            border: "none", borderRadius: 9, fontSize: 14.5, fontWeight: 700,
            cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1,
            fontFamily: "inherit", transition: "background 0.2s",
          }}
            onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = C.rustLight; }}
            onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = C.rust; }}>
            {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: 12.5, color: C.grey }}>
          By continuing you agree to our{" "}
          <a style={{ color: C.ink2, cursor: "pointer" }}>Terms</a> and{" "}
          <a style={{ color: C.ink2, cursor: "pointer" }}>Privacy Policy</a>.
        </div>
        </>
        )}
      </div>
    </div>
  );
}