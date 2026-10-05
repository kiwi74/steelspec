// SteelSpec shared design tokens
// Single source of truth for colours across LandingPage and Dashboard

export const theme = {
  // Dark theme (public landing page)
  charcoal: "#141414",
  dark: "#1a1a1a",
  dark2: "#222222",
  dark3: "#2a2a2a",

  // Rust accent (used in both dark + light themes)
  rust: "#c4633a",
  rustLight: "#d4722a",
  rustDark: "#9e4e2c",
  rustGlow: "#e8854a",

  // Steel greys (dark theme)
  steel: "#7a7a7a",
  steelLight: "#999999",
  steelDark: "#555555",

  // Warm neutrals (dark theme)
  cream: "#f5ede4",
  warmGrey: "#a09888",

  // Light theme (dashboard)
  rustBg: "#faf1ec",
  rustBorder: "#eeddd3",
  ink: "#1a1a1a",
  ink2: "#444444",
  // Contrast pass: the previous pair (#8a857e / #b5b0a8) sat at roughly 3.5:1
  // and 2.1:1 on the card and page backgrounds, both under the 4.5:1 WCAG AA
  // needs for the 10–13px text these carry. The ramp is shifted down one step,
  // keeping the same warm hue and the same two tiers: `grey` now clears AA on
  // both #ffffff and #faf9f7, and `greyLight` is a quiet label tone.
  grey: "#767068",
  greyLight: "#8a857e",
  bg: "#faf9f7",
  card: "#ffffff",
  border: "#e9e5df",
  borderLight: "#f1eee9",

  // Status colours (shared)
  green: "#2d8a4e",
  greenBg: "#edf7f0",
  amber: "#b07d18",
  amberBg: "#faf4e6",
  blue: "#2d5f8a",
  blueBg: "#ecf2f8",

  // Error red. Same values the app already used as literals (#c44 expands to
  // #cc4444), named here so an error state cannot drift into a different red.
  red: "#cc4444",
  redBg: "#fbeaea",
  redBorder: "rgba(204,68,68,0.25)",

  mono: "'SF Mono','Fira Code','Cascadia Code',monospace",
} as const;

export type Theme = typeof theme;
