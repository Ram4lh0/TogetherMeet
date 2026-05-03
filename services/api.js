export { supabase } from "../supabaseClient";

// ─── Supabase Auth ────────────────────────────────────────────────────────────

export async function signUp(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, created_at")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data;
}

export async function fetchUserHistory(userId) {
  const { data, error } = await supabase
    .from("user_event_history")
    .select("*")
    .eq("participant_id", userId)
    .order("confirmed_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Supabase Event helpers ───────────────────────────────────────────────────

export async function fetchEventById(id) {
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

export async function insertEvent(event, creatorId) {
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

export async function upsertResponse(eventId, userId, displayName, availability) {
  const { data: existing } = await supabase
    .from("responses")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  let responseId;

  if (existing) {
    responseId = existing.id;
    await supabase.from("availability_slots").delete().eq("response_id", responseId);
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

export async function confirmEvent(eventId, { date, start, end, durationMinutes }) {
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

// ─── Playtomic ────────────────────────────────────────────────────────────────

export const PLAYTOMIC_CLUBS = [
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

export async function fetchClubAvailability(club, date) {
  const res = await fetch(
    `/api/playtomic?tenant_id=${club.tenantId}&date=${date}&sport_id=${club.sportId}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function getPlaytomicBookingUrl(club, date) {
  const isAndroid =
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  const source = isAndroid ? "app_android" : "app_ios";

  const params = new URLSearchParams({
    utm_source: source,
    utm_campaign: "share",
  });

  if (date) params.set("date", date);

  return `https://playtomic.io/tenant/${club.tenantId}?${params.toString()}`;
}
