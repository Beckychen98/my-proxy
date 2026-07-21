// api/chat.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { return res.status(200).end(); }
  if (req.method !== "POST")   { return res.status(405).json({ error: "Method not allowed" }); }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const {
      prompt = "",
      system = "",
      history = [],
      model = "gpt-4o-mini",
      temperature = 1,
      max_tokens = 1000
    } = body;

    const messages = [];
    if (system) messages.push({ role: "system", content: String(system) });
    if (Array.isArray(history)) {
      history.forEach(m => {
        if (m && m.role && m.content) messages.push({ role: m.role, content: String(m.content) });
      });
    }
    const last = messages[messages.length - 1];
    if (prompt && (!last || last.content !== prompt)) {
      messages.push({ role: "user", content: String(prompt) });
    }

    const oaResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: Number.isFinite(+temperature) ? +temperature : 1,
        max_tokens: Number.isFinite(+max_tokens) ? +max_tokens : 1000
      })
    });

    const data = await oaResp.json();

    if (!oaResp.ok) {
      console.error("OpenAI error:", data);
      return res.status(oaResp.status).json({ text: "", error: (data.error && data.error.message) || "OpenAI error" });
    }

    const text = (data.choices && data.choices[0] && data.choices[0].message &&
                  data.choices[0].message.content) ? data.choices[0].message.content : "";
    return res.status(200).json({ text });

  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ text: "", error: String(err) });
  }
}
