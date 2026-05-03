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

  const navButtonStyle = {
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${BORDER}`,
    color: TEXT,
    cursor: "pointer",
    width: isPhone ? 34 : 42,
    height: isPhone ? 34 : 42,
    borderRadius: 12,
    fontSize: isPhone ? 22 : 26,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Sora', sans-serif",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };

  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%), " + SURFACE,
        color: TEXT,
        borderRadius: isPhone ? 26 : 30,
        padding: isPhone ? "18px 14px 22px" : "26px 28px 34px",
        border: `1px solid ${BORDER}`,
        boxShadow: CARD_SHADOW,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: isPhone ? 18 : 28 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: isPhone ? 18 : 24, fontWeight: 700, letterSpacing: "-0.5px" }}>Que dias queres disponibilizar?</h3>
          <p style={{ margin: "6px 0 0", color: MUTED2, fontSize: isPhone ? 11 : 12 }}>{visibleLabel}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button aria-label="Semana anterior" onClick={onPrevious} style={navButtonStyle}>‹</button>
          <button aria-label="Próxima semana" onClick={onNext} style={navButtonStyle}>›</button>
        </div>
      </div>

      <div style={{ overflowX: isPhone ? "hidden" : "auto", WebkitOverflowScrolling: "touch" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridColumns,
            gap: 0,
            borderBottom: `1px solid ${BORDER}`,
            paddingBottom: isPhone ? 12 : 20,
            minWidth: gridMinWidth,
          }}
        >
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              style={{
                fontSize: isPhone ? 10 : 12,
                fontWeight: 700,
                letterSpacing: "0.35px",
                color: MUTED2,
                textTransform: "uppercase",
              }}
            >
              {d.slice(0, 3)}
            </div>
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
                style={{
                  position: "relative",
                  background: active ? "rgba(34,197,94,0.08)" : "transparent",
                  border: "none",
                  borderRadius: 16,
                  color: TEXT,
                  textAlign: "left",
                  padding: isPhone ? "4px 0 0 4px" : "6px 0 0 6px",
                  cursor: "pointer",
                  fontFamily: "'Sora', sans-serif",
                  minHeight: dayHeight,
                  touchAction: "manipulation",
                }}
              >
                {showMonth && (
                  <span
                    style={{
                      position: "absolute",
                      top: isPhone ? 2 : 3,
                      left: isPhone ? 4 : 6,
                      color: ACCENT,
                      fontSize: isPhone ? 9 : 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    {MONTHS[date.getMonth()].slice(0, 3)}
                  </span>
                )}
                <span
                  style={{
                    position: "absolute",
                    top: showMonth ? (isPhone ? 23 : 31) : isPhone ? 16 : 24,
                    left: isPhone ? 5 : 7,
                    width: active ? activeSize : isPhone ? 30 : 34,
                    height: active ? activeSize : isPhone ? 30 : 34,
                    borderRadius: "50%",
                    border: !active && isToday ? `1px solid ${ACCENT}` : "1px solid transparent",
                    background: active ? "#22c55e" : "transparent",
                    color: active ? "#fff" : TEXT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isPhone ? 13 : 14,
                    fontWeight: active ? 700 : 600,
                    boxShadow: active ? "0 8px 18px rgba(34,197,94,0.25)" : "none",
                    transition: "all 150ms ease",
                  }}
                >
                  {date.getDate()}
                </span>
                {!active && isToday && (
                  <span
                    style={{
                      position: "absolute",
                      top: showMonth ? (isPhone ? 50 : 58) : isPhone ? 43 : 50,
                      left: isPhone ? 17 : 20,
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: ACCENT,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
