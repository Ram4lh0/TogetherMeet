import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Constants & theme ────────────────────────────────────────────────────────
import {
  THEME_KEY, BASE,
  ACCENT, ACCENT_DARK, ACCENT_SOFT, SURFACE, SURFACE2, BORDER,
  MUTED2, TEXT, DANGER, DISABLED_BG,
  getInitialThemeMode, applyThemeMode,
} from "./styles/theme";

import {
  buttonBase, inputStyle, modalCardStyle, eventNameCardStyle,
  rangeCardStyle, miniButton, labelStyle, sectionTitle,
} from "./styles/styles";

// ─── Lib/API ──────────────────────────────────────────────────────────────────
import {
  supabase,
  signUp, signIn, signOut,
  fetchProfile, fetchEventById, insertEvent, upsertResponse, confirmEvent,
  fetchUserHistory,
  PLAYTOMIC_CLUBS, fetchClubAvailability, getPlaytomicBookingUrl,
} from "./services/api";

import {
  uid, dateToKey, addWeeks, startOfWeekSunday,
  generateSlots, slotKey, formatDateLong, formatSlotInterval,
  parseTime, timeLabel, possibleDaysLabel, blurActiveElement,
} from "./utils/utils";

// ─── Hooks ────────────────────────────────────────────────────────────────────
import { useIsPhone } from "./hooks/useViewport";

// ─── Components ───────────────────────────────────────────────────────────────
import TopBar from "./components/TopBar";
import { ErrorBanner, Header } from "./components/Shared";
import BestOptionsList from "./components/BestOptionsList";
import AvailabilityGrid from "./components/AvailabilityGrid";
import Heatmap from "./components/Heatmap";
import IntegratedCalendarPicker from "./components/CalendarPicker";

// ─── Screens ──────────────────────────────────────────────────────────────────
import AuthScreen from "./screens/AuthScreen";

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
  const [pendingEventId, setPendingEventId] = useState(null);

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

  // ── After login with pending event ──
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

  // ── URL event param (already logged in) ──
  useEffect(() => {
    if (!session) return;
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

  // ─── Event helpers ────────────────────────────────────────────────────────

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

  // ─── Best options (60min / 90min blocks) ─────────────────────────────────

  const bestOptions = useMemo(() => {
    if (!currentEvent) return [];

    const blocks = [];

    for (const d of eventDates) {
      const available = slots
        .map((s) => ({ id: Number(s.id), count: getCount(d, s.id), names: getNames(d, s.id) }))
        .filter((s) => s.count > 0)
        .sort((a, b) => a.id - b.id);

      if (available.length === 0) continue;

      const runs = [];
      let current = [available[0]];
      for (let i = 1; i < available.length; i++) {
        if (available[i].id === available[i - 1].id + 30) {
          current.push(available[i]);
        } else {
          runs.push(current);
          current = [available[i]];
        }
      }
      runs.push(current);

      for (const run of runs) {
        if (run.length >= 3) {
          for (let i = 0; i <= run.length - 3; i++) {
            const window = run.slice(i, i + 3);
            const minCount = Math.min(...window.map((s) => s.count));
            const nameSet = window.reduce((set, s) => {
              if (set === null) return new Set(s.names);
              return new Set(s.names.filter((n) => set.has(n)));
            }, null);
            blocks.push({ dateKey: d, slotId: String(window[0].id), durationSlots: 3, count: minCount, names: Array.from(nameSet) });
          }
        }
        if (run.length >= 2) {
          for (let i = 0; i <= run.length - 2; i++) {
            const window = run.slice(i, i + 2);
            const minCount = Math.min(...window.map((s) => s.count));
            const nameSet = window.reduce((set, s) => {
              if (set === null) return new Set(s.names);
              return new Set(s.names.filter((n) => set.has(n)));
            }, null);
            blocks.push({ dateKey: d, slotId: String(window[0].id), durationSlots: 2, count: minCount, names: Array.from(nameSet) });
          }
        }
      }
    }

    if (blocks.length === 0) return [];

    blocks.sort((a, b) =>
      b.durationSlots - a.durationSlots ||
      b.count - a.count ||
      a.dateKey.localeCompare(b.dateKey) ||
      Number(a.slotId) - Number(b.slotId)
    );

    const chosen = [];
    for (const block of blocks) {
      const blockStart = Number(block.slotId);
      const blockEnd = blockStart + block.durationSlots * 30;
      const overlaps = chosen.some(
        (c) =>
          c.dateKey === block.dateKey &&
          Number(c.slotId) < blockEnd &&
          Number(c.slotId) + c.durationSlots * 30 > blockStart
      );
      if (!overlaps) chosen.push(block);
      if (chosen.length >= 4) break;
    }

    return chosen;
  }, [currentEvent, eventDates, slots]);

  // ─── Actions ─────────────────────────────────────────────────────────────

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

  const editCurrentAvailability = () => {
    if (!currentParticipantResponse) return;
    setAvailability(currentParticipantResponse.availability || {});
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

  // ─── Screens ──────────────────────────────────────────────────────────────

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

  if (!session) {
    return <AuthScreen onSuccess={() => { }} pendingEventId={pendingEventId} />;
  }

  // ── Name entry ──
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

  // ── Home ──
  if (screen === "home") {
    return withTheme(
      <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <div style={{
              width: 68, height: 68, background: ACCENT_SOFT, borderRadius: 24,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, margin: "0 auto 16px", border: `1px solid ${BORDER}`, boxShadow: "var(--pelada-soft-shadow)",
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

  // ── Profile ──
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

          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 16, marginBottom: 20 }}>
            <p style={sectionTitle}>Resumo</p>
            <div style={{ display: "flex", gap: 24 }}>
              <div>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: ACCENT_DARK }}>{history.length}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED2 }}>evento{history.length !== 1 ? "s" : ""} participado{history.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>

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
                    <span style={{ background: ACCENT_SOFT, color: ACCENT_DARK, borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>
                      Confirmado
                    </span>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: MUTED2 }}>Owner: {ev.owner_name}</p>
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

  // ── Create ──
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
              <p style={{ margin: "15px 0 20px", color: MUTED2, fontSize: 14, lineHeight: 1.5 }}>Dá um nome ao evento.</p>
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

  // ── Created ──
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

  // ── Event Landing ──
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
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: ACCENT_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📅</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: 15, color: TEXT }}>Confirmar Horário</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: MUTED2 }}>Escolhe o horário final e tranca o evento</p>
                </div>
              </div>

              {bestOptions.slice(0, 2).length > 0 && (() => {
                const selectedKey = confirmDate && confirmStart ? `${confirmDate}|${parseTime(confirmStart)}` : null;
                return (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ ...sectionTitle, marginBottom: 8 }}>💡 Sugestões com mais disponibilidade</p>
                    <div style={{ display: "grid", gap: 6 }}>
                      {bestOptions.slice(0, 2).map((o) => {
                        const interval = formatSlotInterval(o.dateKey, o.slotId, o.durationSlots * 30);
                        const isSelected = selectedKey === `${o.dateKey}|${o.slotId}`;
                        return (
                          <button
                            key={`${o.dateKey}-${o.slotId}`}
                            type="button"
                            onClick={() => {
                              setConfirmDate(o.dateKey);
                              setConfirmStart(timeLabel(Number(o.slotId)));
                              const endMin = Number(o.slotId) + o.durationSlots * 30;
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

              <div style={{ height: 1, background: BORDER, margin: "14px 0" }} />

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

  // ── Fill ──
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

  // ── Results ──
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

  // ── Playtomic ──
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
                  href={getPlaytomicBookingUrl(club, playtomicResults.date)}
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
