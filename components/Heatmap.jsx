import { useState, useRef } from "react";
import {
  SURFACE, SURFACE2, BORDER, ACCENT, ACCENT_DARK, MUTED2, TEXT,
  SLOT_HOUR_BG, SLOT_BG, SOFT_SHADOW,
} from "../styles/theme";
import { WEEKDAYS } from "../styles/theme";
import { miniButton, sectionTitle } from "../styles/styles";
import { formatDateShort, formatSlotInterval, keyToDate, clamp } from "../utils/utils";
import { useIsPhone, useViewportSize } from "../hooks/useViewport";

export default function Heatmap({ eventDates, slots, max, getCount, getNames }) {
  const isPhone = useIsPhone();
  const viewport = useViewportSize();
  const [selectedSlot, setSelectedSlot] = useState(null);
  const peoplePanelRef = useRef(null);

  const visibleColumns = Math.min(eventDates.length || 1, 5);
  const timeWidth = isPhone ? 42 : 58;
  const columnWidth = isPhone
    ? clamp(Math.floor((viewport.width - 92) / visibleColumns), 42, 56)
    : 62;

  const heatmapAvailableHeight = Math.max(300, viewport.height - 360);
  const cellHeight = isPhone
    ? clamp(Math.floor(heatmapAvailableHeight / Math.max(slots.length, 1)), 14, 24)
    : 24;

  const headerHeight = isPhone ? 36 : 42;

  const selectedCount = selectedSlot ? getCount(selectedSlot.dateKey, selectedSlot.slotId) : 0;
  const selectedNames = selectedSlot ? getNames(selectedSlot.dateKey, selectedSlot.slotId) : [];

  const toggleSlot = (dateKey, slot) => {
    const sameSlot = selectedSlot?.dateKey === dateKey && selectedSlot?.slotId === slot.id;
    setSelectedSlot(sameSlot ? null : { dateKey, slotId: slot.id, label: slot.label, dayOffset: slot.dayOffset });
    if (!sameSlot && isPhone) {
      window.setTimeout(() => {
        const el = peoplePanelRef.current;
        if (!el) return;
        const elRect = el.getBoundingClientRect();
        const elCenter = elRect.top + elRect.height / 2;
        const viewCenter = window.innerHeight / 2;
        window.scrollBy({ top: elCenter - viewCenter, behavior: "smooth" });
      }, 120);
    }
  };

  return (
    <div style={{ display: isPhone ? "block" : "grid", gridTemplateColumns: "minmax(0, 1fr) 290px", gap: 16, alignItems: "start", marginTop: isPhone ? 14 : 18 }}>
      <div>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: 24, border: `1px solid ${BORDER}`, background: SURFACE2, boxShadow: SOFT_SHADOW }}>
          <div style={{ display: "flex", justifyContent: "center", minWidth: "100%", padding: isPhone ? "8px 8px 10px" : "10px 10px 12px" }}>
            <div style={{ display: "flex", width: "max-content" }}>
              <div style={{ flexShrink: 0, paddingTop: headerHeight }}>
                {slots.map((s) => (
                  <div key={s.id} style={{ height: cellHeight, width: timeWidth, display: "flex", alignItems: "center", fontSize: isPhone ? 9 : 10, color: s.isHour ? MUTED2 : "transparent", fontWeight: 700, paddingRight: 6, boxSizing: "border-box" }}>
                    {s.label} {s.dayOffset ? "+1" : ""}
                  </div>
                ))}
              </div>

              {eventDates.map((dateKey, di) => (
                <div key={dateKey} style={{ flexShrink: 0 }}>
                  <div style={{ height: headerHeight, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: columnWidth }}>
                    <strong style={{ fontSize: isPhone ? 11 : 12 }}>{formatDateShort(dateKey)}</strong>
                    <span style={{ color: MUTED2, fontSize: isPhone ? 9 : 10 }}>{WEEKDAYS[(keyToDate(dateKey).getDay() + 6) % 7]}</span>
                  </div>

                  {slots.map((s) => {
                    const count = getCount(dateKey, s.id);
                    const intensity = count / max;
                    const bg = count === 0 ? (s.isHour ? SLOT_HOUR_BG : SLOT_BG) : `rgba(34, 197, 94, ${0.16 + intensity * 0.78})`;
                    const names = getNames(dateKey, s.id).join(", ");
                    const isSelected = selectedSlot?.dateKey === dateKey && selectedSlot?.slotId === s.id;
                    const slotInterval = formatSlotInterval(dateKey, s.id);

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSlot(dateKey, s)}
                        aria-label={`${slotInterval.date}, ${slotInterval.range}: ${count} ${count === 1 ? "disponível" : "disponíveis"}`}
                        title={`${slotInterval.date} ${slotInterval.range}: ${count}/${max}${names ? ` · ${names}` : ""}`}
                        style={{
                          width: columnWidth, height: cellHeight, background: bg, border: "none",
                          borderTop: s.isHour ? `1px solid ${BORDER}` : "1px solid transparent",
                          borderRight: di < eventDates.length - 1 ? `1px solid ${BORDER}` : "none",
                          boxSizing: "border-box",
                          color: count > 0 && intensity > 0.58 ? "#fff" : TEXT,
                          fontSize: isPhone ? 9 : 10, display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 900, cursor: "pointer",
                          outline: isSelected ? `2px solid ${ACCENT_DARK}` : "none",
                          outlineOffset: isSelected ? -2 : 0,
                          boxShadow: isSelected ? "inset 0 0 0 2px #fff, 0 0 0 3px rgba(34,197,94,0.32)" : "none",
                          transform: isSelected ? "scale(1.03)" : "scale(1)",
                          position: "relative", zIndex: isSelected ? 2 : 1, touchAction: "manipulation",
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: isPhone ? "center" : "flex-start", gap: 5, fontSize: 11, color: MUTED2 }}>
          <span>0</span>
          {[0.1, 0.3, 0.5, 0.7, 0.85, 1].map((v, i) => (
            <div key={i} style={{ width: isPhone ? 16 : 18, height: 9, borderRadius: 999, background: `rgba(34, 197, 94, ${0.16 + v * 0.78})` }} />
          ))}
          <span>{max}</span>
        </div>
      </div>

      <div ref={peoplePanelRef} style={{ scrollMarginTop: 18 }}>
        {(selectedSlot || !isPhone) && (
          <SlotPeoplePanel
            selectedSlot={selectedSlot}
            selectedCount={selectedCount}
            selectedNames={selectedNames}
            onClose={() => setSelectedSlot(null)}
            isPhone={isPhone}
          />
        )}
      </div>
    </div>
  );
}

function SlotPeoplePanel({ selectedSlot, selectedCount, selectedNames, onClose, isPhone }) {
  if (!selectedSlot) {
    return (
      <aside style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 16, color: MUTED2, fontSize: 13, position: "sticky", top: 16, boxShadow: SOFT_SHADOW }}>
        Carrega num slot do heatmap para veres quem está disponível.
      </aside>
    );
  }

  const slotInterval = formatSlotInterval(selectedSlot.dateKey, selectedSlot.slotId);

  return (
    <aside style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 22, padding: 16, marginTop: isPhone ? 14 : 0, position: isPhone ? "static" : "sticky", top: 16, boxShadow: "0 18px 50px rgba(0,0,0,0.28)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <p style={{ ...sectionTitle, marginBottom: 6 }}>Disponíveis neste slot</p>
          <h3 style={{ margin: 0, fontSize: 16 }}>{slotInterval.date}</h3>
          <p style={{ margin: "4px 0 0", color: TEXT, fontSize: 14, fontWeight: 900 }}>
            {slotInterval.range}{slotInterval.endDate ? ` · acaba em ${slotInterval.endDate}` : ""}
          </p>
          <p style={{ margin: "6px 0 0", color: ACCENT_DARK, fontSize: 13, fontWeight: 900 }}>
            {selectedCount} pessoa{selectedCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={onClose} style={{ ...miniButton, width: 32, height: 32 }}>×</button>
      </div>

      {selectedNames.length > 0 ? (
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          {selectedNames.map((name) => (
            <div key={name} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>
              {name}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: "14px 0 0", color: MUTED2, fontSize: 13 }}>Ainda ninguém marcou este horário.</p>
      )}
    </aside>
  );
}
