export default async function handler(req, res) {
  const { tenant_id, date, sport_id } = req.query;

  if (!tenant_id || !date || !sport_id) {
    return res.status(400).json({ error: "Parâmetros em falta." });
  }

  try {
    const response = await fetch(
      `https://playtomic.com/api/clubs/availability?tenant_id=${tenant_id}&date=${date}&sport_id=${sport_id}`
    );
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao consultar a Playtomic." });
  }
}