import { getStore } from "@netlify/blobs";

export default async (req) => {
  const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
  try {
    const { code, data } = await req.json();
    if (typeof code !== "string" || code.length < 6) return j({ error: "Sync code must be 6+ characters" }, 400);
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
    const key = [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
    const store = getStore("calorie");
    if (data) {
      if (JSON.stringify(data).length > 2_000_000) return j({ error: "Too large" }, 413);
      await store.setJSON(key, data);
      return j({ ok: true });
    }
    return j({ data: await store.get(key, { type: "json" }) });
  } catch (e) {
    return j({ error: e.message }, 500);
  }
};
