exports.handler = async (e) => {
  try {
    const q = String(JSON.parse(e.body || "{}").q || "").slice(0, 300).trim();
    if (!q) return { statusCode: 400, body: JSON.stringify({ error: "Empty query" }) };
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Estimate calories for: "${q}". If no quantity is given, assume one typical serving. Reply JSON only: {"name":string,"serving":string,"kcal":number}` }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2000, temperature: 0.2 }
      })
    });
    const d = await r.json();
    const t = d?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!t) return { statusCode: 502, body: JSON.stringify({ error: d?.error?.message || "No response" }) };
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: t };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
