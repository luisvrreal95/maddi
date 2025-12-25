import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, layer, radius = 1000 } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TOMTOM_API_KEY = Deno.env.get('TOMTOM_API_KEY');
    
    if (!TOMTOM_API_KEY) {
      console.log('TomTom API key not configured, returning mock data');
      return new Response(
        JSON.stringify(getMockData(layer, latitude, longitude)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data;

    switch (layer) {
      case 'traffic':
        data = await getTrafficFlow(latitude, longitude, TOMTOM_API_KEY);
        break;
      case 'incidents':
        data = await getTrafficIncidents(latitude, longitude, radius, TOMTOM_API_KEY);
        break;
      case 'pois':
        const { categories } = await req.json().catch(() => ({ categories: ['restaurants', 'shopping', 'gasStations', 'entertainment'] }));
        data = await getPOIs(latitude, longitude, radius, categories, TOMTOM_API_KEY);
        break;
      case 'flow':
        data = await getFlowSegment(latitude, longitude, TOMTOM_API_KEY);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid layer type. Use: traffic, incidents, pois, or flow' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`Successfully fetched ${layer} data for ${latitude}, ${longitude}`);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-tomtom-layers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Get traffic flow data
async function getTrafficFlow(lat: number, lng: number, apiKey: string) {
  try {
    // Traffic flow tile URL for raster overlay
    const zoom = 12;
    const tileX = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    const tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    
    const tileUrl = `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/${zoom}/${tileX}/${tileY}.png?key=${apiKey}&tileSize=512`;
    
    // Get flow segment data for current location
    const flowUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(flowUrl);
    
    if (!response.ok) {
      console.log('Traffic flow API error:', response.status);
      return { tileUrl, flowData: null, source: 'partial' };
    }
    
    const flowData = await response.json();
    
    return {
      tileUrl,
      flowData: flowData.flowSegmentData,
      currentSpeed: flowData.flowSegmentData?.currentSpeed,
      freeFlowSpeed: flowData.flowSegmentData?.freeFlowSpeed,
      confidence: flowData.flowSegmentData?.confidence,
      source: 'tomtom'
    };
  } catch (error) {
    console.error('Error fetching traffic flow:', error);
    return { tileUrl: null, flowData: null, source: 'error' };
  }
}

// Get traffic incidents
async function getTrafficIncidents(lat: number, lng: number, radius: number, apiKey: string) {
  try {
    // Calculate bounding box from center point and radius
    const latDelta = radius / 111000; // Approximate degrees per meter
    const lngDelta = radius / (111000 * Math.cos(lat * Math.PI / 180));
    
    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;
    
    const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${apiKey}&bbox=${minLng},${minLat},${maxLng},${maxLat}&fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code},startTime,endTime}}}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log('Incidents API error:', response.status, '- Using fallback');
      // Return empty incidents with clear source indicator
      return { 
        incidents: [], 
        source: 'unavailable',
        message: 'Servicio de incidentes no disponible. Tu API key de TomTom puede no tener acceso a este endpoint.'
      };
    }
    
    const data = await response.json();
    
    const incidents = (data.incidents || []).map((incident: any) => ({
      type: incident.type,
      category: incident.properties?.iconCategory,
      delay: incident.properties?.magnitudeOfDelay,
      description: incident.properties?.events?.[0]?.description || 'Incidente de tráfico',
      coordinates: incident.geometry?.coordinates,
      startTime: incident.properties?.startTime,
      endTime: incident.properties?.endTime,
    }));
    
    return { incidents, source: 'tomtom' };
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return { incidents: [], source: 'error' };
  }
}

// Get POIs by category
async function getPOIs(lat: number, lng: number, radius: number, categories: string[], apiKey: string) {
  const categoryMap: Record<string, number> = {
    restaurants: 7315, // Restaurant
    shopping: 7373, // Shopping Center
    gasStations: 7311, // Petrol Station
    entertainment: 7318, // Cinema
  };
  
  const allPois: any[] = [];
  
  for (const category of categories) {
    const categoryId = categoryMap[category];
    if (!categoryId) continue;
    
    try {
      const url = `https://api.tomtom.com/search/2/categorySearch/${categoryId}.json?key=${apiKey}&lat=${lat}&lon=${lng}&radius=${radius}&limit=20`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const pois = (data.results || []).map((poi: any) => ({
          id: poi.id,
          name: poi.poi?.name || 'Sin nombre',
          category,
          categoryName: poi.poi?.categories?.[0] || category,
          address: poi.address?.freeformAddress || '',
          lat: poi.position?.lat,
          lng: poi.position?.lon,
          distance: poi.dist,
          phone: poi.poi?.phone,
        }));
        allPois.push(...pois);
      }
    } catch (error) {
      console.error(`Error fetching POIs for ${category}:`, error);
    }
  }
  
  return { pois: allPois, source: 'tomtom' };
}

// Get flow segment data
async function getFlowSegment(lat: number, lng: number, apiKey: string) {
  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${lat},${lng}&key=${apiKey}&unit=KMPH`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log('Flow segment API error:', response.status, '- Using estimated data');
      // Return estimated data based on typical urban traffic
      return {
        flowSegment: {
          currentSpeed: Math.floor(35 + Math.random() * 25), // 35-60 km/h typical urban
          freeFlowSpeed: Math.floor(50 + Math.random() * 20), // 50-70 km/h free flow
          confidence: 0.6,
          roadClosure: false,
        },
        source: 'estimated',
        message: 'Datos estimados. Tu API key de TomTom puede no tener acceso a este endpoint.'
      };
    }
    
    const data = await response.json();
    const segment = data.flowSegmentData;
    
    return {
      flowSegment: {
        currentSpeed: segment?.currentSpeed,
        freeFlowSpeed: segment?.freeFlowSpeed,
        currentTravelTime: segment?.currentTravelTime,
        freeFlowTravelTime: segment?.freeFlowTravelTime,
        confidence: segment?.confidence,
        roadClosure: segment?.roadClosure,
        coordinates: segment?.coordinates?.coordinate,
      },
      source: 'tomtom'
    };
  } catch (error) {
    console.error('Error fetching flow segment:', error);
    return { 
      flowSegment: {
        currentSpeed: 42,
        freeFlowSpeed: 55,
        confidence: 0.5,
        roadClosure: false,
      },
      source: 'estimated' 
    };
  }
}

// Mock data for when TomTom API is not available
function getMockData(layer: string, lat: number, lng: number) {
  switch (layer) {
    case 'traffic':
      return {
        tileUrl: null,
        flowData: {
          currentSpeed: 45,
          freeFlowSpeed: 60,
          confidence: 0.85,
        },
        currentSpeed: 45,
        freeFlowSpeed: 60,
        confidence: 0.85,
        source: 'estimated'
      };
    case 'incidents':
      return { incidents: [], source: 'estimated' };
    case 'pois':
      return {
        pois: [
          { id: '1', name: 'Plaza Comercial', category: 'shopping', lat: lat + 0.002, lng: lng + 0.001, distance: 150 },
          { id: '2', name: 'Restaurante Local', category: 'restaurants', lat: lat - 0.001, lng: lng + 0.002, distance: 200 },
          { id: '3', name: 'Gasolinera', category: 'gasStations', lat: lat + 0.001, lng: lng - 0.001, distance: 100 },
        ],
        source: 'estimated'
      };
    case 'flow':
      return {
        flowSegment: {
          currentSpeed: 42,
          freeFlowSpeed: 55,
          confidence: 0.7,
          roadClosure: false,
        },
        source: 'estimated'
      };
    default:
      return { error: 'Unknown layer', source: 'error' };
  }
}
