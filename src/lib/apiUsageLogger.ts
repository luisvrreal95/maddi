import { supabase } from "@/integrations/supabase/client";

/**
 * Log API usage for analytics tracking.
 * Fire-and-forget — never blocks the UI.
 */
export function logAPIUsage(params: {
  api_name: string;          // tomtom | mapbox | inegi
  endpoint_type: string;     // traffic_flow | category_search | poi_overview | search | geocode | tile | demographics
  billboard_id?: string;
  source_screen?: string;    // billboard_detail | search | owner_dashboard | admin
  response_status?: number;
  latency_ms?: number;
}) {
  supabase.from('api_usage_logs').insert({
    api_name: params.api_name,
    endpoint_type: params.endpoint_type,
    billboard_id: params.billboard_id || null,
    source_screen: params.source_screen || null,
    response_status: params.response_status || 200,
    latency_ms: params.latency_ms || null,
  }).then(() => {});
}
