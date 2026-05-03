import { THEMES, BORDER, ACCENT_DARK } from "../styles/theme";
import { miniButton } from "../styles/styles";

export default function TopBar({ profile, themeMode, onToggleTheme, onProfile, onHome }) {
  const theme = THEMES[themeMode] || THEMES.light;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 999,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 16px",
      paddingTop: "calc(10px + env(safe-area-inset-top))",
      background: "var(--pelada-surface)",
      borderBottom: `1px solid ${BORDER}`,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
    }}>
      <button
        onClick={onHome}
        style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Sora', sans-serif", fontWeight: 900, fontSize: 16, color: ACCENT_DARK, padding: 0 }}
      >
        ⚽ Pelada
      </button>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={onToggleTheme}
          aria-label="Mudar tema"
          style={{ ...miniButton, gap: 6, padding: "0 10px", width: "auto", fontSize: 12, fontWeight: 800 }}
        >
          <span>{theme.icon}</span>
        </button>

        {profile && (
          <button
            onClick={onProfile}
            style={{ ...miniButton, width: "auto", paddingInline: 12, fontSize: 12, fontWeight: 800, gap: 6 }}
          >
            👤 {profile.display_name.split(" ")[0]}
          </button>
        )}
      </div>
    </div>
  );
}
