export default async function handler(req, res) {
  const tenantId = req.query?.tenant_id || req.query?.tenantId;
  const date = req.query?.date;
  const sportId = req.query?.sport_id || req.query?.sportId;

  if (!tenantId || !date || !sportId) {
    return res.status(400).json({ error: "Missing tenant_id, date or sport_id" });
  }

  const targetUrl = `https://playtomic.com/api/clubs/availability?tenant_id=${encodeURIComponent(
    tenantId
  )}&date=${encodeURIComponent(date)}&sport_id=${encodeURIComponent(sportId)}`;

  try {
    const response = await fetch(targetUrl);
    const body = await response.text();
    const contentType = response.headers.get("content-type") || "application/json";

    res.status(response.status).setHeader("content-type", contentType);
    return res.send(body);
  } catch (error) {
    return res.status(502).json({ error: "Playtomic proxy failed", details: error.message });
  }
}
