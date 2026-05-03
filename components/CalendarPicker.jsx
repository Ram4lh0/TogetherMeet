import {
  SURFACE, BORDER, TEXT, ACCENT, MUTED2, CARD_SHADOW,
  MONTHS, WEEKDAYS,
} from "../styles/theme";
import { dateToKey, getRollingCalendarDays } from "../utils/utils";
import { useIsPhone } from "../hooks/useViewport";

export default function IntegratedCalendarPicker({ startDate, selectedDates, onToggleDate, onPrevious, onNext }) {
  const isPhone = useIsPhone();
  const days = getRollingCalendarDays(startDate, 4);
  const visibleLabel = `${MONTHS[startDate.getMonth()].slice(0, 3)} ${startDate.getFullYear()} → ${MONTHS[days[days.length - 1].getMonth()].slice(0, 3)} ${days[days.length - 1].getFullYear()}`;
  const gridColumns = isPhone ? "repeat(7, minmax(38px, 1fr))" : "repeat(7, minmax(88px, 1fr))";
  const gridMinWidth = isPhone ? "100%" : 680;
  const dayHeight = isPhone ? 58 : 82;
  const activeSize = isPhone ? 38 : 48;

  return (
    <div style={{ background: SURFACE, color: TEXT, borderRadius: isPhone ? 26 : 30, padding: isPhone ? "18px 14px 22px" : "26px 28px 34px", border: `1px solid ${BORDER}`, boxShadow: CARD_SHADOW, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: isPhone ? 18 : 28 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: isPhone ? 18 : 24, fontWeight: 600, letterSpacing: "-0.5px" }}>Que dias queres disponibilizar?</h3>
          <p style={{ margin: "6px 0 0", color: MUTED2, fontSize: 12 }}>{visibleLabel}</p>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={onPrevious} style={{ background: "transparent", border: "none", color: TEXT, cursor: "pointer", width: isPhone ? 34 : 42, height: isPhone ? 34 : 42, borderRadius: 12, fontSize: isPhone ? 34 : 44, lineHeight: "28px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif" }}>‹</button>
          <button onClick={onNext} style={{ background: "transparent", border: "none", color: TEXT, cursor: "pointer", width: isPhone ? 34 : 42, height: isPhone ? 34 : 42, borderRadius: 12, fontSize: isPhone ? 34 : 44, lineHeight: "28px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif" }}>›</button>
        </div>
      </div>

      <div style={{ overflowX: isPhone ? "hidden" : "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 0, borderBottom: `1px solid ${BORDER}`, paddingBottom: isPhone ? 12 : 20, minWidth: gridMinWidth }}>
          {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((d) => (
            <div key={d} style={{ fontSize: isPhone ? 10 : 13, fontWeight: 600, letterSpacing: "0.2px", color: MUTED2 }}>{d}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: gridColumns, gridAutoRows: dayHeight, minWidth: gridMinWidth, paddingTop: isPhone ? 12 : 18 }}>
          {days.map((date, index) => {
            const key = dateToKey(date);
            const active = !!selectedDates[key];
            const showMonth = index === 0 || date.getDate() === 1;
            const isToday = key === dateToKey(new Date());

            return (
              <button
                key={key}
                onClick={() => onToggleDate(key)}
                style={{ position: "relative", background: "transparent", border: "none", color: TEXT, textAlign: "left", padding: 0, cursor: "pointer", fontFamily: "'Sora', sans-serif", minHeight: dayHeight, touchAction: "manipulation" }}
              >
                {showMonth && (
                  <span style={{ position: "absolute", top: 0, left: 0, color: ACCENT, fontSize: isPhone ? 9 : 12, fontWeight: 600, textTransform: "uppercase" }}>
                    {MONTHS[date.getMonth()].slice(0, 3)}
                  </span>
                )}
                <span style={{ position: "absolute", top: showMonth ? (isPhone ? 22 : 30) : isPhone ? 16 : 24, left: 0, width: active ? activeSize : "auto", height: active ? activeSize : "auto", borderRadius: active ? "50%" : 0, background: active ? "#22c55e" : "transparent", color: active ? "#fff" : TEXT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isPhone ? 13 : 14, fontWeight: active ? 700 : 500, boxShadow: active ? "0 8px 18px rgba(34,197,94,0.22)" : "none" }}>
                  {date.getDate()}
                </span>
                {!active && isToday && (
                  <span style={{ position: "absolute", top: showMonth ? (isPhone ? 46 : 54) : isPhone ? 40 : 48, left: 2, width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
