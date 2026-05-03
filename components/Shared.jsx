import { DANGER, MUTED2, ACCENT_DARK, TEXT } from "../styles/theme";
import { miniButton } from "../styles/styles";

export function ErrorBanner({ message }) {
  return (
    <div style={{ background: "rgba(255,107,107,0.08)", border: `1px solid ${DANGER}`, color: DANGER, borderRadius: 18, padding: 14, fontSize: 13, marginBottom: 14 }}>
      {message}
    </div>
  );
}

export function Header({ title, subtitle, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <button onClick={onBack} style={{ ...miniButton, width: 36, height: 36, flexShrink: 0 }}>←</button>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: MUTED2 }}>{subtitle}</p>
        </div>
      </div>
      {right && <div style={{ color: ACCENT_DARK, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>{right}</div>}
    </div>
  );
}
