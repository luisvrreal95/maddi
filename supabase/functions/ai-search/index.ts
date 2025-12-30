import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, billboards } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Eres un asistente experto que ayuda a encontrar espectaculares (billboards) publicitarios basándose en las preferencias del usuario.

Dada una lista de espectaculares disponibles con sus características y una consulta del usuario en lenguaje natural, debes:
1. Analizar qué busca el usuario (ubicación, cercanía a puntos de interés, tráfico, precio, tamaño, iluminación, etc.)
2. Devolver SOLO los IDs de los espectaculares que mejor coincidan con la búsqueda, ordenados por relevancia

CRITERIOS DE BÚSQUEDA:
- UBICACIÓN: Si menciona una ciudad (Cancún, Mexicali, etc.), filtra estrictamente por esa ciudad. "Cancunsito" o variantes deben coincidir con "Cancún".
- TRÁFICO: Si pide "alto tráfico", prioriza los que tengan daily_impressions alto (>50,000 es alto, >100,000 muy alto).
- ZONA/POI: Si menciona "zona de restaurantes", "cerca de hoteles", "zona comercial", etc., analiza la dirección y los puntos_de_interes para inferir el tipo de zona.
- PRECIO: "económico" = <20,000 MXN, "medio" = 20,000-50,000 MXN, "premium" = >50,000 MXN
- ILUMINACIÓN: Si pide "visible de noche" o "iluminado", filtra por illumination = "led" o "iluminado"
- TAMAÑO: "grande" = área >40m², "mediano" = 20-40m², "pequeño" = <20m²

IMPORTANTE:
- Siempre filtra primero por ciudad si se menciona
- Considera los puntos_de_interes para determinar el tipo de zona
- Si no hay coincidencias perfectas, devuelve los más cercanos/similares
- Máximo 10 resultados

Responde SOLO con un JSON con la siguiente estructura:
{
  "matchingIds": ["id1", "id2", ...],
  "explanation": "Breve explicación de por qué estos resultados coinciden"
}`;

    const billboardSummary = billboards.map((b: any) => ({
      id: b.id,
      title: b.title,
      city: b.city,
      state: b.state,
      address: b.address,
      price: b.price_per_month,
      size: `${b.width_m}x${b.height_m}m`,
      area_m2: (b.width_m || 0) * (b.height_m || 0),
      illumination: b.illumination,
      billboard_type: b.billboard_type,
      daily_impressions: b.daily_impressions,
      puntos_de_interes: b.points_of_interest,
      available: b.is_available,
    }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Consulta del usuario: "${query}"\n\nEspectaculares disponibles:\n${JSON.stringify(billboardSummary, null, 2)}` 
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON response from AI
    let result;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { matchingIds: [], explanation: "No se encontraron coincidencias" };
      }
    } catch {
      console.error("Failed to parse AI response:", content);
      result = { matchingIds: [], explanation: "Error al procesar la respuesta" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
