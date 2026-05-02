import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

// ─── Font & mobile setup ──────────────────────────────────────────────────────

if (typeof document !== "undefined" && !document.getElementById("pelada-font")) {
  const link = document.createElement("link");
  link.id = "pelada-font";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap";
  document.head.appendChild(link);
}

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
      html, body, #root {
        min-height: 100dvh;
        margin: 0;
        background: var(--pelada-bg, #f6fbf3);
      }
      body { transition: background 0.18s ease, color 0.18s ease; }
      * { -webkit-tap-highlight-color: transparent; }
      button, input { font: inherit; }
      input[type="date"], input[type="time"] {
        min-width: 0; /* Impede que o input force a largura original do sistema */
        -webkit-appearance: none; /* Remove estilos nativos que podem causar bugs de box-model */
        background: transparent;
        min-height: 48px; /* Força a mesma altura dos botões */
        display: flex; /* Ajuda o Safari a alinhar o placeholder verticalmente */
        align-items: center;
      }
    `;
    document.head.appendChild(style);
  }
}

// ─── Theme ────────────────────────────────────────────────────────────────────

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

// ─── Playtomic ────────────────────────────────────────────────────────────────

const PLAYTOMIC_CLUBS = [
  {
    name: "ESPAV (Alvalade)",
    tenantId: "af3e0532-cf37-43df-9278-c1de1f1a786c",
    sportId: "FOOTBALL_OTHERS",
    slug: "arena-playsports-alvalade-novo-relvado",
  },
  {
    name: "Parque das Nações",
    tenantId: "4c1a676f-fd98-4a84-98f7-93403cb359ff",
    sportId: "FOOTBALL7",
    slug: "arena-playsports-parque-das-nacoes",
  },
];

async function fetchClubAvailability(club, date) {
  const res = await fetch(
    `/api/playtomic?tenant_id=${club.tenantId}&date=${date}&sport_id=${club.sportId}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
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

// ─── Supabase Auth helpers ────────────────────────────────────────────────────

async function signUp(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, created_at")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data;
}

async function fetchUserHistory(userId) {
  const { data, error } = await supabase
    .from("user_event_history")
    .select("*")
    .eq("participant_id", userId)
    .order("confirmed_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Supabase event helpers ───────────────────────────────────────────────────

async function fetchEventById(id) {
  const { data: ev, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !ev) return null;

  const { data: dates } = await supabase
    .from("event_dates")
    .select("date")
    .eq("event_id", id);

  const { data: responses } = await supabase
    .from("responses")
    .select("id, user_id, display_name, updated_at")
    .eq("event_id", id);

  const fullResponses = await Promise.all(
    (responses || []).map(async (r) => {
      const { data: slots } = await supabase
        .from("availability_slots")
        .select("date, slot_minutes")
        .eq("response_id", r.id);

      const availability = {};
      (slots || []).forEach(({ date, slot_minutes }) => {
        availability[`${date}|${slot_minutes}`] = true;
      });

      return {
        userId: r.user_id,
        name: r.display_name,
        availability,
        updatedAt: r.updated_at,
        _id: r.id,
      };
    })
  );

  const sortedResponses = fullResponses.sort((a, b) =>
    a.name.localeCompare(b.name, "pt-PT")
  );

  return {
    id: ev.id,
    title: ev.title,
    creatorId: ev.creator_id,
    dates: (dates || []).map((d) => d.date).sort(),
    startTime: ev.start_time,
    endTime: ev.end_time,
    status: ev.status,
    confirmedDate: ev.confirmed_date,
    confirmedStart: ev.confirmed_start,
    confirmedEnd: ev.confirmed_end,
    confirmedDurationMinutes: ev.confirmed_duration_minutes,
    confirmedAt: ev.confirmed_at,
    responses: sortedResponses,
    createdAt: ev.created_at,
  };
}

async function insertEvent(event, creatorId) {
  const { error } = await supabase.from("events").insert({
    id: event.id,
    title: event.title,
    creator_id: creatorId,
    start_time: event.startTime,
    end_time: event.endTime,
  });
  if (error) throw error;

  if (event.dates.length > 0) {
    const { error: datesError } = await supabase.from("event_dates").insert(
      event.dates.map((date) => ({ event_id: event.id, date }))
    );
    if (datesError) throw datesError;
  }
}

async function upsertResponse(eventId, userId, displayName, availability) {
  // Check if response already exists for this user+event
  const { data: existing } = await supabase
    .from("responses")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  let responseId;

  if (existing) {
    responseId = existing.id;

    // Clear old slots
    await supabase.from("availability_slots").delete().eq("response_id", responseId);

    // Update display name
    await supabase
      .from("responses")
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq("id", responseId);
  } else {
    const { data: newResponse, error } = await supabase
      .from("responses")
      .insert({ event_id: eventId, user_id: userId, display_name: displayName })
      .select("id")
      .single();
    if (error) throw error;
    responseId = newResponse.id;
  }

  const slots = Object.entries(availability)
    .filter(([, val]) => !!val)
    .map(([key]) => {
      const [date, slot_minutes] = key.split("|");
      return { response_id: responseId, date, slot_minutes: Number(slot_minutes) };
    });

  if (slots.length > 0) {
    const { error: slotsError } = await supabase.from("availability_slots").insert(slots);
    if (slotsError) throw slotsError;
  }
}

async function confirmEvent(eventId, { date, start, end, durationMinutes }) {
  const { error } = await supabase
    .from("events")
    .update({
      status: "confirmed",
      confirmed_date: date,
      confirmed_start: start,
      confirmed_end: end,
      confirmed_duration_minutes: durationMinutes,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) throw error;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

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

function possibleDaysLabel(count) {
  return `${count} dia${count !== 1 ? "s" : ""} possíve${count !== 1 ? "is" : "l"}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function generateSlots(startTime, endTime) {
  const start = parseTime(startTime);
  let end = parseTime(endTime);
  if (end <= start) end += 1440;
  const slots = [];
  for (let m = start; m < end; m += 30) {
    slots.push({ id: String(m), label: timeLabel(m), dayOffset: Math.floor(m / 1440), isHour: m % 60 === 0 });
  }
  return slots;
}

function slotKey(dateKey, slotId) {
  return `${dateKey}|${slotId}`;
}

function getInitialThemeMode() {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* ignore */ }
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

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  // Auth state
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App state
  const [currentEvent, setCurrentEvent] = useState(null);
  const [screen, setScreen] = useState("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingEventId, setPendingEventId] = useState(null); // event id from URL, waiting for auth

  // Create event
  const [eventTitle, setEventTitle] = useState("");
  const [createStep, setCreateStep] = useState("title");
  const [selectedDates, setSelectedDates] = useState({});
  const [calendarStart, setCalendarStart] = useState(() => startOfWeekSunday(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("22:30");

  // Participate
  const [eventCode, setEventCode] = useState("");
  const [participantDisplayName, setParticipantDisplayName] = useState("");
  const [availability, setAvailability] = useState({});

  // UI
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);

  // Confirm event (owner)
  const [confirmDate, setConfirmDate] = useState("");
  const [confirmStart, setConfirmStart] = useState("");
  const [confirmEnd, setConfirmEnd] = useState("");
  const [confirmDuration, setConfirmDuration] = useState("");

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Playtomic
  const [playtomicResults, setPlaytomicResults] = useState(null);
  const [playtomicLoading, setPlaytomicLoading] = useState(false);

  const dragging = useRef(false);
  const dragVal = useRef(true);
  const createSubmitting = useRef(false);
  const responseSubmitting = useRef(false);

  const isPhone = useIsPhone();

  // ── Auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else {
        // Check for event link before auth
        const params = new URLSearchParams(window.location.search);
        const id = params.get("event");
        if (id) setPendingEventId(id.trim());
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else { setProfile(null); setAuthLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const p = await fetchProfile(userId);
    setProfile(p);
    setAuthLoading(false);
  };

  // ── After login with pending event, load it and go to name entry ──
  useEffect(() => {
    if (!session || !profile || !pendingEventId) return;
    const id = pendingEventId;
    setPendingEventId(null);
    (async () => {
      setLoading(true);
      try {
        const ev = await fetchEventById(id);
        if (ev) {
          setCurrentEvent(ev);
          window.history.pushState({}, "", `${window.location.pathname}?event=${id}`);
          const existingResponse = ev.responses?.find((r) => r.userId === session.user.id);
          setParticipantDisplayName(profile.display_name);
          setAvailability(existingResponse?.availability || {});
          setScreen("nameEntry");
        } else {
          setError("Evento não encontrado.");
        }
      } catch {
        setError("Erro ao carregar evento.");
      } finally {
        setLoading(false);
      }
    })();
  }, [session, profile, pendingEventId]);

  // ── Theme ──
  useEffect(() => {
    applyThemeMode(themeMode);
    try { window.localStorage.setItem(THEME_KEY, themeMode); } catch { /* ignore */ }
  }, [themeMode]);

  const toggleTheme = useCallback(() => {
    setThemeMode((mode) => (mode === "dark" ? "light" : "dark"));
  }, []);

  const withTheme = useCallback(
    (content) => (
      <>
        <TopBar
          profile={profile}
          themeMode={themeMode}
          onToggleTheme={toggleTheme}
          onProfile={() => { loadHistory(); setScreen("profile"); }}
          onHome={resetToHome}
        />
        {content}
      </>
    ),
    [themeMode, toggleTheme, profile]
  );

  // ── URL event param (when already logged in) ──
  useEffect(() => {
    if (!session) return; // handled by pendingEventId flow
    const params = new URLSearchParams(window.location.search);
    const id = params.get("event");
    if (id) loadEvent(id);
  }, []);

  // ── Drag end ──
  useEffect(() => {
    const stop = () => { dragging.current = false; };
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchend", stop);
    return () => {
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchend", stop);
    };
  }, []);

  const loadEvent = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const ev = await fetchEventById(id.trim());
      if (ev) {
        setCurrentEvent(ev);
        window.history.pushState({}, "", `${window.location.pathname}?event=${id.trim()}`);
        setScreen("event");
      } else {
        setError("Evento não encontrado.");
      }
    } catch {
      setError("Erro ao carregar evento. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  const reloadCurrentEvent = async () => {
    if (!currentEvent) return;
    const ev = await fetchEventById(currentEvent.id);
    if (ev) setCurrentEvent(ev);
  };

  const loadHistory = async () => {
    if (!session) return;
    setHistoryLoading(true);
    try {
      const data = await fetchUserHistory(session.user.id);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

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

  const eventLink = currentEvent
    ? `${window.location.origin}${window.location.pathname}?event=${currentEvent.id}`
    : "";

  const isOwner = currentEvent && session && currentEvent.creatorId === session.user.id;

  const createEvent = async () => {
    if (createSubmitting.current || !session || !profile) return;
    blurActiveElement();
    if (!eventTitle.trim() || selectedDateKeys.length === 0) return;

    createSubmitting.current = true;
    setLoading(true);
    setError(null);

    const id = uid();
    const newEvent = {
      id,
      title: eventTitle.trim(),
      dates: selectedDateKeys,
      startTime,
      endTime,
      responses: [],
      createdAt: new Date().toISOString(),
    };

    try {
      await insertEvent(newEvent, session.user.id);
      setCurrentEvent({ ...newEvent, creatorId: session.user.id, status: "draft" });
      setParticipantDisplayName(profile.display_name);
      setAvailability({});
      window.history.pushState({}, "", `${window.location.pathname}?event=${id}`);
      setCreateStep("title");
      setScreen("created");
    } catch {
      setError("Erro ao criar evento. Verifica a ligação e tenta novamente.");
    } finally {
      setLoading(false);
      setTimeout(() => { createSubmitting.current = false; }, 300);
    }
  };

  const openEvent = (id) => {
    const clean = id.trim();
    if (!clean) return;
    loadEvent(clean);
  };

  const startResponse = () => {
    if (!currentEvent || !profile) return;
    const name = participantDisplayName.trim() || profile.display_name;
    const existing = currentEvent.responses?.find((r) => r.userId === session?.user?.id);
    setParticipantDisplayName(name);
    setAvailability(existing?.availability || {});
    setScreen("fill");
  };

  const onCellDown = useCallback(
    (dateKey, slotId) => {
      const k = slotKey(dateKey, slotId);
      const newVal = !availability[k];
      dragVal.current = newVal;
      dragging.current = true;
      setAvailability((p) => ({ ...p, [k]: newVal }));
    },
    [availability]
  );

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
      setAvailability((p) => ({
        ...p,
        [slotKey(el.dataset.date, el.dataset.slot)]: dragVal.current,
      }));
    }
  }, []);

  const submitResponse = async () => {
    if (responseSubmitting.current || !session || !profile) return;
    blurActiveElement();
    dragging.current = false;

    const name = participantDisplayName.trim() || profile.display_name;
    if (!currentEvent || !name) return;

    responseSubmitting.current = true;
    setLoading(true);
    setError(null);

    try {
      await upsertResponse(currentEvent.id, session.user.id, name, availability);
      await reloadCurrentEvent();
      setScreen("results");
    } catch {
      setError("Erro ao guardar disponibilidade. Tenta novamente.");
    } finally {
      setLoading(false);
      setTimeout(() => { responseSubmitting.current = false; }, 300);
    }
  };

  const submitConfirmEvent = async () => {
    if (!currentEvent || !isOwner) return;
    if (!confirmDate || !confirmStart || !confirmEnd) {
      setError("Preenche todos os campos para confirmar o evento.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const duration = confirmDuration ? Number(confirmDuration) : null;
      await confirmEvent(currentEvent.id, {
        date: confirmDate,
        start: confirmStart,
        end: confirmEnd,
        durationMinutes: duration,
      });
      await reloadCurrentEvent();

      // Consultar Playtomic após confirmação
      setPlaytomicLoading(true);
      try {
        const startMinutes = parseTime(confirmStart);
        const rawEnd = parseTime(confirmEnd);
        const endMinutes = rawEnd <= startMinutes ? rawEnd + 1440 : rawEnd;

        const clubsData = await Promise.all(
          PLAYTOMIC_CLUBS.map(async (club) => {
            try {
              const data = await fetchClubAvailability(club, confirmDate);
              const filtered = (data || []).map((resource) => ({
                resourceId: resource.resource_id,
                slots: (resource.slots || []).filter((s) => {
                  const [h, m] = s.start_time.split(":").map(Number);
                  const slotMinutes = h * 60 + m;
                  return slotMinutes >= startMinutes && slotMinutes < endMinutes;
                }),
              })).filter((r) => r.slots.length > 0);
              return { club, resources: filtered, error: null };
            } catch {
              return { club, resources: [], error: true };
            }
          })
        );

        setPlaytomicResults({ date: confirmDate, start: confirmStart, end: confirmEnd, clubs: clubsData });
        setScreen("playtomic");
      } catch {
        setScreen("results");
      } finally {
        setPlaytomicLoading(false);
      }
    } catch {
      setError("Erro ao confirmar evento. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  const openPlaytomic = async () => {
    if (!currentEvent || playtomicLoading) return;
    const date = currentEvent.confirmedDate;
    const start = currentEvent.confirmedStart;
    const end = currentEvent.confirmedEnd;
    if (!date || !start || !end) return;

    setPlaytomicLoading(true);
    try {
      const startMinutes = parseTime(start);
      const rawEnd = parseTime(end);
      const endMinutes = rawEnd <= startMinutes ? rawEnd + 1440 : rawEnd;

      const clubsData = await Promise.all(
        PLAYTOMIC_CLUBS.map(async (club) => {
          try {
            const data = await fetchClubAvailability(club, date);
            const filtered = (data || []).map((resource) => ({
              resourceId: resource.resource_id,
              slots: (resource.slots || []).filter((s) => {
                const [h, m] = s.start_time.split(":").map(Number);
                const slotMinutes = h * 60 + m;
                return slotMinutes >= startMinutes && slotMinutes < endMinutes;
              }),
            })).filter((r) => r.slots.length > 0);
            return { club, resources: filtered, error: null };
          } catch {
            return { club, resources: [], error: true };
          }
        })
      );

      setPlaytomicResults({ date, start, end, clubs: clubsData });
      setScreen("playtomic");
    } catch {
      setError("Erro ao consultar a Playtomic.");
    } finally {
      setPlaytomicLoading(false);
    }
  };

  const getCount = (dateKey, slotId) => {
    if (!currentEvent) return 0;
    return (currentEvent.responses || []).filter(
      (r) => r.availability?.[slotKey(dateKey, slotId)]
    ).length;
  };

  const getNames = (dateKey, slotId) => {
    if (!currentEvent) return [];
    return (currentEvent.responses || [])
      .filter((r) => r.availability?.[slotKey(dateKey, slotId)])
      .map((r) => r.name);
  };

  const currentParticipantResponse = useMemo(() => {
    if (!currentEvent || !session) return null;
    return (currentEvent.responses || []).find((r) => r.userId === session.user.id) || null;
  }, [currentEvent, session]);

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
        if (count > 0) rows.push({ dateKey: d, slot: s, count, names: getNames(d, s.id) });
      }
    }
    return rows
      .sort((a, b) => b.count - a.count || a.dateKey.localeCompare(b.dateKey) || Number(a.slot.id) - Number(b.slot.id))
      .slice(0, 4);
  }, [currentEvent, eventDates, slots]);

  const selectedCount = Object.values(availability).filter(Boolean).length;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { setCopied(false); }
  };

  const copyEventCode = async () => {
    if (!currentEvent?.id) return;
    try {
      await navigator.clipboard.writeText(currentEvent.id);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1400);
    } catch { setCopiedCode(false); }
  };

  const shareWhatsApp = () => {
    if (!currentEvent?.id) return;
    const message = `Coloca a tua disponibilidade no evento "${currentEvent.title}". Entra pelo link ou coloca o código na página principal. Link: ${eventLink} Código: ${currentEvent.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const resetToHome = () => {
    setScreen("home");
    setCurrentEvent(null);
    setParticipantDisplayName("");
    setAvailability({});
    setCreateStep("title");
    setError(null);
    window.history.pushState({}, "", window.location.pathname);
  };

  // ── Loading inicial (auth) ──
  if (authLoading) {
    return (
      <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: MUTED2 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div>
          <p style={{ margin: 0, fontSize: 14 }}>A carregar...</p>
        </div>
      </div>
    );
  }

  // ── Sem sessão → Auth screens ──
  if (!session) {
    return <AuthScreen onSuccess={() => { }} pendingEventId={pendingEventId} />;
  }

  // ── Name entry screen (entered via link) ──
  if (screen === "nameEntry" && currentEvent) {
    const canContinue = (participantDisplayName.trim() || profile?.display_name || "").length > 0;
    return withTheme(
      <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px 40px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={modalCardStyle}>
            <div style={{ width: 52, height: 52, borderRadius: 20, background: ACCENT_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>👋</div>
            <p style={{ margin: "0 0 4px", color: ACCENT_DARK, fontSize: 22, fontWeight: 900 }}>{currentEvent.title}</p>
            <p style={{ margin: "0 0 20px", color: MUTED2, fontSize: 13 }}>Como queres aparecer neste evento?</p>
            <label style={{ ...labelStyle, display: "block", marginBottom: 14 }}>
              O teu nome
              <input
                autoFocus
                value={participantDisplayName}
                onChange={(e) => setParticipantDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canContinue && (() => { setScreen("fill"); })()}
                placeholder={profile?.display_name || "O teu nome"}
                style={{ ...inputStyle, fontSize: 16, padding: "14px 16px", marginTop: 8 }}
              />
            </label>
            <button
              onClick={() => setScreen("fill")}
              disabled={!canContinue}
              style={{ ...buttonBase, width: "100%", background: canContinue ? ACCENT : DISABLED_BG, color: canContinue ? "#fff" : MUTED2, boxShadow: canContinue ? "0 14px 32px rgba(34,197,94,0.22)" : "none" }}
            >
              Continuar para Disponibilidade
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading geral ──
  if (loading) {
    return withTheme(
      <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: MUTED2 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div>
          <p style={{ margin: 0, fontSize: 14 }}>A carregar...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────── HOME

  if (screen === "home") {
    return withTheme(
      <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <div style={{
              width: 68, height: 68, background: ACCENT_SOFT, borderRadius: 24,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, margin: "0 auto 16px", border: `1px solid ${BORDER}`, boxShadow: SOFT_SHADOW,
            }}>⚽</div>
            <h1 style={{ margin: "10px 0 0", fontSize: 32, color: "#166534", letterSpacing: "-1px" }}>
              Organiza Eventos
            </h1>
            <p style={{ margin: "20px 20px 0", color: MUTED2, fontSize: 13 }}>
              Olá, {profile?.display_name}. Marca a melhor hora para toda a gente.
            </p>
          </div>

          {error && <ErrorBanner message={error} />}

          <div style={{ display: "grid", gap: 12 }}>
            <button
              onClick={() => { setCreateStep("title"); setScreen("create"); }}
              style={{ ...buttonBase, background: ACCENT, color: "#fff", width: "100%", boxShadow: "0 14px 32px rgba(34,197,94,0.22)" }}
            >
              Criar Evento
            </button>

            <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 22, padding: 16 }}>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: MUTED2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px" }}>
                Entrar num evento
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && openEvent(eventCode)}
                  placeholder="Código do evento"
                  style={inputStyle}
                />
                <button
                  onClick={() => openEvent(eventCode)}
                  disabled={!eventCode.trim()}
                  style={{ ...buttonBase, background: eventCode.trim() ? ACCENT : SURFACE, color: eventCode.trim() ? "#fff" : MUTED2, whiteSpace: "nowrap" }}
                >
                  Entrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────── PROFILE

  if (screen === "profile") {
    return withTheme(
      <div style={{ ...BASE, padding: "80px 24px 40px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <button onClick={resetToHome} style={{ ...miniButton, width: 36, height: 36 }}>←</button>
            <div>
              <h2 style={{ margin: 0, fontSize: 22 }}>{profile?.display_name}</h2>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: MUTED2 }}>{session?.user?.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 16, marginBottom: 20 }}>
            <p style={sectionTitle}>Resumo</p>
            <div style={{ display: "flex", gap: 24 }}>
              <div>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: ACCENT_DARK }}>{history.length}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED2 }}>evento{history.length !== 1 ? "s" : ""} participado{history.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>

          {/* History */}
          <p style={sectionTitle}>Histórico</p>
          {historyLoading ? (
            <p style={{ color: MUTED2, fontSize: 13 }}>A carregar histórico...</p>
          ) : history.length === 0 ? (
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16, color: MUTED2, fontSize: 13 }}>
              Ainda não participaste em nenhum evento confirmado.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {history.map((ev) => (
                <div key={ev.event_id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <strong style={{ fontSize: 15 }}>{ev.event_title}</strong>
                    <span style={{
                      background: ACCENT_SOFT, color: ACCENT_DARK, borderRadius: 999,
                      padding: "4px 10px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap",
                    }}>
                      Confirmado
                    </span>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: MUTED2 }}>
                    Owner: {ev.owner_name}
                  </p>
                  {ev.confirmed_date && (
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: TEXT }}>
                      {formatDateLong(ev.confirmed_date)} · {ev.confirmed_start}–{ev.confirmed_end}
                      {ev.confirmed_duration_minutes ? ` · ${ev.confirmed_duration_minutes} min` : ""}
                    </p>
                  )}
                  {ev.participants && (
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: MUTED2 }}>
                      Participantes: {Array.isArray(ev.participants) ? ev.participants.join(", ") : ev.participants}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={async () => { await signOut(); }}
            style={{ ...buttonBase, background: DANGER, color: "#fff", width: "100%", marginTop: 32 }}
          >
            Terminar Sessão
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────── CREATE

  if (screen === "create") {
    const canContinueTitle = eventTitle.trim().length > 0;
    const canCreate = eventTitle.trim() && selectedDateKeys.length > 0;
    const crossesMidnight = parseTime(endTime) <= parseTime(startTime);

    if (createStep === "title") {
      return withTheme(
        <div style={{ ...BASE, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 18px 24px" }}>
          <div style={{ width: "100%", maxWidth: 430 }}>
            <button onClick={resetToHome} style={{ ...miniButton, marginBottom: 18 }}>←</button>
            <div style={modalCardStyle}>
              <div style={{ width: 56, height: 56, borderRadius: 22, background: ACCENT_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 27, marginBottom: 18 }}>⚡</div>
              <p style={{ margin: "0 0 8px", color: ACCENT_DARK, fontSize: 26, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.8px" }}>Novo Evento</p>
              <p style={{ margin: "15px 0 20px", color: MUTED2, fontSize: 14, lineHeight: 1.5 }}>
                Dá um nome ao evento.
              </p>
              <label style={{ ...labelStyle, display: "block", marginBottom: 12 }}>
                Nome do evento
                <input
                  autoFocus
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canContinueTitle && setCreateStep("details")}
                  placeholder="Ex: Futsal sexta à noite"
                  style={{ ...inputStyle, fontSize: 17, padding: "16px 17px", marginTop: 7 }}
                />
              </label>
              <button
                onClick={() => setCreateStep("details")}
                disabled={!canContinueTitle}
                style={{ ...buttonBase, width: "100%", marginTop: 14, background: canContinueTitle ? ACCENT : DISABLED_BG, color: canContinueTitle ? "#fff" : MUTED2, boxShadow: canContinueTitle ? "0 14px 32px rgba(34,197,94,0.22)" : "none" }}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return withTheme(
      <div style={{ ...BASE, padding: isPhone ? "72px 12px 28px" : "80px 16px 22px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Header
            title="Criar Evento"
            subtitle="Escolhe os dias e o intervalo de horas"
            onBack={() => setCreateStep("title")}
          />

          {error && <ErrorBanner message={error} />}

          <div style={{ display: "grid", gap: 14 }}>
            <div style={eventNameCardStyle}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: "0 0 5px", color: MUTED2, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.8px" }}>Evento</p>
                <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.2, letterSpacing: "-0.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eventTitle}</h2>
                <p style={{ margin: "5px 0 0", color: MUTED2, fontSize: 12 }}>Criado por {profile?.display_name}</p>
              </div>
              <button onClick={() => setCreateStep("title")} style={{ ...miniButton, width: "auto", paddingInline: 12, fontSize: 12, fontWeight: 800 }}>Editar</button>
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
                  <span key={d} style={{ background: ACCENT_SOFT, border: `1px solid ${BORDER}`, color: ACCENT_DARK, borderRadius: 999, padding: "7px 11px", fontSize: 12, fontWeight: 800 }}>
                    {formatDateLong(d)}
                  </span>
                ))}
              </div>
            )}

            <div style={rangeCardStyle}>
              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: 0, color: MUTED2, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.8px" }}>Range de horas</p>
                <p style={{ margin: "5px 0 0", color: MUTED2, fontSize: 12 }}>Slots de 30 em 30 minutos</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8, width: "100%" }}>
                <label style={{ ...labelStyle, minWidth: 0 }}>
                  Das
                  <input type="time" step="1800" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ ...inputStyle, marginTop: 6, padding: isPhone ? "12px 8px" : "14px 16px", minWidth: 0, width: "100%", WebkitAppearance: "none", appearance: "none" }} />
                </label>
                <label style={{ ...labelStyle, minWidth: 0 }}>
                  Até
                  <input type="time" step="1800" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ ...inputStyle, marginTop: 6, padding: isPhone ? "12px 8px" : "14px 16px", minWidth: 0, width: "100%", WebkitAppearance: "none", appearance: "none" }} />
                </label>
              </div>
              <p style={{ margin: "10px 0 0", color: crossesMidnight ? ACCENT_DARK : MUTED2, fontSize: 12, lineHeight: 1.45 }}>
                {crossesMidnight ? "Este range passa da meia-noite. Ex.: 21:30 → 04:00." : "Os participantes só poderão escolher slots dentro deste intervalo."}
              </p>
            </div>

            <button
              onPointerUp={(e) => { e.preventDefault(); createEvent(); }}
              onClick={createEvent}
              disabled={!canCreate}
              style={{ ...buttonBase, background: canCreate ? ACCENT : DISABLED_BG, color: canCreate ? "#fff" : MUTED2, boxShadow: canCreate ? "0 14px 32px rgba(34,197,94,0.22)" : "none" }}
            >
              Criar Evento
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────── CREATED

  if (screen === "created" && currentEvent) {
    return withTheme(
      <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px 40px" }}>
        <div style={{ width: "100%", maxWidth: 520, background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 28, padding: 22 }}>
          <p style={{ margin: 0, color: ACCENT, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>Evento Criado</p>
          <h1 style={{ margin: "8px 0 4px", fontSize: 24 }}>{currentEvent.title}</h1>
          <p style={{ margin: "0 0 18px", color: MUTED2, fontSize: 13 }}>
            Começa por preencher a tua disponibilidade. Depois podes partilhar o link ou o código com os convidados.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <p style={{ margin: "0 0 6px", color: MUTED2, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.7px" }}>Link do Evento</p>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 14, fontSize: 12, color: MUTED2, wordBreak: "break-all" }}>{eventLink}</div>
            </div>
            <div>
              <p style={{ margin: "0 0 6px", color: MUTED2, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.7px" }}>Código do Evento</p>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 14, fontSize: 16, color: TEXT, fontWeight: 900, letterSpacing: "0.5px", wordBreak: "break-all" }}>{currentEvent.id}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button onClick={startResponse} style={{ ...buttonBase, background: ACCENT, color: "#fff" }}>Preencher Disponibilidade</button>
            <button onClick={shareWhatsApp} style={{ ...buttonBase, background: "#25D366", color: "#fff" }}>Partilhar WhatsApp</button>
            <button onClick={copyLink} style={{ ...buttonBase, background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>{copied ? "Link Copiado" : "Copiar Link"}</button>
            <button onClick={copyEventCode} style={{ ...buttonBase, background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>{copiedCode ? "Código Copiado" : "Copiar Código"}</button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────── EVENT LANDING

  if (screen === "event" && currentEvent) {
    const isConfirmed = currentEvent.status === "confirmed";

    return withTheme(
      <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px 40px" }}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <Header
            title={currentEvent.title}
            subtitle={`${possibleDaysLabel(currentEvent.dates.length)} · ${currentEvent.startTime} às ${currentEvent.endTime}`}
            onBack={resetToHome}
          />

          {isConfirmed && (
            <div style={{ background: ACCENT_SOFT, border: `1px solid ${ACCENT}`, borderRadius: 20, padding: 16, marginBottom: 16 }}>
              <p style={{ margin: "0 0 4px", color: ACCENT_DARK, fontWeight: 800, fontSize: 13 }}>✅ Evento Confirmado</p>
              <p style={{ margin: "0 0 12px", fontSize: 14, color: TEXT }}>
                {formatDateLong(currentEvent.confirmedDate)} · {currentEvent.confirmedStart}–{currentEvent.confirmedEnd}
                {currentEvent.confirmedDurationMinutes ? ` · ${currentEvent.confirmedDurationMinutes} min` : ""}
              </p>
              <button
                onClick={openPlaytomic}
                disabled={playtomicLoading}
                style={{ ...buttonBase, background: playtomicLoading ? DISABLED_BG : ACCENT, color: playtomicLoading ? MUTED2 : "#fff", fontSize: 13, padding: "10px 16px", width: "100%" }}
              >
                {playtomicLoading ? "A consultar campos..." : "🏟 Ver Campos Disponíveis"}
              </button>
            </div>
          )}

          {!isConfirmed && (
            <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 18, marginBottom: 14 }}>
              <p style={{ margin: "0 0 10px", color: MUTED2, fontSize: 12 }}>
                {currentParticipantResponse ? "Já respondeste. Podes editar." : "Marca a tua disponibilidade."}
              </p>
              {profile && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 12, color: MUTED2 }}>Nome para este evento</p>
                  <input
                    value={participantDisplayName || profile.display_name}
                    onChange={(e) => setParticipantDisplayName(e.target.value)}
                    placeholder={profile.display_name}
                    style={inputStyle}
                  />
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={startResponse}
                  style={{ ...buttonBase, background: ACCENT, color: "#fff", flex: 1, marginTop: 6 }}
                >
                  {currentParticipantResponse ? "Editar Disponibilidade" : "Preencher Disponibilidade"}
                </button>
                {currentParticipantResponse && (
                  <button
                    onClick={() => setScreen("results")}
                    style={{ ...buttonBase, background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, flex: 1, marginTop: 6 }}
                  >
                    Ver Disponibilidades
                  </button>
                )}
              </div>
            </div>
          )}

          {isOwner && !isConfirmed && (
            <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 18, marginBottom: 14, boxSizing: "border-box", width: "100%", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: ACCENT_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📅</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: 15, color: TEXT }}>Confirmar Horário</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: MUTED2 }}>Escolhe o horário final e tranca o evento</p>
                </div>
              </div>

              {/* Top 2 suggestions */}
              {bestOptions.slice(0, 2).length > 0 && (() => {
                const selectedKey = confirmDate && confirmStart ? `${confirmDate}|${parseTime(confirmStart)}` : null;
                return (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ ...sectionTitle, marginBottom: 8 }}>💡 Sugestões com mais disponibilidade</p>
                    <div style={{ display: "grid", gap: 6 }}>
                      {bestOptions.slice(0, 2).map((o) => {
                        const interval = formatSlotInterval(o.dateKey, o.slot.id);
                        const isSelected = selectedKey === `${o.dateKey}|${o.slot.id}`;
                        return (
                          <button
                            key={`${o.dateKey}-${o.slot.id}`}
                            type="button"
                            onClick={() => {
                              setConfirmDate(o.dateKey);
                              setConfirmStart(o.slot.label);
                              const endMin = Number(o.slot.id) + 30;
                              setConfirmEnd(timeLabel(endMin));
                            }}
                            style={{
                              background: isSelected ? ACCENT_SOFT : SURFACE,
                              border: `1.5px solid ${isSelected ? ACCENT : BORDER}`,
                              borderRadius: 14, padding: "10px 12px",
                              cursor: "pointer", textAlign: "left", width: "100%", boxSizing: "border-box",
                              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                              fontFamily: "'Sora', sans-serif",
                              transition: "background 0.15s, border-color 0.15s",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: isSelected ? ACCENT_DARK : TEXT }}>
                                {interval.date} · {interval.range}
                              </p>
                              <p style={{ margin: "3px 0 0", fontSize: 11, color: MUTED2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {o.names.slice(0, 3).join(", ")}{o.names.length > 3 ? ` +${o.names.length - 3}` : ""}
                              </p>
                            </div>
                            <span style={{ background: isSelected ? ACCENT : "var(--pelada-disabled-bg)", color: isSelected ? "#fff" : ACCENT_DARK, borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 900, flexShrink: 0, transition: "background 0.15s, color 0.15s" }}>
                              {o.count} pessoa{o.count !== 1 ? "s" : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: 11, color: MUTED2 }}>Clica numa sugestão para a selecionar e pré-preencher os campos.</p>
                  </div>
                );
              })()}

              {/* Divider */}
              <div style={{ height: 1, background: BORDER, margin: "14px 0" }} />

              {/* Form */}
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ ...labelStyle, display: "block" }}>
                  Data
                  <input type="date" value={confirmDate} onChange={(e) => setConfirmDate(e.target.value)} style={{ ...inputStyle, marginTop: 6, boxSizing: "border-box", width: "100%", height: "52px" }} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label style={{ ...labelStyle, display: "block", minWidth: 0 }}>
                    Início
                    <input type="time" step="1800" value={confirmStart} onChange={(e) => setConfirmStart(e.target.value)} style={{ ...inputStyle, marginTop: 6, width: "100%", boxSizing: "border-box", padding: "14px 8px", height: "52px" }} />
                  </label>
                  <label style={{ ...labelStyle, display: "block", minWidth: 0 }}>
                    Fim
                    <input type="time" step="1800" value={confirmEnd} onChange={(e) => setConfirmEnd(e.target.value)} style={{ ...inputStyle, marginTop: 6, width: "100%", boxSizing: "border-box", padding: "14px 8px", height: "52px" }} />
                  </label>
                </div>
                <label style={{ ...labelStyle, display: "block" }}>
                  Duração (minutos, opcional)
                  <input type="number" min="1" value={confirmDuration} onChange={(e) => setConfirmDuration(e.target.value)} placeholder="Ex: 90" style={{ ...inputStyle, marginTop: 6, boxSizing: "border-box", width: "100%" }} />
                </label>
                {error && <ErrorBanner message={error} />}
                <button
                  onClick={submitConfirmEvent}
                  disabled={!confirmDate || !confirmStart || !confirmEnd}
                  style={{ ...buttonBase, width: "100%", background: confirmDate && confirmStart && confirmEnd ? ACCENT : DISABLED_BG, color: confirmDate && confirmStart && confirmEnd ? "#fff" : MUTED2, boxShadow: confirmDate && confirmStart && confirmEnd ? "0 10px 28px rgba(34,197,94,0.22)" : "none" }}
                >
                  ✅ Confirmar e Trancar Evento
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setScreen("results")}
            style={{ marginTop: 8, background: "transparent", color: MUTED2, border: "none", cursor: "pointer", fontFamily: "'Sora', sans-serif", width: "100%", fontSize: 14 }}
          >
            Ver Resultados · {currentEvent.responses?.length || 0} resposta{(currentEvent.responses?.length || 0) !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────── FILL

  if (screen === "fill" && currentEvent) {
    const canSaveResponse = (participantDisplayName.trim() || profile?.display_name || "").length > 0;
    const editingLabel = currentParticipantResponse ? "Guardar Alterações" : "Guardar Disponibilidade";

    return withTheme(
      <div
        onMouseUp={() => { dragging.current = false; }}
        onTouchMove={onTouchMove}
        style={{ ...BASE, padding: isPhone ? "72px 12px calc(92px + env(safe-area-inset-bottom))" : "80px 16px 20px", userSelect: "none" }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Header
            title={currentEvent.title}
            subtitle={currentParticipantResponse ? "Edita os slots em que podes" : "Marca os slots em que podes"}
            onBack={() => setScreen((currentEvent.responses?.length || 0) > 0 ? "results" : "event")}
            right={`${selectedCount} slot${selectedCount !== 1 ? "s" : ""}`}
          />

          {error && <ErrorBanner message={error} />}

          <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 14, marginBottom: 14 }}>
            <p style={{ margin: "0 0 6px", color: MUTED2, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.7px" }}>Resposta de</p>
            <strong style={{ display: "block", color: TEXT, fontSize: 16 }}>{participantDisplayName || profile?.display_name}</strong>
            <p style={{ margin: "8px 0 0", color: MUTED2, fontSize: 12 }}>Podes voltar ao evento para editar os teus horários.</p>
          </div>

          <AvailabilityGrid
            eventDates={eventDates}
            slots={slots}
            availability={availability}
            onCellDown={onCellDown}
            onCellEnter={onCellEnter}
          />

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

  // ─────────────────────────────────────────────────────────────── RESULTS

  if (screen === "results" && currentEvent) {
    const max = currentEvent.responses?.length || 1;
    const isConfirmed = currentEvent.status === "confirmed";

    return withTheme(
      <div style={{ ...BASE, padding: isPhone ? "72px 12px 28px" : "80px 16px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Header
            title="Resultados"
            subtitle={currentEvent.title}
            onBack={() => setScreen("event")}
            right={`${currentEvent.responses?.length || 0} resposta${(currentEvent.responses?.length || 0) !== 1 ? "s" : ""}`}
          />

          {isConfirmed && (
            <div style={{ background: ACCENT_SOFT, border: `1px solid ${ACCENT}`, borderRadius: 20, padding: 16, marginBottom: 20 }}>
              <p style={{ margin: "0 0 4px", color: ACCENT_DARK, fontWeight: 800, fontSize: 13 }}>✅ Evento Confirmado</p>
              <p style={{ margin: "0 0 12px", fontSize: 14, color: TEXT }}>
                {formatDateLong(currentEvent.confirmedDate)} · {currentEvent.confirmedStart}–{currentEvent.confirmedEnd}
                {currentEvent.confirmedDurationMinutes ? ` · ${currentEvent.confirmedDurationMinutes} min` : ""}
              </p>
              {isOwner && (
                <button
                  onClick={openPlaytomic}
                  disabled={playtomicLoading}
                  style={{ ...buttonBase, background: playtomicLoading ? DISABLED_BG : ACCENT, color: playtomicLoading ? MUTED2 : "#fff", fontSize: 13, padding: "10px 16px", width: "100%" }}
                >
                  {playtomicLoading ? "A consultar campos..." : "🏟 Ver Campos Disponíveis"}
                </button>
              )}
            </div>
          )}

          <Heatmap eventDates={eventDates} slots={slots} max={max} getCount={getCount} getNames={getNames} />

          <BestOptionsList bestOptions={bestOptions} />

          {(currentEvent.responses?.length || 0) > 0 && (
            <div style={{ marginTop: 26 }}>
              <p style={sectionTitle}>Responderam</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {currentEvent.responses.map((r) => (
                  <span key={r.userId || r.name} style={{ background: r.userId === session?.user?.id ? ACCENT_SOFT : SURFACE, border: `1px solid ${r.userId === session?.user?.id ? ACCENT : BORDER}`, borderRadius: 999, padding: "7px 13px", fontSize: 13, color: r.userId === session?.user?.id ? ACCENT_DARK : TEXT }}>
                    {r.name}{r.userId === session?.user?.id ? " (tu)" : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 28 }}>
            {currentParticipantResponse && !isConfirmed && (
              <button onClick={editCurrentAvailability} style={{ ...buttonBase, background: ACCENT, color: "#fff" }}>
                Editar Disponibilidade
              </button>
            )}
            {!currentParticipantResponse && !isConfirmed && (
              <button onClick={startResponse} style={{ ...buttonBase, background: ACCENT, color: "#fff" }}>
                Preencher Disponibilidade
              </button>
            )}
            <button onClick={shareWhatsApp} style={{ ...buttonBase, background: "#25D366", color: "#fff" }}>Partilhar WhatsApp</button>
            <button onClick={copyLink} style={{ ...buttonBase, background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>{copied ? "Link Copiado" : "Copiar Link"}</button>
            <button onClick={copyEventCode} style={{ ...buttonBase, background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>{copiedCode ? "Código Copiado" : "Copiar Código"}</button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────── PLAYTOMIC
  if (screen === "playtomic" && playtomicResults) {
    const hasAny = playtomicResults.clubs.some((c) => c.resources.length > 0);

    return withTheme(
      <div style={{ ...BASE, padding: isPhone ? "72px 12px 28px" : "80px 16px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <Header
            title="Campos Disponíveis"
            subtitle={`${formatDateLong(playtomicResults.date)} · ${playtomicResults.start}–${playtomicResults.end}`}
            onBack={() => setScreen("event")}
          />

          <div style={{ background: ACCENT_SOFT, border: `1px solid ${ACCENT}`, borderRadius: 18, padding: 14, marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: ACCENT_DARK, fontWeight: 700 }}>
              ✅ Evento confirmado. Campos disponíveis na Playtomic para este horário.
            </p>
          </div>

          {playtomicLoading && (
            <p style={{ color: MUTED2, fontSize: 14 }}>A consultar a Playtomic...</p>
          )}

          {!playtomicLoading && !hasAny && (
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16, color: MUTED2, fontSize: 14, marginBottom: 14 }}>
              Nenhum campo disponível neste horário nos clubes guardados. Podes procurar diretamente na Playtomic.
            </div>
          )}

          {playtomicResults.clubs.map(({ club, resources, error: clubError }) => (
            <div key={club.tenantId} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 16, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: resources.length > 0 ? 12 : 0 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: 15 }}>{club.name}</p>
                  {clubError && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: DANGER }}>Erro ao consultar este clube.</p>
                  )}
                  {!clubError && resources.length === 0 && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: MUTED2 }}>Sem campos disponíveis neste horário.</p>
                  )}
                </div>
                <a
                  href={`https://playtomic.com/clubs/${club.slug}?date=${playtomicResults.date}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...buttonBase, background: ACCENT, color: "#fff", fontSize: 13, padding: "10px 14px", textDecoration: "none", borderRadius: 14, flexShrink: 0 }}
                >
                  Reservar ↗
                </a>
              </div>

              {resources.map((resource, ri) => (
                <div key={resource.resourceId} style={{ marginTop: ri > 0 ? 12 : 0 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, color: MUTED2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Campo {ri + 1}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {resource.slots.map((s, si) => (
                      <span key={si} style={{ background: ACCENT_SOFT, border: `1px solid ${ACCENT}`, color: ACCENT_DARK, borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>
                        {s.start_time.slice(0, 5)} · {s.duration} min · {s.price}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              onClick={() => setScreen("event")}
              style={{ ...buttonBase, background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, flex: 1 }}
            >
              ← Voltar ao Evento
            </button>
            <button
              onClick={() => setScreen("results")}
              style={{ ...buttonBase, background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, flex: 1 }}
            >
              Ver Resultados
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────

function AuthScreen({ onSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMsg(null);
    if (!email.trim() || !password.trim()) { setError("Preenche email e password."); return; }
    if (mode === "register" && !displayName.trim()) { setError("Preenche o teu nome."); return; }

    setLoading(true);
    try {
      if (mode === "register") {
        await signUp(email.trim(), password, displayName.trim());
        setSuccessMsg("Conta criada! Verifica o teu email para confirmar o registo.");
      } else {
        await signIn(email.trim(), password);
        onSuccess();
      }
    } catch (err) {
      setError(err.message || "Ocorreu um erro. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: ACCENT_SOFT, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 16px", border: `1px solid ${BORDER}` }}>⚽</div>
          <h1 style={{ margin: 0, fontSize: 28, color: "#166534", letterSpacing: "-1px" }}>Organiza Eventos</h1>
          <p style={{ margin: "8px 0 0", color: MUTED2, fontSize: 13 }}>
            {mode === "login" ? "Entra na tua conta" : "Cria a tua conta"}
          </p>
        </div>

        <div style={modalCardStyle}>
          {error && <ErrorBanner message={error} />}
          {successMsg && (
            <div style={{ background: ACCENT_SOFT, border: `1px solid ${ACCENT}`, color: ACCENT_DARK, borderRadius: 14, padding: 12, fontSize: 13, marginBottom: 14 }}>
              {successMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            {mode === "register" && (
              <label style={labelStyle}>
                Nome
                <input
                  autoFocus
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: Pedro Salgado"
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </label>
            )}

            <label style={labelStyle}>
              Email
              <input
                autoFocus={mode === "login"}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="email@exemplo.com"
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </label>

            <label style={labelStyle}>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••"
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </label>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ ...buttonBase, background: loading ? DISABLED_BG : ACCENT, color: loading ? MUTED2 : "#fff", width: "100%", marginTop: 4, boxShadow: loading ? "none" : "0 14px 32px rgba(34,197,94,0.22)" }}
            >
              {loading ? "A processar..." : mode === "login" ? "Entrar" : "Criar Conta"}
            </button>
          </div>

          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); setSuccessMsg(null); }}
            style={{ background: "transparent", border: "none", color: ACCENT_DARK, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Sora', sans-serif", marginTop: 16, width: "100%", textAlign: "center" }}
          >
            {mode === "login" ? "Ainda não tens conta? Criar conta" : "Já tens conta? Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({ profile, themeMode, onToggleTheme, onProfile, onHome }) {
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

// ─── Shared components ────────────────────────────────────────────────────────

function ErrorBanner({ message }) {
  return (
    <div style={{ background: "rgba(255,107,107,0.08)", border: `1px solid ${DANGER}`, color: DANGER, borderRadius: 18, padding: 14, fontSize: 13, marginBottom: 14 }}>
      {message}
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
      <p style={sectionTitle}>Melhores opções</p>
      <div style={{ display: "grid", gap: 8 }}>
        {bestOptions.map((o, index) => {
          const interval = formatSlotInterval(o.dateKey, o.slot.id);
          return (
            <div key={`${o.dateKey}-${o.slot.id}`} style={{ background: SURFACE, border: `1px solid ${index === 0 ? ACCENT : BORDER}`, borderRadius: 18, padding: isPhone ? 12 : 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, boxShadow: index === 0 ? "0 14px 30px rgba(34,197,94,0.12)" : "none" }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: isPhone ? 13 : 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {index + 1}. {interval.date} · {interval.range}
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

// ─── Static styles ────────────────────────────────────────────────────────────

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