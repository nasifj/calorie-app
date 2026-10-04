const MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite"];

exports.handler = async (e) => {
  try {
    const q = String(JSON.parse(e.body || "{}").q || "").slice(0, 300).trim();
    if (!q) return { statusCode: 400, body: JSON.stringify({ error: "Empty query" }) };
    const prompt = `Estimate calories for: "${q}". If no quantity is given, assume one typical serving. Reply JSON only: {"name":string,"serving":string,"kcal":number}`;
    const ok = (t) => ({ statusCode: 200, headers: { "Content-Type": "application/json" }, body: t });
    let lastErr = "No response";

    // 1) Gemini models, in order
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2000, temperature: 0.2 }
    });
    for (const m of MODELS) {
      for (let i = 0; i < 2; i++) {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
          body
        });
        const d = await r.json();
        const t = d?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (t) return ok(t);
        lastErr = d?.error?.message || lastErr;
        if (d?.error?.code !== 503) break;
        await new Promise(s => setTimeout(s, 1500));
      }
    }

    // 2) Groq backup (only if key is set)
    if (process.env.GROQ_API_KEY) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 200
        })
      });
      const d = await r.json();
      const t = d?.choices?.[0]?.message?.content;
      if (t) return ok(t);
      lastErr = "Gemini & Groq failed: " + (d?.error?.message || lastErr);
    }
    return { statusCode: 502, body: JSON.stringify({ error: lastErr }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
