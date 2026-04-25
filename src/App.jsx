import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Font
if (typeof document !== "undefined" && !document.getElementById("pelada-font")) {
  const link = document.createElement("link");
  link.id = "pelada-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap";
  document.head.appendChild(link);
}

// Mobile/iPhone friendly defaults
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
      html, body, #root { min-height: 100dvh; margin: 0; background: var(--pelada-bg, #f6fbf3); }
      body { transition: background 0.18s ease, color 0.18s ease; }
      * { -webkit-tap-highlight-color: transparent; }
      button, input { font: inherit; }
    `;
    document.head.appendChild(style);
  }
}

const STORAGE_KEY = "pelada_events_v1";

const THEME_KEY = "pelada_theme_v1";

const THEMES = {
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

const ACCENT = "var(--pelada-accent)";
const ACCENT_DARK = "var(--pelada-accent-dark)";
const ACCENT_SOFT = "var(--pelada-accent-soft)";
const BG = "var(--pelada-bg)";
const SURFACE = "var(--pelada-surface)";
const SURFACE2 = "var(--pelada-surface-2)";
const BORDER = "var(--pelada-border)";
const MUTED = "var(--pelada-muted)";
const MUTED2 = "var(--pelada-muted-2)";
const TEXT = "var(--pelada-text)";
const DANGER = "var(--pelada-danger)";
const DISABLED_BG = "var(--pelada-disabled-bg)";
const SLOT_HOUR_BG = "var(--pelada-slot-hour-bg)";
const SLOT_BG = "var(--pelada-slot-bg)";
const CARD_SHADOW = "var(--pelada-card-shadow)";
const SOFT_SHADOW = "var(--pelada-soft-shadow)";
const INPUT_SHADOW = "var(--pelada-input-shadow)";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const BASE = {
  fontFamily: "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  background: "var(--pelada-bg-gradient)",
  minHeight: "100dvh",
  color: TEXT,
};

const buttonBase = {
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

const inputStyle = {
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

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function dateToKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfWeekSunday(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

function getRollingCalendarDays(startDate, weeks = 4) {
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(startDate, i));
}

function formatDateShort(key) {
  const d = keyToDate(key);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function formatDateLong(key) {
  const d = keyToDate(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function parseTime(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function timeLabel(totalMinutes) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function formatSlotInterval(dateKey, slotId, duration = 30) {
  const startTotal = Number(slotId);
  const endTotal = startTotal + duration;
  const startDayOffset = Math.floor(startTotal / 1440);
  const endDayOffset = Math.floor(endTotal / 1440);
  const startDateKey = dateToKey(addDays(keyToDate(dateKey), startDayOffset));
  const endDateKey = dateToKey(addDays(keyToDate(dateKey), endDayOffset));
  const start = timeLabel(startTotal);
  const end = timeLabel(endTotal);

  return {
    date: formatDateLong(startDateKey),
    range: `${start}–${end}`,
    endDate: endDateKey !== startDateKey ? formatDateLong(endDateKey) : null,
  };
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function generateSlots(startTime, endTime) {
  const start = parseTime(startTime);
  let end = parseTime(endTime);

  // Permite ranges que passam da meia-noite, ex.: 21:30 -> 04:00
  if (end <= start) end += 1440;

  const slots = [];
  for (let m = start; m < end; m += 30) {
    slots.push({
      id: String(m),
      label: timeLabel(m),
      dayOffset: Math.floor(m / 1440),
      isHour: m % 60 === 0,
    });
  }
  return slots;
}

function slotKey(dateKey, slotId) {
  return `${dateKey}|${slotId}`;
}

function getCalendarDays(cursorDate) {
  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  // Segunda-feira como primeiro dia da semana
  const firstWeekdayIndex = (first.getDay() + 6) % 7;
  const days = [];

  for (let i = 0; i < firstWeekdayIndex; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);

  return days;
}

function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}


function useIsPhone() {
  const [isPhone, setIsPhone] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth <= 760;
  });

  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth <= 760);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isPhone;
}

function getInitialThemeMode() {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Ignore storage errors in private mode.
  }
  return "light";
}

function applyThemeMode(mode) {
  if (typeof document === "undefined") return;
  const theme = THEMES[mode] || THEMES.light;
  Object.entries(theme.vars).forEach(([name, value]) => {
    document.documentElement.style.setProperty(name, value);
  });
  document.documentElement.dataset.peladaTheme = mode;
  document.documentElement.style.colorScheme = mode === "dark" ? "dark" : "light";
  document.body.style.background = theme.vars["--pelada-bg"];
}

function blurActiveElement() {
  if (typeof document === "undefined") return;
  const active = document.activeElement;
  if (active && typeof active.blur === "function") active.blur();
}

function useViewportSize() {
  const [size, setSize] = useState(() => {
    if (typeof window === "undefined") return { width: 390, height: 844 };
    return { width: window.innerWidth, height: window.innerHeight };
  });

  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return size;
}
if (typeof document !== "undefined") {
  applyThemeMode(getInitialThemeMode());
}

export default function App() {
  const [events, setEvents] = useState({});
  const [screen, setScreen] = useState("home");
  const [currentEventId, setCurrentEventId] = useState(null);
  const [missingEventId, setMissingEventId] = useState(null);

  // Create event
  const [eventTitle, setEventTitle] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [createStep, setCreateStep] = useState("title");
  const [selectedDates, setSelectedDates] = useState({});
  const [calendarStart, setCalendarStart] = useState(() => startOfWeekSunday(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("22:30");

  // Join/respond
  const [eventCode, setEventCode] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [availability, setAvailability] = useState({});
  const [copied, setCopied] = useState(false);
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);

  const dragging = useRef(false);
  const dragVal = useRef(true);
  const createSubmitting = useRef(false);
  const responseSubmitting = useRef(false);

  const isPhone = useIsPhone();

  useEffect(() => {
    applyThemeMode(themeMode);
    try {
      window.localStorage.setItem(THEME_KEY, themeMode);
    } catch {
      // Ignore storage errors in private mode.
    }
  }, [themeMode]);

  const toggleTheme = useCallback(() => {
    setThemeMode((mode) => (mode === "dark" ? "light" : "dark"));
  }, []);

  const withTheme = useCallback((content) => (
    <>
      <ThemeToggle mode={themeMode} onToggle={toggleTheme} />
      {content}
    </>
  ), [themeMode, toggleTheme]);
  useEffect(() => {
    const stored = loadEvents();
    setEvents(stored);

    const params = new URLSearchParams(window.location.search);
    const id = params.get("event");
    if (id) {
      if (stored[id]) {
        setCurrentEventId(id);
        setScreen("event");
      } else {
        setMissingEventId(id);
        setEventCode(id);
        setScreen("home");
      }
    }
  }, []);

  useEffect(() => {
    const stop = () => {
      dragging.current = false;
    };
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchend", stop);
    return () => {
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchend", stop);
    };
  }, []);

  const currentEvent = currentEventId ? events[currentEventId] : null;

  const eventDates = useMemo(() => {
    if (!currentEvent) return [];
    return [...currentEvent.dates].sort();
  }, [currentEvent]);

  const slots = useMemo(() => {
    if (!currentEvent) return [];
    return generateSlots(currentEvent.startTime, currentEvent.endTime);
  }, [currentEvent]);

  const selectedDateKeys = useMemo(
    () => Object.keys(selectedDates).filter((k) => selectedDates[k]).sort(),
    [selectedDates]
  );

  const eventLink = currentEventId
    ? `${window.location.origin}${window.location.pathname}?event=${currentEventId}`
    : "";

  const updateEvents = useCallback((updater) => {
    setEvents((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveEvents(next);
      return next;
    });
  }, []);

  const openEvent = (id) => {
    const clean = id.trim();
    if (!clean || !events[clean]) return;
    setMissingEventId(null);
    setCurrentEventId(clean);
    setParticipantName("");
    setAvailability({});
    window.history.pushState({}, "", `${window.location.pathname}?event=${clean}`);
    setScreen("event");
  };

  const createEvent = () => {
    if (createSubmitting.current) return;
    blurActiveElement();
    if (!eventTitle.trim() || !creatorName.trim() || selectedDateKeys.length === 0) return;
    createSubmitting.current = true;

    const id = uid();
    const newEvent = {
      id,
      title: eventTitle.trim(),
      creatorName: creatorName.trim(),
      dates: selectedDateKeys,
      startTime,
      endTime,
      responses: [],
      createdAt: new Date().toISOString(),
    };

    updateEvents((prev) => ({ ...prev, [id]: newEvent }));
    setCurrentEventId(id);
    setParticipantName(creatorName.trim());
    setAvailability({});
    window.history.pushState({}, "", `${window.location.pathname}?event=${id}`);
    setCreateStep("title");
    setScreen("created");
    window.setTimeout(() => {
      createSubmitting.current = false;
    }, 300);
  };

  const startResponse = () => {
    const name = participantName.trim();
    if (!name || !currentEvent) return;

    const existing = currentEvent.responses?.find(
      (r) => normalizeName(r.name) === normalizeName(name)
    );
    setAvailability(existing?.availability || {});
    setScreen("fill");
  };

  const startCreatorResponse = () => {
    const name = currentEvent?.creatorName?.trim();
    if (!name || !currentEvent) return;

    const existing = currentEvent.responses?.find(
      (r) => normalizeName(r.name) === normalizeName(name)
    );
    setParticipantName(name);
    setAvailability(existing?.availability || {});
    setScreen("fill");
  };

  const onCellDown = useCallback((dateKey, slotId) => {
    const k = slotKey(dateKey, slotId);
    const newVal = !availability[k];
    dragVal.current = newVal;
    dragging.current = true;
    setAvailability((p) => ({ ...p, [k]: newVal }));
  }, [availability]);

  const onCellEnter = useCallback((dateKey, slotId) => {
    if (!dragging.current) return;
    setAvailability((p) => ({ ...p, [slotKey(dateKey, slotId)]: dragVal.current }));
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!dragging.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el?.dataset?.date && el?.dataset?.slot) {
      setAvailability((p) => ({ ...p, [slotKey(el.dataset.date, el.dataset.slot)]: dragVal.current }));
    }
  }, []);

  const submitResponse = () => {
    if (responseSubmitting.current) return;
    blurActiveElement();
    dragging.current = false;

    const name = participantName.trim();
    if (!currentEvent || !name) return;
    responseSubmitting.current = true;

    const cleanAvailability = Object.fromEntries(
      Object.entries(availability).filter(([, value]) => !!value)
    );

    updateEvents((prev) => {
      const ev = prev[currentEvent.id];
      const responses = ev.responses || [];
      const nextResponses = [
        ...responses.filter((r) => normalizeName(r.name) !== normalizeName(name)),
        { name, nameKey: normalizeName(name), availability: cleanAvailability, updatedAt: new Date().toISOString() },
      ];
      return { ...prev, [ev.id]: { ...ev, responses: nextResponses } };
    });

    setScreen("results");
    window.setTimeout(() => {
      responseSubmitting.current = false;
    }, 300);
  };

  const getCount = (dateKey, slotId) => {
    if (!currentEvent) return 0;
    return (currentEvent.responses || []).filter((r) => r.availability?.[slotKey(dateKey, slotId)]).length;
  };

  const getNames = (dateKey, slotId) => {
    if (!currentEvent) return [];
    return (currentEvent.responses || [])
      .filter((r) => r.availability?.[slotKey(dateKey, slotId)])
      .map((r) => r.name);
  };


  const currentParticipantResponse = useMemo(() => {
    const name = normalizeName(participantName);
    if (!currentEvent || !name) return null;
    return (currentEvent.responses || []).find((r) => normalizeName(r.name) === name) || null;
  }, [currentEvent, participantName]);

  const editCurrentAvailability = () => {
    if (!currentParticipantResponse) return;
    setAvailability(currentParticipantResponse.availability || {});
    setScreen("fill");
  };
  const bestOptions = useMemo(() => {
    if (!currentEvent) return [];
    const rows = [];
    for (const d of eventDates) {
      for (const s of slots) {
        const count = getCount(d, s.id);

        if (count > 0) {
          rows.push({
            dateKey: d,
            slot: s,
            count,
            names: getNames(d, s.id),
          });
        }
      }
    }
    return rows.sort((a, b) => b.count - a.count || a.dateKey.localeCompare(b.dateKey) || Number(a.slot.id) - Number(b.slot.id)).slice(0, 4);
  }, [currentEvent, eventDates, slots]);

  const selectedCount = Object.values(availability).filter(Boolean).length;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const resetToHome = () => {
    setScreen("home");
    setCurrentEventId(null);
    setParticipantName("");
    setAvailability({});
    setCreatorName("");
    setCreateStep("title");
    window.history.pushState({}, "", window.location.pathname);
  };

  // ───────────────────────────────────────────────────────────── HOME
  if (screen === "home") {
    return withTheme(
      <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <div style={{ width: 68, height: 68, background: ACCENT_SOFT, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 16px", border: `1px solid ${BORDER}`, boxShadow: SOFT_SHADOW }}>⚽</div>
            <h1 style={{ margin: 0, fontSize: 32, color: "#166534", letterSpacing: "-1px" }}>Organiza Eventos</h1>
            <p style={{ margin: "6px 0 0", color: MUTED2, fontSize: 13 }}>Já que o Pedro não dá conta disto, organiza aqui a melhor hora para todos.</p>
          </div>

          {missingEventId && (
            <div style={{ background: "rgba(255,107,107,0.08)", border: `1px solid ${DANGER}`, color: DANGER, borderRadius: 18, padding: 14, fontSize: 13, marginBottom: 14 }}>
              Este evento não existe neste browser. Com Supabase isto passa a funcionar entre dispositivos.
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            <button onClick={() => { setCreateStep("title"); setScreen("create"); }} style={{ ...buttonBase, background: ACCENT, color: "#fff", width: "100%", boxShadow: "0 14px 32px rgba(34,197,94,0.22)" }}>
              Criar Evento
            </button>

            <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 22, padding: 16 }}>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: MUTED2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px" }}>
                entrar num evento
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={eventCode} onChange={(e) => setEventCode(e.target.value)} placeholder="código do evento" style={inputStyle} />
                <button onClick={() => openEvent(eventCode)} disabled={!events[eventCode.trim()]} style={{ ...buttonBase, background: events[eventCode.trim()] ? ACCENT : SURFACE, color: events[eventCode.trim()] ? "#fff" : MUTED2, whiteSpace: "nowrap" }}>
                  Entrar
                </button>
              </div>
            </div>

            {Object.keys(events).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ margin: "0 0 10px", color: MUTED2, fontSize: 12 }}>eventos neste browser</p>
                <div style={{ display: "grid", gap: 8 }}>
                  {Object.values(events).slice().reverse().map((ev) => (
                    <button key={ev.id} onClick={() => openEvent(ev.id)} style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 18, padding: 14, textAlign: "left", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}>
                      <strong>{ev.title}</strong>
                      <span style={{ display: "block", marginTop: 4, color: MUTED2, fontSize: 12 }}>
                        {ev.dates.length} dia{ev.dates.length !== 1 ? "s" : ""} · {ev.responses?.length || 0} resposta{(ev.responses?.length || 0) !== 1 ? "s" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────── CREATE
  if (screen === "create") {
    const canContinueTitle = eventTitle.trim().length > 0 && creatorName.trim().length > 0;
    const canCreate = eventTitle.trim() && creatorName.trim() && selectedDateKeys.length > 0;
    const crossesMidnight = parseTime(endTime) <= parseTime(startTime);

    if (createStep === "title") {
      return withTheme(
        <div style={{ ...BASE, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 18px" }}>
          <div style={{ width: "100%", maxWidth: 430 }}>
            <button onClick={resetToHome} style={{ ...miniButton, marginBottom: 18 }}>←</button>

            <div style={modalCardStyle}>
              <div style={{ width: 56, height: 56, borderRadius: 22, background: ACCENT_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 27, marginBottom: 18 }}>
                ⚡
              </div>

              <p style={{ margin: "0 0 8px", color: ACCENT_DARK, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                novo evento
              </p>

              <h1 style={{ margin: "0 0 10px", fontSize: 31, lineHeight: 1.04, letterSpacing: "-1.2px" }}>
                Como se chama?
              </h1>

              <p style={{ margin: "0 0 20px", color: MUTED2, fontSize: 14, lineHeight: 1.5 }}>
                Dá um nome ao evento e identifica o criador. A primeira disponibilidade fica automaticamente associada ao criador.
              </p>

              <label style={{ ...labelStyle, display: "block", marginBottom: 12 }}>
                Nome do evento
                <input
                  autoFocus
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="ex.: Futsal sexta à noite"
                  style={{ ...inputStyle, fontSize: 17, padding: "16px 17px", marginTop: 7 }}
                />
              </label>

              <label style={{ ...labelStyle, display: "block" }}>
                Nome do criador
                <input
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canContinueTitle && setCreateStep("details")}
                  placeholder="ex.: António"
                  style={{ ...inputStyle, fontSize: 17, padding: "16px 17px", marginTop: 7 }}
                />
              </label>

              <button
                onClick={() => setCreateStep("details")}
                disabled={!canContinueTitle}
                style={{
                  ...buttonBase,
                  width: "100%",
                  marginTop: 14,
                  background: canContinueTitle ? ACCENT : DISABLED_BG,
                  color: canContinueTitle ? "#fff" : MUTED2,
                  boxShadow: canContinueTitle ? "0 14px 32px rgba(34,197,94,0.22)" : "none",
                }}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return withTheme(
      <div style={{ ...BASE, padding: isPhone ? "16px 12px 28px" : "22px 16px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Header
            title="Criar Evento"
            subtitle="escolhe os dias e o intervalo de horas"
            onBack={() => setCreateStep("title")}
          />

          <div style={{ display: "grid", gap: 14 }}>
            <div style={eventNameCardStyle}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: "0 0 5px", color: MUTED2, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  evento
                </p>
                <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.2, letterSpacing: "-0.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {eventTitle}
                </h2>
                <p style={{ margin: "5px 0 0", color: MUTED2, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Criado por {creatorName}
                </p>
              </div>

              <button
                onClick={() => setCreateStep("title")}
                style={{ ...miniButton, width: "auto", paddingInline: 12, fontSize: 12, fontWeight: 800 }}
              >
                Editar
              </button>
            </div>

            <IntegratedCalendarPicker
              startDate={calendarStart}
              selectedDates={selectedDates}
              onToggleDate={(key) => setSelectedDates((p) => ({ ...p, [key]: !p[key] }))}
              onPrevious={() => setCalendarStart((d) => addWeeks(d, -4))}
              onNext={() => setCalendarStart((d) => addWeeks(d, 4))}
            />

            {selectedDateKeys.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: -2 }}>
                {selectedDateKeys.map((d) => (
                  <span
                    key={d}
                    style={{
                      background: ACCENT_SOFT,
                      border: `1px solid ${BORDER}`,
                      color: ACCENT_DARK,
                      borderRadius: 999,
                      padding: "7px 11px",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {formatDateLong(d)}
                  </span>
                ))}
              </div>
            )}

            <div style={rangeCardStyle}>
              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: 0, color: MUTED2, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  range de horas
                </p>
                <p style={{ margin: "5px 0 0", color: MUTED2, fontSize: 12 }}>
                  Slots de 30 em 30 minutos
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8, width: "100%" }}>
                <label style={{ ...labelStyle, minWidth: 0 }}>
                  Das
                  <input
                    type="time"
                    step="1800"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{
                      ...inputStyle,
                      marginTop: 6,
                      padding: isPhone ? "12px 8px" : "14px 16px",
                      minWidth: 0,
                      width: "100%",
                      WebkitAppearance: "none",
                      appearance: "none",
                    }}
                  />
                </label>

                <label style={{ ...labelStyle, minWidth: 0 }}>
                  Até
                  <input
                    type="time"
                    step="1800"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{
                      ...inputStyle,
                      marginTop: 6,
                      padding: isPhone ? "12px 8px" : "14px 16px",
                      minWidth: 0,
                      width: "100%",
                      WebkitAppearance: "none",
                      appearance: "none",
                    }}
                  />
                </label>
              </div>

              <p style={{ margin: "10px 0 0", color: crossesMidnight ? ACCENT_DARK : MUTED2, fontSize: 12, lineHeight: 1.45 }}>
                {crossesMidnight
                  ? "Este range passa da meia-noite. Ex.: 21:30 → 04:00."
                  : "Os participantes só poderão escolher slots dentro deste intervalo."}
              </p>
            </div>

            <button
              onPointerUp={(e) => { e.preventDefault(); createEvent(); }}
              onClick={createEvent}
              disabled={!canCreate}
              style={{
                ...buttonBase,
                background: canCreate ? ACCENT : DISABLED_BG,
                color: canCreate ? "#fff" : MUTED2,
                boxShadow: canCreate ? "0 14px 32px rgba(34,197,94,0.22)" : "none",
              }}
            >
              Criar Evento
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────── CREATED
  if (screen === "created" && currentEvent) {
    return withTheme(
      <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 520, background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 28, padding: 22 }}>
          <p style={{ margin: 0, color: ACCENT, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>evento criado</p>
          <h1 style={{ margin: "8px 0 4px", fontSize: 24 }}>{currentEvent.title}</h1>
          <p style={{ margin: "0 0 18px", color: MUTED2, fontSize: 13 }}>Partilha este link com quem queres convidar.</p>

          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 14, fontSize: 12, color: MUTED2, wordBreak: "break-all" }}>
            {eventLink}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button onClick={startCreatorResponse} style={{ ...buttonBase, background: ACCENT, color: "#fff" }}>Preencher Disponibilidade</button>
            <button onClick={copyLink} style={{ ...buttonBase, background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>{copied ? "Copiado" : "Copiar Link"}</button>
            <button onClick={() => setScreen("event")} style={{ ...buttonBase, background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>Abrir Evento</button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────── EVENT LANDING
  if (screen === "event" && currentEvent) {
    return withTheme(
      <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <Header title={currentEvent.title} subtitle={`${currentEvent.dates.length} dia${currentEvent.dates.length !== 1 ? "s" : ""} possível${currentEvent.dates.length !== 1 ? "eis" : ""} · ${currentEvent.startTime} às ${currentEvent.endTime}`} onBack={resetToHome} />

          {(currentEvent.responses?.length || 0) === 0 && currentEvent.creatorName ? (
            <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 18 }}>
              <p style={{ margin: "0 0 6px", color: MUTED2, fontSize: 12 }}>Primeira resposta</p>
              <h3 style={{ margin: "0 0 12px", fontSize: 18 }}>Criador: {currentEvent.creatorName}</h3>
              <button onClick={startCreatorResponse} style={{ ...buttonBase, background: ACCENT, color: "#fff", width: "100%" }}>
                Preencher Disponibilidade
              </button>
            </div>
          ) : (
            <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 18 }}>
              <p style={{ margin: "0 0 10px", color: MUTED2, fontSize: 12 }}>Para responder ou editar, escreve o teu nome.</p>
              <input autoFocus value={participantName} onChange={(e) => setParticipantName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && startResponse()} placeholder="o teu nome" style={inputStyle} />
              <button onClick={startResponse} disabled={!participantName.trim()} style={{ ...buttonBase, background: participantName.trim() ? ACCENT : SURFACE, color: participantName.trim() ? "#fff" : MUTED2, width: "100%", marginTop: 10 }}>
                {currentParticipantResponse ? "Editar Disponibilidade" : "Preencher Disponibilidade"}
              </button>
            </div>
          )}

          <button onClick={() => setScreen("results")} style={{ marginTop: 16, background: "transparent", color: MUTED2, border: "none", cursor: "pointer", fontFamily: "'Sora', sans-serif", width: "100%" }}>
            Ver Resultados · {currentEvent.responses?.length || 0} resposta{(currentEvent.responses?.length || 0) !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────── FILL
  if (screen === "fill" && currentEvent) {
    const canSaveResponse = participantName.trim().length > 0;
    const editingLabel = currentParticipantResponse ? "Guardar Alterações" : "Guardar Disponibilidade";

    return withTheme(
      <div onMouseUp={() => { dragging.current = false; }} onTouchMove={onTouchMove} style={{ ...BASE, padding: isPhone ? "16px 12px calc(92px + env(safe-area-inset-bottom))" : "20px 16px", userSelect: "none" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Header
            title={currentEvent.title}
            subtitle={currentParticipantResponse ? "edita os slots em que podes" : "marca os slots em que podes"}
            onBack={() => setScreen((currentEvent.responses?.length || 0) > 0 ? "results" : "event")}
            right={`${selectedCount} slot${selectedCount !== 1 ? "s" : ""}`}
          />

          <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 14, marginBottom: 14 }}>
            <p style={{ margin: "0 0 6px", color: MUTED2, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.7px" }}>
              Resposta de
            </p>
            <strong style={{ display: "block", color: TEXT, fontSize: 16 }}>{participantName || currentEvent.creatorName}</strong>
            <p style={{ margin: "8px 0 0", color: MUTED2, fontSize: 12 }}>
              Podes voltar a entrar com o mesmo nome para editar, adicionar ou remover horários.
            </p>
          </div>

          <AvailabilityGrid eventDates={eventDates} slots={slots} availability={availability} onCellDown={onCellDown} onCellEnter={onCellEnter} />

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", position: isPhone ? "fixed" : "static", left: isPhone ? 12 : "auto", right: isPhone ? 12 : "auto", bottom: isPhone ? "calc(12px + env(safe-area-inset-bottom))" : "auto", zIndex: 20 }}>
            <button
              onPointerDown={(e) => { e.stopPropagation(); dragging.current = false; }}
              onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); submitResponse(); }}
              onClick={submitResponse}
              disabled={!canSaveResponse}
              style={{ ...buttonBase, background: canSaveResponse ? ACCENT : SURFACE, color: canSaveResponse ? "#fff" : MUTED2, paddingInline: 34, width: isPhone ? "100%" : "auto", boxShadow: isPhone ? "0 14px 30px rgba(0,0,0,0.45)" : "none" }}
            >
              {editingLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────── RESULTS
  if (screen === "results" && currentEvent) {
    const max = currentEvent.responses?.length || 1;

    return withTheme(
      <div style={{ ...BASE, padding: "20px 16px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Header title="Resultados" subtitle={currentEvent.title} onBack={() => setScreen("event")} right={`${currentEvent.responses?.length || 0} resposta${(currentEvent.responses?.length || 0) !== 1 ? "s" : ""}`} />

          <Heatmap eventDates={eventDates} slots={slots} max={max} getCount={getCount} getNames={getNames} />

          <BestOptionsList bestOptions={bestOptions} />

          {(currentEvent.responses?.length || 0) > 0 && (
            <div style={{ marginTop: 26 }}>
              <p style={sectionTitle}>responderam</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {currentEvent.responses.map((r) => (
                  <span key={r.name} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "7px 13px", fontSize: 13 }}>{r.name}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 28 }}>
            {currentParticipantResponse && (
              <button onClick={editCurrentAvailability} style={{ ...buttonBase, background: ACCENT, color: "#fff" }}>
                Editar a Minha Disponibilidade
              </button>
            )}
            <button onClick={copyLink} style={{ ...buttonBase, background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>{copied ? "Copiado" : "Copiar Link"}</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ThemeToggle({ mode, onToggle }) {
  const theme = THEMES[mode] || THEMES.light;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={mode === "dark" ? "Mudar para modo claro" : "Mudar para dark mode"}
      title={mode === "dark" ? "Modo escuro" : "Modo claro"}
      style={{
        position: "fixed",
        top: "calc(10px + env(safe-area-inset-top))",
        right: "calc(10px + env(safe-area-inset-right))",
        zIndex: 999,
        minWidth: 42,
        height: 42,
        padding: "0 12px",
        borderRadius: 999,
        border: `1px solid ${BORDER}`,
        background: SURFACE2,
        color: TEXT,
        boxShadow: SOFT_SHADOW,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 800,
        fontFamily: "'Sora', sans-serif",
        touchAction: "manipulation",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 16 }}>{theme.icon}</span>
      <span>{mode === "dark" ? "Modo Claro" : "Dark Mode"}</span>
    </button>
  );
}

function IntegratedCalendarPicker({ startDate, selectedDates, onToggleDate, onPrevious, onNext }) {
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
          <button onClick={onPrevious} aria-label="Período anterior" style={{ ...calendarArrowButton, width: isPhone ? 34 : 42, height: isPhone ? 34 : 42, fontSize: isPhone ? 34 : 44 }}>‹</button>
          <button onClick={onNext} aria-label="Próximo período" style={{ ...calendarArrowButton, width: isPhone ? 34 : 42, height: isPhone ? 34 : 42, fontSize: isPhone ? 34 : 44 }}>›</button>
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
                style={{
                  position: "relative",
                  background: "transparent",
                  border: "none",
                  color: TEXT,
                  textAlign: "left",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "'Sora', sans-serif",
                  minHeight: dayHeight,
                  touchAction: "manipulation",
                }}
              >
                {showMonth && (
                  <span style={{ position: "absolute", top: 0, left: 0, color: ACCENT, fontSize: isPhone ? 9 : 12, fontWeight: 600, textTransform: "uppercase" }}>
                    {MONTHS[date.getMonth()].slice(0, 3)}
                  </span>
                )}

                <span
                  style={{
                    position: "absolute",
                    top: showMonth ? (isPhone ? 22 : 30) : (isPhone ? 16 : 24),
                    left: 0,
                    width: active ? activeSize : "auto",
                    height: active ? activeSize : "auto",
                    borderRadius: active ? "50%" : 0,
                    background: active ? "#22c55e" : "transparent",
                    color: active ? "#fff" : TEXT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isPhone ? 13 : 14,
                    fontWeight: active ? 700 : 500,
                    boxShadow: active ? "0 8px 18px rgba(34,197,94,0.22)" : "none",
                  }}
                >
                  {date.getDate()}
                </span>

                {!active && isToday && (
                  <span style={{ position: "absolute", top: showMonth ? (isPhone ? 46 : 54) : (isPhone ? 40 : 48), left: 2, width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Header({ title, subtitle, onBack, right }) {
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

function BestOptionsList({ bestOptions }) {
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
      <p style={sectionTitle}>melhores opções</p>
      <div style={{ display: "grid", gap: 8 }}>
        {bestOptions.map((o, index) => (
          <div
            key={`${o.dateKey}-${o.slot.id}`}
            style={{
              background: SURFACE,
              border: `1px solid ${index === 0 ? ACCENT : BORDER}` ,
              borderRadius: 18,
              padding: isPhone ? 12 : 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              boxShadow: index === 0 ? "0 14px 30px rgba(34,197,94,0.12)" : "none",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: isPhone ? 13 : 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {index + 1}. {formatSlotInterval(o.dateKey, o.slot.id).date} · {formatSlotInterval(o.dateKey, o.slot.id).range}
              </strong>
              <div style={{ color: MUTED2, fontSize: 12, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {o.names.join(", ")}
              </div>
            </div>
            <div style={{ color: ACCENT_DARK, fontWeight: 900, background: ACCENT_SOFT, borderRadius: 999, padding: "7px 10px", fontSize: 13, flexShrink: 0 }}>
              {o.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function AvailabilityGrid({ eventDates, slots, availability, onCellDown, onCellEnter }) {
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
                {s.label}{s.dayOffset ? "+1" : ""}
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
                    style={{
                      width: columnWidth,
                      height: cellHeight,
                      background: sel ? ACCENT : s.isHour ? SLOT_HOUR_BG : SLOT_BG,
                      borderTop: s.isHour ? `1px solid ${BORDER}` : "1px solid transparent",
                      borderRight: di < eventDates.length - 1 ? `1px solid ${BORDER}` : "none",
                      cursor: "pointer",
                      boxSizing: "border-box",
                      transition: "background 0.04s, transform 0.04s",
                      touchAction: "none",
                    }}
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
function Heatmap({ eventDates, slots, max, getCount, getNames }) {
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

    setSelectedSlot(
      sameSlot
        ? null
        : { dateKey, slotId: slot.id, label: slot.label, dayOffset: slot.dayOffset }
    );

    if (!sameSlot && isPhone) {
      window.setTimeout(() => {
        peoplePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
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
                    {s.label}{s.dayOffset ? "+1" : ""}
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
                    const bg = count === 0
                      ? (s.isHour ? SLOT_HOUR_BG : SLOT_BG)
                      : `rgba(34, 197, 94, ${0.16 + intensity * 0.78})`;
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
                          width: columnWidth,
                          height: cellHeight,
                          background: bg,
                          border: "none",
                          borderTop: s.isHour ? `1px solid ${BORDER}` : "1px solid transparent",
                          borderRight: di < eventDates.length - 1 ? `1px solid ${BORDER}` : "none",
                          boxSizing: "border-box",
                          color: count > 0 && intensity > 0.58 ? "#fff" : TEXT,
                          fontSize: isPhone ? 9 : 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          cursor: "pointer",
                          outline: isSelected ? `2px solid ${ACCENT_DARK}` : "none",
                          outlineOffset: isSelected ? -2 : 0,
                          boxShadow: isSelected ? "inset 0 0 0 2px #fff, 0 0 0 3px rgba(34,197,94,0.32)" : "none",
                          transform: isSelected ? "scale(1.03)" : "scale(1)",
                          position: "relative",
                          zIndex: isSelected ? 2 : 1,
                          touchAction: "manipulation",
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
          <p style={{ ...sectionTitle, marginBottom: 6 }}>disponíveis neste slot</p>
          <h3 style={{ margin: 0, fontSize: 16 }}>{slotInterval.date}</h3>
          <p style={{ margin: "4px 0 0", color: TEXT, fontSize: 14, fontWeight: 900 }}>
            {slotInterval.range}{slotInterval.endDate ? ` · acaba em ${slotInterval.endDate}` : ""}
          </p>
          <p style={{ margin: "6px 0 0", color: ACCENT_DARK, fontSize: 13, fontWeight: 900 }}>{selectedCount} sim{selectedCount !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={onClose} aria-label="Fechar lista" style={{ ...miniButton, width: 32, height: 32 }}>×</button>
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
const modalCardStyle = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 30,
  padding: 24,
  boxShadow: CARD_SHADOW,
};

const eventNameCardStyle = {
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

const rangeCardStyle = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 24,
  padding: 16,
  boxShadow: SOFT_SHADOW,
};

const calendarArrowButton = {
  background: "transparent",
  border: "none",
  color: TEXT,
  cursor: "pointer",
  width: 42,
  height: 42,
  borderRadius: 12,
  fontSize: 44,
  lineHeight: "28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Arial, sans-serif",
};

const miniButton = {
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

const labelStyle = {
  color: MUTED2,
  fontSize: 12,
  fontWeight: 700,
};


const sectionTitle = {
  fontSize: 10,
  color: MUTED,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.7px",
  margin: "0 0 10px",
};
