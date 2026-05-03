import { SURFACE, BORDER, ACCENT, ACCENT_DARK, ACCENT_SOFT, MUTED2 } from "../styles/theme";
import { sectionTitle } from "../styles/styles";
import { formatSlotInterval } from "../utils/utils";
import { useIsPhone } from "../hooks/useViewport";

export default function BestOptionsList({ bestOptions }) {
  const isPhone = useIsPhone();

  if (!bestOptions.length) {
    return (
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 14, color: MUTED2, fontSize: 13, marginBottom: isPhone ? 12 : 16 }}>
        Ainda não há opções suficientes. Assim que alguém responder, as melhores horas aparecem aqui.
      </div>
    );
  }

  return (
    <div style={{ marginTop: isPhone ? 16 : 20, marginBottom: isPhone ? 12 : 16 }}>
      <p style={sectionTitle}>Melhores opções</p>
      <div style={{ display: "grid", gap: 8 }}>
        {bestOptions.map((o, index) => {
          const interval = formatSlotInterval(o.dateKey, o.slotId, o.durationSlots * 30);
          const durationLabel = o.durationSlots === 3 ? "90 min" : "60 min";
          return (
            <div key={`${o.dateKey}-${o.slotId}`} style={{ background: SURFACE, border: `1px solid ${index === 0 ? ACCENT : BORDER}`, borderRadius: 18, padding: isPhone ? 12 : 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, boxShadow: index === 0 ? "0 14px 30px rgba(34,197,94,0.12)" : "none" }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: isPhone ? 13 : 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {index + 1}. {interval.date} · {interval.range} <span style={{ color: MUTED2, fontWeight: 600 }}>({durationLabel})</span>
                </strong>
                <div style={{ color: MUTED2, fontSize: 12, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {o.names.join(", ")}
                </div>
              </div>
              <div style={{ color: ACCENT_DARK, fontWeight: 900, background: ACCENT_SOFT, borderRadius: 999, padding: "7px 10px", fontSize: 13, flexShrink: 0 }}>{o.count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
