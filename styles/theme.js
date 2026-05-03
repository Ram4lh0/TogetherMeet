// ─── Font & mobile setup ──────────────────────────────────────────────────────

if (typeof document !== "undefined" && !document.getElementById("pelada-font")) {
  const link = document.createElement("link");
  link.id = "pelada-font";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap";
  document.head.appendChild(link);
}

if (typeof document !== "undefined") {
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1, viewport-fit=cover";
    document.head.appendChild(meta);
  }

  if (!document.getElementById("pelada-mobile-style")) {
    const style = document.createElement("style");
    style.id = "pelada-mobile-style";
    style.textContent = `
      html, body, #root {
        min-height: 100dvh;
        margin: 0;
        background: var(--pelada-bg, #f6fbf3);
      }
      body { transition: background 0.18s ease, color 0.18s ease; }
      * { -webkit-tap-highlight-color: transparent; }
      button, input { font: inherit; }
      input[type="date"], input[type="time"] {
        min-width: 0;
        -webkit-appearance: none;
        background: transparent;
        min-height: 48px;
        display: flex;
        align-items: center;
      }
    `;
    document.head.appendChild(style);
  }
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export const THEME_KEY = "pelada_theme_v1";

export const THEMES = {
  light: {
    label: "claro",
    icon: "☀️",
    vars: {
      "--pelada-accent": "#22c55e",
      "--pelada-accent-dark": "#15803d",
      "--pelada-accent-soft": "#e9fbea",
      "--pelada-bg": "#f6fbf3",
      "--pelada-bg-gradient": "linear-gradient(180deg, #fbfef8 0%, #eef8ec 100%)",
      "--pelada-surface": "#ffffff",
      "--pelada-surface-2": "#ffffff",
      "--pelada-border": "#e3eadf",
      "--pelada-muted": "#94a3b8",
      "--pelada-muted-2": "#64748b",
      "--pelada-text": "#102014",
      "--pelada-danger": "#f43f5e",
      "--pelada-disabled-bg": "#edf2e9",
      "--pelada-slot-hour-bg": "#f3f8ef",
      "--pelada-slot-bg": "#fbfdf9",
      "--pelada-card-shadow": "0 18px 50px rgba(15,23,42,0.08)",
      "--pelada-soft-shadow": "0 14px 34px rgba(15,23,42,0.06)",
      "--pelada-input-shadow": "0 1px 0 rgba(16,32,20,0.02)",
    },
  },
  dark: {
    label: "escuro",
    icon: "🌙",
    vars: {
      "--pelada-accent": "#38d96f",
      "--pelada-accent-dark": "#86efac",
      "--pelada-accent-soft": "rgba(56,217,111,0.14)",
      "--pelada-bg": "#06110a",
      "--pelada-bg-gradient": "linear-gradient(180deg, #07150b 0%, #030705 100%)",
      "--pelada-surface": "#0d1710",
      "--pelada-surface-2": "#101d14",
      "--pelada-border": "#203327",
      "--pelada-muted": "#6b7f72",
      "--pelada-muted-2": "#9fb0a5",
      "--pelada-text": "#eef8f0",
      "--pelada-danger": "#fb7185",
      "--pelada-disabled-bg": "#17231b",
      "--pelada-slot-hour-bg": "#132018",
      "--pelada-slot-bg": "#0d1710",
      "--pelada-card-shadow": "0 18px 50px rgba(0,0,0,0.32)",
      "--pelada-soft-shadow": "0 14px 34px rgba(0,0,0,0.24)",
      "--pelada-input-shadow": "0 1px 0 rgba(255,255,255,0.03)",
    },
  },
};

// ─── CSS variable aliases ─────────────────────────────────────────────────────

export const ACCENT      = "var(--pelada-accent)";
export const ACCENT_DARK = "var(--pelada-accent-dark)";
export const ACCENT_SOFT = "var(--pelada-accent-soft)";
export const SURFACE     = "var(--pelada-surface)";
export const SURFACE2    = "var(--pelada-surface-2)";
export const BORDER      = "var(--pelada-border)";
export const MUTED       = "var(--pelada-muted)";
export const MUTED2      = "var(--pelada-muted-2)";
export const TEXT        = "var(--pelada-text)";
export const DANGER      = "var(--pelada-danger)";
export const DISABLED_BG = "var(--pelada-disabled-bg)";
export const SLOT_HOUR_BG = "var(--pelada-slot-hour-bg)";
export const SLOT_BG     = "var(--pelada-slot-bg)";
export const CARD_SHADOW = "var(--pelada-card-shadow)";
export const SOFT_SHADOW = "var(--pelada-soft-shadow)";
export const INPUT_SHADOW = "var(--pelada-input-shadow)";

// ─── Base layout style ────────────────────────────────────────────────────────

export const BASE = {
  fontFamily: "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  background: "var(--pelada-bg-gradient)",
  minHeight: "100dvh",
  color: TEXT,
};

// ─── Static data ──────────────────────────────────────────────────────────────

export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── Theme helpers ────────────────────────────────────────────────────────────

export function getInitialThemeMode() {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* ignore */ }
  return "light";
}

export function applyThemeMode(mode) {
  if (typeof document === "undefined") return;
  const theme = THEMES[mode] || THEMES.light;
  Object.entries(theme.vars).forEach(([name, value]) => {
    document.documentElement.style.setProperty(name, value);
  });
  document.documentElement.dataset.peladaTheme = mode;
  document.documentElement.style.colorScheme = mode === "dark" ? "dark" : "light";
  document.body.style.background = theme.vars["--pelada-bg"];
}

// Apply theme immediately on module load
if (typeof document !== "undefined") {
  applyThemeMode(getInitialThemeMode());
}
