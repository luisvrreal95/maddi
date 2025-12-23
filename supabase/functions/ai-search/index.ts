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

    const systemPrompt = `Eres un asistente que ayuda a encontrar espectaculares (billboards) publicitarios basándose en las preferencias del usuario.

Dada una lista de espectaculares disponibles y una consulta del usuario en lenguaje natural, debes:
1. Analizar qué busca el usuario (ubicación, cercanía a puntos de interés, precio, tamaño, etc.)
2. Devolver SOLO los IDs de los espectaculares que mejor coincidan con la búsqueda, ordenados por relevancia

IMPORTANTE: 
- Si el usuario menciona "gasolineras", "escuelas", "plazas", etc., busca en las direcciones y ciudades
- Si menciona una ciudad o estado específico, filtra por esa ubicación
- Si menciona precio, considera el rango de precios
- Si no hay coincidencias exactas, devuelve los más cercanos/similares

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
