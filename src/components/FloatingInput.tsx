import { useState } from "react";
import { theme as C } from "../lib/theme";

export function FloatingInput({
  label, type = "text", value, onChange, name, error,
}: { label: string; type?: string; value: string; onChange: (v: string) => void; name: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ position: "relative" }}>
        <input
          id={`ss-input-${name}`}
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
          htmlFor={`ss-input-${name}`}
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
      {error && <div style={{ fontSize: 12, color: "#c44", marginTop: 6, paddingLeft: 2 }}>{error}</div>}
    </div>
  );
}

export function FloatingTextarea({
  label, value, onChange, name, error, rows = 5,
}: { label: string; value: string; onChange: (v: string) => void; name: string; error?: string; rows?: number }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ position: "relative" }}>
        <textarea
          id={`ss-input-${name}`}
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: "14px 15px", background: "#fff",
            border: `1.5px solid ${error ? "#c44" : active ? C.rust : C.border}`,
            borderRadius: 9, color: C.ink, fontSize: 15, fontFamily: "inherit",
            outline: "none", transition: "border-color 0.2s", boxSizing: "border-box", resize: "vertical",
          }}
        />
        <label
          htmlFor={`ss-input-${name}`}
          style={{
            position: "absolute", left: 12, pointerEvents: "none",
            top: active ? -9 : 15, transform: "none",
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
      {error && <div style={{ fontSize: 12, color: "#c44", marginTop: 6, paddingLeft: 2 }}>{error}</div>}
    </div>
  );
}