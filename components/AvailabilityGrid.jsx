import { BORDER, ACCENT, SURFACE2, MUTED2, SLOT_HOUR_BG, SLOT_BG } from "../styles/theme";
import { formatDateShort } from "../utils/utils";
import { clamp, slotKey } from "../utils/utils";
import { WEEKDAYS } from "../styles/theme";
import { keyToDate } from "../utils/utils";
import { useIsPhone, useViewportSize } from "../hooks/useViewport";

export default function AvailabilityGrid({ eventDates, slots, availability, onCellDown, onCellEnter }) {
  const isPhone = useIsPhone();
  const viewport = useViewportSize();

  const visibleColumns = Math.min(eventDates.length || 1, 5);
  const timeWidth = isPhone ? 42 : 58;
  const columnWidth = isPhone
    ? clamp(Math.floor((viewport.width - 92) / visibleColumns), 42, 56)
    : 62;

  const fillAvailableHeight = Math.max(360, viewport.height - 350);
  const cellHeight = isPhone
    ? clamp(Math.floor(fillAvailableHeight / Math.max(slots.length, 1)), 20, 28)
    : 24;

  const headerHeight = isPhone ? 38 : 42;

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: 18, border: `1px solid ${BORDER}`, background: SURFACE2 }}>
      <div style={{ display: "flex", justifyContent: "center", minWidth: "100%", padding: isPhone ? "8px 8px 10px" : "10px 10px 12px" }}>
        <div style={{ display: "flex", width: "max-content" }}>
          <div style={{ flexShrink: 0, paddingTop: headerHeight }}>
            {slots.map((s) => (
              <div key={s.id} style={{ height: cellHeight, width: timeWidth, display: "flex", alignItems: "center", fontSize: isPhone ? 9 : 10, color: s.isHour ? MUTED2 : "transparent", fontWeight: 600, paddingRight: 6, boxSizing: "border-box" }}>
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
                const k = slotKey(dateKey, s.id);
                const sel = !!availability[k];
                return (
                  <div
                    key={s.id}
                    data-date={dateKey}
                    data-slot={s.id}
                    onMouseDown={() => onCellDown(dateKey, s.id)}
                    onMouseEnter={() => onCellEnter(dateKey, s.id)}
                    onTouchStart={() => onCellDown(dateKey, s.id)}
                    style={{ width: columnWidth, height: cellHeight, background: sel ? ACCENT : s.isHour ? SLOT_HOUR_BG : SLOT_BG, borderTop: s.isHour ? `1px solid ${BORDER}` : "1px solid transparent", borderRight: di < eventDates.length - 1 ? `1px solid ${BORDER}` : "none", cursor: "pointer", boxSizing: "border-box", transition: "background 0.04s", touchAction: "none" }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
