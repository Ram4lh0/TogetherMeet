import {
  SURFACE, BORDER, TEXT, MUTED2, ACCENT_DARK, ACCENT_SOFT,
  CARD_SHADOW, SOFT_SHADOW, INPUT_SHADOW,
} from "./theme";

export const buttonBase = {
  border: "none",
  borderRadius: 18,
  padding: "13px 18px",
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: "-0.25px",
  fontFamily: "'Sora', sans-serif",
  cursor: "pointer",
  minHeight: 48,
  touchAction: "manipulation",
};

export const inputStyle = {
  width: "100%",
  background: SURFACE,
  border: `1.5px solid ${BORDER}`,
  borderRadius: 18,
  padding: "14px 16px",
  fontSize: 16,
  color: TEXT,
  fontFamily: "'Sora', sans-serif",
  outline: "none",
  boxSizing: "border-box",
  boxShadow: INPUT_SHADOW,
};

export const modalCardStyle = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 30,
  padding: 24,
  boxShadow: CARD_SHADOW,
};

export const eventNameCardStyle = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 24,
  padding: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  boxShadow: SOFT_SHADOW,
};

export const rangeCardStyle = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 24,
  padding: 16,
  boxShadow: SOFT_SHADOW,
};

export const miniButton = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  color: TEXT,
  cursor: "pointer",
  width: 34,
  height: 34,
  borderRadius: 10,
  fontSize: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'Sora', sans-serif",
};

export const labelStyle = {
  color: MUTED2,
  fontSize: 12,
  fontWeight: 700,
};

export const sectionTitle = {
  fontSize: 10,
  color: "var(--pelada-muted)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.7px",
  margin: "0 0 10px",
};
