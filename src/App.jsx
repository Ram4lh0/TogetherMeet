import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Font
if (typeof document !== "undefined" && !document.getElementById("pelada-font")) {
  const link = document.createElement("link");
  link.id = "pelada-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap";
  document.head.appendChild(link);
}

const STORAGE_KEY = "pelada_events_v1";

const ACCENT = "#c9f000";
const BG = "#070707";
const SURFACE = "#121212";
const SURFACE2 = "#0e0e0e";
const BORDER = "#1e1e1e";
const MUTED = "#3a3a3a";
const MUTED2 = "#777";
const TEXT = "#f2f2f2";
const DANGER = "#ff6b6b";

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
  background: BG,
  minHeight: "100vh",
  color: TEXT,
};

const buttonBase = {
  border: "none",
  borderRadius: 14,
  padding: "13px 18px",
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "'Sora', sans-serif",
  cursor: "pointer",
};

const inputStyle = {
  width: "100%",
  background: SURFACE,
  border: `1.5px solid ${BORDER}`,
  borderRadius: 14,
  padding: "14px 16px",
  fontSize: 15,
  color: TEXT,
  fontFamily: "'Sora', sans-serif",
  outline: "none",
  boxSizing: "border-box",
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

function generateSlots(startTime, endTime) {
  const start = parseTime(startTime);
  let end = parseTime(endTime);

  // Permite ranges que passam da meia-noite, ex.: 21:30 -> 04:00
  if (end <= start) end += 1440;

  const slots = [];
  for (let m = start; m <= end; m += 30) {
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

export default function App() {
  const [events, setEvents] = useState({});
  const [screen, setScreen] = useState("home");
  const [currentEventId, setCurrentEventId] = useState(null);
  const [missingEventId, setMissingEventId] = useState(null);

  // Create event
  const [creatorName, setCreatorName] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [selectedDates, setSelectedDates] = useState({});
  const [calendarStart, setCalendarStart] = useState(() => startOfWeekSunday(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("22:30");

  // Join/respond
  const [eventCode, setEventCode] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [availability, setAvailability] = useState({});
  const [copied, setCopied] = useState(false);

  const dragging = useRef(false);
  const dragVal = useRef(true);

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
    if (!eventTitle.trim() || !creatorName.trim() || selectedDateKeys.length === 0) return;

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
    window.history.pushState({}, "", `${window.location.pathname}?event=${id}`);
    setScreen("created");
  };

  const startResponse = () => {
    const name = participantName.trim();
    if (!name || !currentEvent) return;

    const existing = currentEvent.responses?.find(
      (r) => r.name.trim().toLowerCase() === name.toLowerCase()
    );
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
    const name = participantName.trim();
    if (!currentEvent || !name) return;

    updateEvents((prev) => {
      const ev = prev[currentEvent.id];
      const responses = ev.responses || [];
      const nextResponses = [
        ...responses.filter((r) => r.name.trim().toLowerCase() !== name.toLowerCase()),
        { name, availability, updatedAt: new Date().toISOString() },
      ];
      return { ...prev, [ev.id]: { ...ev, responses: nextResponses } };
    });

    setScreen("results");
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
    return rows.sort((a, b) => b.count - a.count || a.dateKey.localeCompare(b.dateKey) || Number(a.slot.id) - Number(b.slot.id)).slice(0, 6);
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
    window.history.pushState({}, "", window.location.pathname);
  };

  // ───────────────────────────────────────────────────────────── HOME
  if (screen === "home") {
    return (
      <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <div style={{ width: 68, height: 68, background: SURFACE, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 16px", border: `1px solid ${BORDER}` }}>⚽</div>
            <h1 style={{ margin: 0, fontSize: 32, letterSpacing: "-1px" }}>pelada</h1>
            <p style={{ margin: "6px 0 0", color: MUTED2, fontSize: 13 }}>cria eventos e encontra a melhor hora</p>
          </div>

          {missingEventId && (
            <div style={{ background: "rgba(255,107,107,0.08)", border: `1px solid ${DANGER}55`, color: DANGER, borderRadius: 14, padding: 14, fontSize: 13, marginBottom: 14 }}>
              Este evento não existe neste browser. Com Supabase isto passa a funcionar entre dispositivos.
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            <button onClick={() => setScreen("create")} style={{ ...buttonBase, background: ACCENT, color: "#000", width: "100%" }}>
              criar evento
            </button>

            <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16 }}>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: MUTED2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px" }}>
                entrar num evento
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={eventCode} onChange={(e) => setEventCode(e.target.value)} placeholder="código do evento" style={inputStyle} />
                <button onClick={() => openEvent(eventCode)} disabled={!events[eventCode.trim()]} style={{ ...buttonBase, background: events[eventCode.trim()] ? ACCENT : SURFACE, color: events[eventCode.trim()] ? "#000" : MUTED2, whiteSpace: "nowrap" }}>
                  entrar
                </button>
              </div>
            </div>

            {Object.keys(events).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ margin: "0 0 10px", color: MUTED2, fontSize: 12 }}>eventos neste browser</p>
                <div style={{ display: "grid", gap: 8 }}>
                  {Object.values(events).slice().reverse().map((ev) => (
                    <button key={ev.id} onClick={() => openEvent(ev.id)} style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 14, padding: 14, textAlign: "left", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}>
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
    const canCreate = eventTitle.trim() && creatorName.trim() && selectedDateKeys.length > 0;
    const crossesMidnight = parseTime(endTime) <= parseTime(startTime);

    return (
      <div style={{ ...BASE, padding: "22px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Header title="criar evento" subtitle="define dias e horas possíveis" onBack={resetToHome} />

          <div style={{ display: "grid", gap: 14 }}>
            <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="nome do evento, ex.: futsal sexta" style={inputStyle} />
            <input value={creatorName} onChange={(e) => setCreatorName(e.target.value)} placeholder="o teu nome" style={inputStyle} />

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
                  <span key={d} style={{ background: `${ACCENT}22`, border: `1px solid ${ACCENT}55`, color: ACCENT, borderRadius: 20, padding: "6px 10px", fontSize: 12 }}>
                    {formatDateLong(d)}
                  </span>
                ))}
              </div>
            )}

            <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 16 }}>
              <p style={{ margin: "0 0 12px", color: MUTED2, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>range de horas disponível</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={labelStyle}>Das<input type="time" step="1800" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} /></label>
                <label style={labelStyle}>Até<input type="time" step="1800" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} /></label>
              </div>
              <p style={{ margin: "10px 0 0", color: crossesMidnight ? ACCENT : MUTED2, fontSize: 12 }}>
                {crossesMidnight ? "Este range passa da meia-noite. Ex.: 21:30 → 04:00." : "Os participantes só poderão escolher slots dentro deste intervalo."}
              </p>
            </div>

            <button onClick={createEvent} disabled={!canCreate} style={{ ...buttonBase, background: canCreate ? ACCENT : SURFACE, color: canCreate ? "#000" : MUTED2 }}>
              criar evento
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────── CREATED
  if (screen === "created" && currentEvent) {
    return (
      <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 520, background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 22 }}>
          <p style={{ margin: 0, color: ACCENT, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>evento criado</p>
          <h1 style={{ margin: "8px 0 4px", fontSize: 24 }}>{currentEvent.title}</h1>
          <p style={{ margin: "0 0 18px", color: MUTED2, fontSize: 13 }}>Partilha este link com quem queres convidar.</p>

          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, fontSize: 12, color: MUTED2, wordBreak: "break-all" }}>
            {eventLink}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button onClick={copyLink} style={{ ...buttonBase, background: ACCENT, color: "#000" }}>{copied ? "copiado" : "copiar link"}</button>
            <button onClick={() => setScreen("event")} style={{ ...buttonBase, background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>abrir evento</button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────── EVENT LANDING
  if (screen === "event" && currentEvent) {
    return (
      <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <Header title={currentEvent.title} subtitle={`${currentEvent.dates.length} dia${currentEvent.dates.length !== 1 ? "s" : ""} possível${currentEvent.dates.length !== 1 ? "eis" : ""} · ${currentEvent.startTime} às ${currentEvent.endTime}`} onBack={resetToHome} />

          <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 22, padding: 18 }}>
            <p style={{ margin: "0 0 10px", color: MUTED2, fontSize: 12 }}>Para responder, escreve só o teu nome.</p>
            <input autoFocus value={participantName} onChange={(e) => setParticipantName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && startResponse()} placeholder="o teu nome" style={inputStyle} />
            <button onClick={startResponse} disabled={!participantName.trim()} style={{ ...buttonBase, background: participantName.trim() ? ACCENT : SURFACE, color: participantName.trim() ? "#000" : MUTED2, width: "100%", marginTop: 10 }}>
              preencher disponibilidade
            </button>
          </div>

          <button onClick={() => setScreen("results")} style={{ marginTop: 16, background: "transparent", color: MUTED2, border: "none", cursor: "pointer", fontFamily: "'Sora', sans-serif", width: "100%" }}>
            ver resultados · {currentEvent.responses?.length || 0} resposta{(currentEvent.responses?.length || 0) !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────── FILL
  if (screen === "fill" && currentEvent) {
    return (
      <div onMouseUp={() => { dragging.current = false; }} onTouchMove={onTouchMove} style={{ ...BASE, padding: "20px 16px", userSelect: "none" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Header title={participantName} subtitle="arrasta para selecionar os slots em que podes" onBack={() => setScreen("event")} right={`${selectedCount} slot${selectedCount !== 1 ? "s" : ""}`} />
          <AvailabilityGrid eventDates={eventDates} slots={slots} availability={availability} onCellDown={onCellDown} onCellEnter={onCellEnter} />

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={submitResponse} style={{ ...buttonBase, background: ACCENT, color: "#000", paddingInline: 34 }}>guardar resposta</button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────── RESULTS
  if (screen === "results" && currentEvent) {
    const max = currentEvent.responses?.length || 1;

    return (
      <div style={{ ...BASE, padding: "20px 16px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Header title="resultados" subtitle={currentEvent.title} onBack={() => setScreen("event")} right={`${currentEvent.responses?.length || 0} resposta${(currentEvent.responses?.length || 0) !== 1 ? "s" : ""}`} />

          <Heatmap eventDates={eventDates} slots={slots} max={max} getCount={getCount} getNames={getNames} />

          {bestOptions.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <p style={sectionTitle}>melhores opções</p>
              <div style={{ display: "grid", gap: 8 }}>
                {bestOptions.map((o) => (
                  <div key={`${o.dateKey}-${o.slot.id}`} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <strong>{formatDateLong(o.dateKey)} · {o.slot.label}{o.slot.dayOffset ? " +1" : ""}</strong>
                      <div style={{ color: MUTED2, fontSize: 12, marginTop: 4 }}>{o.names.join(", ")}</div>
                    </div>
                    <div style={{ color: ACCENT, fontWeight: 800 }}>{o.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(currentEvent.responses?.length || 0) > 0 && (
            <div style={{ marginTop: 26 }}>
              <p style={sectionTitle}>responderam</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {currentEvent.responses.map((r) => (
                  <span key={r.name} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "7px 13px", fontSize: 13 }}>{r.name}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 28 }}>
            <button onClick={() => setScreen("event")} style={{ ...buttonBase, background: "transparent", color: ACCENT, border: `1.5px solid ${ACCENT}40` }}>+ adicionar resposta</button>
            <button onClick={copyLink} style={{ ...buttonBase, background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>{copied ? "copiado" : "copiar link"}</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function IntegratedCalendarPicker({ startDate, selectedDates, onToggleDate, onPrevious, onNext }) {
  const days = getRollingCalendarDays(startDate, 4);
  const visibleLabel = `${MONTHS[startDate.getMonth()].slice(0, 3)} ${startDate.getFullYear()} → ${MONTHS[days[days.length - 1].getMonth()].slice(0, 3)} ${days[days.length - 1].getFullYear()}`;

  return (
    <div style={{ background: "#fff", color: "#000", borderRadius: 24, padding: "26px 28px 34px", border: "1px solid #eeeeee", boxShadow: "0 18px 50px rgba(0,0,0,0.18)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 28 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 24, fontWeight: 500, letterSpacing: "-0.5px" }}>Que dias queres disponibilizar?</h3>
          <p style={{ margin: "6px 0 0", color: "#777", fontSize: 12 }}>{visibleLabel}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onPrevious} aria-label="Período anterior" style={calendarArrowButton}>‹</button>
          <button onClick={onNext} aria-label="Próximo período" style={calendarArrowButton}>›</button>
        </div>
      </div>

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(88px, 1fr))", gap: 0, borderBottom: "1px solid #eee", paddingBottom: 20, minWidth: 680 }}>
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
            <div key={d} style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.2px" }}>{d}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(88px, 1fr))", gridAutoRows: 82, minWidth: 680, paddingTop: 18 }}>
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
                  color: "#000",
                  textAlign: "left",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "'Sora', sans-serif",
                  minHeight: 82,
                }}
              >
                {showMonth && (
                  <span style={{ position: "absolute", top: 0, left: 0, color: "#009e57", fontSize: 12, fontWeight: 500, textTransform: "uppercase" }}>
                    {MONTHS[date.getMonth()].slice(0, 3)}
                  </span>
                )}

                <span
                  style={{
                    position: "absolute",
                    top: showMonth ? 30 : 24,
                    left: 0,
                    width: active ? 48 : "auto",
                    height: active ? 48 : "auto",
                    borderRadius: active ? "50%" : 0,
                    background: active ? "#009e57" : "transparent",
                    color: active ? "#fff" : "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    boxShadow: active ? "0 8px 18px rgba(0,158,87,0.22)" : "none",
                  }}
                >
                  {date.getDate()}
                </span>

                {!active && isToday && (
                  <span style={{ position: "absolute", top: showMonth ? 54 : 48, left: 2, width: 5, height: 5, borderRadius: "50%", background: "#009e57" }} />
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
      {right && <div style={{ color: ACCENT, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{right}</div>}
    </div>
  );
}

function AvailabilityGrid({ eventDates, slots, availability, onCellDown, onCellEnter }) {
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ display: "flex", minWidth: "max-content" }}>
        <div style={{ flexShrink: 0, paddingTop: 42 }}>
          {slots.map((s) => (
            <div key={s.id} style={{ height: 24, width: 58, display: "flex", alignItems: "center", fontSize: 10, color: s.isHour ? MUTED2 : "transparent", fontWeight: 600, paddingRight: 8, boxSizing: "border-box" }}>
              {s.label}{s.dayOffset ? "+1" : ""}
            </div>
          ))}
        </div>

        {eventDates.map((dateKey, di) => (
          <div key={dateKey} style={{ flexShrink: 0 }}>
            <div style={{ height: 42, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 62 }}>
              <strong style={{ fontSize: 12 }}>{formatDateShort(dateKey)}</strong>
              <span style={{ color: MUTED2, fontSize: 10 }}>{WEEKDAYS[(keyToDate(dateKey).getDay() + 6) % 7]}</span>
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
                    width: 62,
                    height: 24,
                    background: sel ? ACCENT : s.isHour ? "#0c0c0c" : SURFACE,
                    borderTop: s.isHour ? `1px solid ${BORDER}` : "1px solid transparent",
                    borderRight: di < eventDates.length - 1 ? `1px solid ${BORDER}` : "none",
                    cursor: "crosshair",
                    boxSizing: "border-box",
                    transition: "background 0.04s",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Heatmap({ eventDates, slots, max, getCount, getNames }) {
  return (
    <div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", minWidth: "max-content" }}>
          <div style={{ flexShrink: 0, paddingTop: 42 }}>
            {slots.map((s) => (
              <div key={s.id} style={{ height: 24, width: 58, display: "flex", alignItems: "center", fontSize: 10, color: s.isHour ? MUTED2 : "transparent", fontWeight: 600, paddingRight: 8, boxSizing: "border-box" }}>
                {s.label}{s.dayOffset ? "+1" : ""}
              </div>
            ))}
          </div>

          {eventDates.map((dateKey, di) => (
            <div key={dateKey} style={{ flexShrink: 0 }}>
              <div style={{ height: 42, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 62 }}>
                <strong style={{ fontSize: 12 }}>{formatDateShort(dateKey)}</strong>
                <span style={{ color: MUTED2, fontSize: 10 }}>{WEEKDAYS[(keyToDate(dateKey).getDay() + 6) % 7]}</span>
              </div>
              {slots.map((s) => {
                const count = getCount(dateKey, s.id);
                const intensity = count / max;
                const bg = count === 0 ? (s.isHour ? "#0c0c0c" : SURFACE) : `rgba(201, 240, 0, ${0.12 + intensity * 0.88})`;
                const names = getNames(dateKey, s.id).join(", ");
                return (
                  <div
                    key={s.id}
                    title={`${formatDateLong(dateKey)} ${s.label}${s.dayOffset ? " +1" : ""}: ${count}/${max}${names ? ` · ${names}` : ""}`}
                    style={{
                      width: 62,
                      height: 24,
                      background: bg,
                      borderTop: s.isHour ? `1px solid ${BORDER}` : "1px solid transparent",
                      borderRight: di < eventDates.length - 1 ? `1px solid ${BORDER}` : "none",
                      boxSizing: "border-box",
                      color: count > 0 && intensity > 0.55 ? "#000" : TEXT,
                      fontSize: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                    }}
                  >
                    {count > 0 ? count : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: MUTED2 }}>
        <span>0</span>
        {[0.1, 0.3, 0.5, 0.7, 0.85, 1].map((v, i) => (
          <div key={i} style={{ width: 18, height: 10, borderRadius: 3, background: `rgba(201, 240, 0, ${0.12 + v * 0.88})` }} />
        ))}
        <span>{max}</span>
      </div>
    </div>
  );
}

const calendarArrowButton = {
  background: "transparent",
  border: "none",
  color: "#111",
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
  color: MUTED2,
  cursor: "pointer",
  width: 34,
  height: 34,
  borderRadius: 10,
  fontSize: 15,
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
