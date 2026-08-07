import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Clock, Check } from "lucide-react";
import { theme as C } from "../lib/theme";
import { FloatingInput, FloatingTextarea } from "../components/FloatingInput";
import Footer from "../components/Footer";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const next: { name?: string; email?: string; message?: string } = {};
    if (name.trim().length === 0) next.name = "Enter your name";
    if (email.trim().length === 0) next.email = "Enter your email address";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address";
    if (message.trim().length === 0) next.message = "Tell us a bit about what you need";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
  };

  const updateName = (v: string) => { setName(v); if (errors.name) setErrors((e) => ({ ...e, name: undefined })); };
  const updateEmail = (v: string) => { setEmail(v); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); };
  const updateMessage = (v: string) => { setMessage(v); if (errors.message) setErrors((e) => ({ ...e, message: undefined })); };

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

      <section style={{ padding: "72px 24px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: C.rust, textTransform: "uppercase", marginBottom: 14, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
          <span style={{ width: 20, height: 1, background: C.rust }} />Contact
        </div>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 800, letterSpacing: -1, marginBottom: 14, color: C.ink }}>
          Let's talk steel
        </h1>
        <p style={{ fontSize: 15.5, color: C.grey, maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
          Questions about a specific project, pricing, or whether SteelSpec is a fit for your workflow — reach out and we'll get back to you within one business day.
        </p>
      </section>

      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 110px" }}>
        <div className="ss-contact-grid">
          {/* Contact info */}
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
              {[
                { icon: Mail, label: "Email", value: "hello@steelspec.co.nz" },
                { icon: Phone, label: "Phone", value: "+64 9 123 4567" },
                { icon: MapPin, label: "Location", value: "Auckland, New Zealand" },
                { icon: Clock, label: "Response time", value: "Within 1 business day" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: C.rustBg, border: `1px solid ${C.rustBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon size={17} color={C.rust} strokeWidth={1.7} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.greyLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              padding: "24px 22px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: C.ink }}>Talking to a fabricator?</h3>
              <p style={{ fontSize: 13, color: C.grey, lineHeight: 1.65, margin: 0 }}>
                If you've got a real project you'd like to test SteelSpec against, mention it in your message and we'll prioritise getting you set up.
              </p>
            </div>
          </div>

          {/* Contact form */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px 28px", boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}>
            {!submitted ? (
              <form onSubmit={handleSubmit} noValidate>
                <FloatingInput label="Full name" name="contact-name" value={name} onChange={updateName} error={errors.name} />
                <FloatingInput label="Email address" type="email" name="contact-email" value={email} onChange={updateEmail} error={errors.email} />
                <FloatingInput label="Company (optional)" name="contact-company" value={company} onChange={setCompany} />
                <FloatingTextarea label="How can we help?" name="contact-message" value={message} onChange={updateMessage} error={errors.message} rows={5} />

                <button type="submit" style={{
                  width: "100%", marginTop: 22, padding: "14px 18px", background: C.rust, color: "#fff",
                  border: "none", borderRadius: 9, fontSize: 14.5, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", transition: "background 0.2s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.rustLight)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = C.rust)}>
                  Send message
                </button>
              </form>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 12px" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", background: C.greenBg, color: C.green,
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
                }}>
                  <Check size={24} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: C.ink }}>Message sent</h3>
                <p style={{ fontSize: 13.5, color: C.grey, lineHeight: 1.6 }}>
                  Thanks for reaching out — we'll get back to you within one business day.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}