import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Billboard } from '@/hooks/useBillboards';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, MapPin, Calendar as CalendarIcon, X, Loader2, Plus, Eye, Clock, CheckCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Progress } from '@/components/ui/progress';

interface LocationSuggestion {
  id: string;
  place_name: string;
  text: string;
  place_type: string[];
  center: [number, number];
}

const POI_CATEGORY_MAP: Record<string, string[]> = {
  'Plaza comerciales': ['Centros comerciales', 'Tiendas departamentales', 'Tiendas'],
  'Escuelas': ['Escuelas', 'Universidades'],
  'Restaurantes': ['Restaurantes', 'Cafés y bares', 'Supermercados'],
  'Gasolineras': ['Gasolineras', 'Lavado de autos', 'Talleres'],
  'Oficinas': ['Bancos', 'Gobierno', 'Correos'],
  'Áreas verdes': ['Parques', 'Centros deportivos', 'Gimnasios'],
};

const POINTS_OF_INTEREST = Object.keys(POI_CATEGORY_MAP);

const STEPS = [
  { id: 1, title: 'Información básica', description: 'Nombre y precio' },
  { id: 2, title: 'Ubicación', description: 'Dirección exacta' },
  { id: 3, title: 'Fotos', description: 'Imágenes del espectacular' },
  { id: 4, title: 'Características', description: 'Tipo, tamaño y más' },
  { id: 5, title: 'Condiciones', description: 'Requisitos de reserva' },
];

const AddProperty: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  
  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  
  // Step 1 form data
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  
  // Step 2 form data
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number>(32.6245);
  const [longitude, setLongitude] = useState<number>(-115.4523);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<LocationSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const addressInputRef = useRef<HTMLInputElement>(null);
  const isUserTypingRef = useRef(false);
  
  // Step 3 - Images
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionTokenRef = useRef<string>(crypto.randomUUID());

  // Step 4 form data
  const [pointsOfInterest, setPointsOfInterest] = useState<string[]>([]);
  const [customPOI, setCustomPOI] = useState('');
  const [detectedPOIs, setDetectedPOIs] = useState<string[]>([]);
  const [isLoadingPOIs, setIsLoadingPOIs] = useState(false);
  const [billboardType, setBillboardType] = useState('espectacular');
  const [isIlluminated, setIsIlluminated] = useState(true);
  const [height, setHeight] = useState('');
  const [width, setWidth] = useState('');
  
  // Step 5 form data
  const [availability, setAvailability] = useState<'immediate' | 'scheduled'>('immediate');
  const [availableFrom, setAvailableFrom] = useState<Date | undefined>(undefined);
  const [minCampaignDays, setMinCampaignDays] = useState('30');
  const [minAdvanceBookingDays, setMinAdvanceBookingDays] = useState('7');

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(userLoc);
          setLatitude(userLoc.lat);
          setLongitude(userLoc.lng);
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  }, []);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Error fetching mapbox token:', error);
      }
    };
    fetchToken();
  }, []);

  // Initialize map on step 2
  useEffect(() => {
    if (step !== 2 || !mapboxToken) return;
    
    const timer = setTimeout(() => {
      if (!mapContainer.current) return;
      
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      
      mapboxgl.accessToken = mapboxToken;
      
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [longitude, latitude],
          zoom: 14,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        marker.current = new mapboxgl.Marker({ 
          color: '#9BFF43',
          draggable: true 
        })
          .setLngLat([longitude, latitude])
          .addTo(map.current);

        marker.current.on('dragend', () => {
          const lngLat = marker.current?.getLngLat();
          if (lngLat) {
            setLongitude(lngLat.lng);
            setLatitude(lngLat.lat);
            reverseGeocode(lngLat.lng, lngLat.lat);
          }
        });

        map.current.on('click', (e) => {
          marker.current?.setLngLat(e.lngLat);
          setLongitude(e.lngLat.lng);
          setLatitude(e.lngLat.lat);
          reverseGeocode(e.lngLat.lng, e.lngLat.lat);
        });
        
        map.current.on('load', () => {
          map.current?.resize();
        });
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [step, mapboxToken]);

  // Update marker when coordinates change
  useEffect(() => {
    if (marker.current && map.current) {
      marker.current.setLngLat([longitude, latitude]);
      map.current.flyTo({ center: [longitude, latitude], zoom: 15 });
    }
  }, [longitude, latitude]);

  const reverseGeocode = async (lng: number, lat: number) => {
    if (!mapboxToken) return;
    
    isUserTypingRef.current = false;
    setShowAddressSuggestions(false);
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=es&types=address,poi,neighborhood`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        setAddress(feature.place_name);
        
        const context = feature.context || [];
        const cityCtx = context.find((c: any) => c.id.startsWith('place'));
        const stateCtx = context.find((c: any) => c.id.startsWith('region'));
        
        if (cityCtx) setCity(cityCtx.text);
        if (stateCtx) setState(stateCtx.short_code?.replace('MX-', '') || stateCtx.text);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  };

  // Address autocomplete - dual source: TomTom POI + Mapbox Search Box
  useEffect(() => {
    if (!address || address.length < 2 || !mapboxToken || !isUserTypingRef.current) {
      setAddressSuggestions([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const proximityLng = userLocation?.lng ?? -116.9661;
        const proximityLat = userLocation?.lat ?? 32.5149;

        // Parallel: TomTom search-poi (great for POIs/businesses) + Mapbox Search Box (great for addresses)
        const [tomtomRes, mapboxRes] = await Promise.all([
          supabase.functions.invoke('search-poi', {
            body: { query: address, lat: proximityLat, lon: proximityLng, limit: 5 }
          }).catch(() => ({ data: null, error: 'failed' })),
          fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(address)}&access_token=${mapboxToken}&session_token=${sessionTokenRef.current}&language=es&country=MX&types=poi,place,neighborhood,locality,address&limit=8&proximity=${proximityLng},${proximityLat}`)
            .then(r => r.json())
            .catch(() => ({ suggestions: [] }))
        ]);

        if (!isUserTypingRef.current) return;

        const merged: LocationSuggestion[] = [];
        const seenNames = new Set<string>();

        // Add TomTom POI results first (better for businesses/plazas)
        if (tomtomRes.data?.success && tomtomRes.data?.results) {
          for (const r of tomtomRes.data.results) {
            if (r.lat && r.lon && r.displayName) {
              const key = r.displayName.toLowerCase();
              if (!seenNames.has(key)) {
                seenNames.add(key);
                merged.push({
                  id: r.id || `tt-${merged.length}`,
                  place_name: [r.displayName, r.displayContext].filter(Boolean).join(', '),
                  text: r.displayName,
                  place_type: [r.type === 'POI' ? 'poi' : 'address'],
                  center: [r.lon, r.lat] as [number, number],
                });
              }
            }
          }
        }

        // Add Mapbox Search Box results (needs retrieve step for coords)
        if (mapboxRes.suggestions) {
          for (const s of mapboxRes.suggestions) {
            const key = s.name?.toLowerCase();
            if (key && !seenNames.has(key)) {
              seenNames.add(key);
              merged.push({
                id: s.mapbox_id,
                place_name: s.full_address || s.place_formatted || s.name,
                text: s.name,
                place_type: [s.feature_type || 'place'],
                center: [0, 0], // Will be resolved on select via retrieve API
                context: s.context ? [
                  s.context.place ? { id: 'place', text: s.context.place.name } : null,
                  s.context.region ? { id: 'region', text: s.context.region.name } : null,
                ].filter(Boolean) as any[] : undefined,
                _mapboxId: s.mapbox_id, // Store for retrieve
              } as any);
            }
          }
        }

        setAddressSuggestions(merged.slice(0, 8));
        setShowAddressSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [address, mapboxToken, userLocation]);

  const handleSelectAddress = async (suggestion: LocationSuggestion) => {
    isUserTypingRef.current = false;
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
    setAddress(suggestion.place_name);

    let coords = suggestion.center;

    // If coordinates are [0,0], this is a Mapbox Search Box result that needs retrieve
    if (coords[0] === 0 && coords[1] === 0 && (suggestion as any)._mapboxId && mapboxToken) {
      try {
        const res = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/retrieve/${(suggestion as any)._mapboxId}?access_token=${mapboxToken}&session_token=${sessionTokenRef.current}`
        );
        const data = await res.json();
        if (data.features?.[0]?.geometry?.coordinates) {
          coords = data.features[0].geometry.coordinates;
        }
        // Reset session token after retrieve
        sessionTokenRef.current = crypto.randomUUID();
      } catch (e) {
        console.error('Error retrieving coordinates:', e);
      }
    }

    if (coords[0] !== 0 || coords[1] !== 0) {
      setLongitude(coords[0]);
      setLatitude(coords[1]);
      
      if (marker.current && map.current) {
        marker.current.setLngLat(coords);
        map.current.flyTo({ center: coords, zoom: 16 });
      }
    }
    
    // Extract city/state from context or place_name
    const ctx = (suggestion as any).context;
    if (ctx) {
      const cityCtx = ctx.find((c: any) => c.id === 'place' || c.id?.startsWith('place'));
      const stateCtx = ctx.find((c: any) => c.id === 'region' || c.id?.startsWith('region'));
      if (cityCtx) setCity(cityCtx.text);
      if (stateCtx) setState(stateCtx.text);
    } else {
      const parts = suggestion.place_name.split(', ');
      if (parts.length >= 2) {
        setCity(parts[parts.length - 3] || parts[0]);
        setState(parts[parts.length - 2] || '');
      }
    }
  };

  const handleSingleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const remainingSlots = 6 - imageUrls.length;
    if (remainingSlots <= 0) {
      toast.error('Máximo 6 imágenes permitidas');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploadingImage(true);
    const newUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name}: Solo se permiten imágenes`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}: La imagen no debe superar 5MB`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('billboard-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Error uploading:', error);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('billboard-images')
          .getPublicUrl(data.path);

        newUrls.push(urlData.publicUrl);
      }

      if (newUrls.length > 0) {
        setImageUrls(prev => [...prev, ...newUrls]);
        toast.success(`${newUrls.length} imagen(es) subida(s)`);
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Error al subir imagen');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const fetchNearbyPOIs = async () => {
    if (!latitude || !longitude) return;
    
    setIsLoadingPOIs(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-nearby-poi', {
        body: { latitude, longitude, billboard_title: title, city }
      });
      
      if (error) throw error;
      
      if (data?.success && data?.categories) {
        const detected: string[] = [];
        
        for (const [poiCategory, tomtomCategories] of Object.entries(POI_CATEGORY_MAP)) {
          const hasCategory = data.categories.some((cat: any) => 
            (tomtomCategories as string[]).includes(cat.name) && cat.count > 0
          );
          if (hasCategory) {
            detected.push(poiCategory);
          }
        }
        
        setDetectedPOIs(detected);
        setPointsOfInterest(detected);
      }
    } catch (error) {
      console.error('Error fetching POIs:', error);
    } finally {
      setIsLoadingPOIs(false);
    }
  };

  const handlePointOfInterestChange = (point: string, checked: boolean) => {
    if (checked) {
      setPointsOfInterest(prev => [...prev, point]);
    } else {
      setPointsOfInterest(prev => prev.filter(p => p !== point));
    }
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 1:
        if (!title || !price) {
          toast.error('Por favor completa el nombre y precio');
          return false;
        }
        return true;
      case 2:
        if (!address) {
          toast.error('Por favor selecciona una ubicación');
          return false;
        }
        return true;
      case 3:
        return true; // Photos are optional
      case 4:
        if (!height || !width || !billboardType) {
          toast.error('Por favor completa tipo y tamaño');
          return false;
        }
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const goToNextStep = () => {
    if (!validateStep()) return;
    
    setDirection('next');
    
    // Fetch POIs when moving to step 4
    if (step === 3) {
      fetchNearbyPOIs();
    }
    
    setStep(prev => Math.min(prev + 1, 5));
  };

  const goToPrevStep = () => {
    setDirection('prev');
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsLoading(true);

    try {
      const billboardData = {
        title,
        price_per_month: parseFloat(price),
        city: city || 'Sin ciudad',
        state: state || 'Sin estado',
        address,
        height_m: parseFloat(height),
        width_m: parseFloat(width),
        is_available: availability === 'immediate',
        owner_id: user?.id,
        latitude,
        longitude,
        billboard_type: billboardType,
        illumination: isIlluminated ? 'iluminado' : 'no_iluminado',
        faces: 1,
        image_url: imageUrls[0] || null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        points_of_interest: pointsOfInterest,
        min_campaign_days: parseInt(minCampaignDays) || 30,
        min_advance_booking_days: parseInt(minAdvanceBookingDays) || 7,
      };

      const { data, error } = await supabase
        .from('billboards')
        .insert(billboardData)
        .select('id')
        .single();

      if (error) throw error;

      // Fetch traffic data
      if (data?.id && latitude && longitude) {
        try {
          await supabase.functions.invoke('get-traffic-data', {
            body: {
              billboard_id: data.id,
              latitude,
              longitude,
              force_refresh: true
            }
          });
        } catch (trafficErr) {
          console.error('Error calling traffic function:', trafficErr);
        }
      }

      toast.success('¡Espectacular publicado exitosamente!');
      navigate('/owner?tab=propiedades');
    } catch (error: any) {
      console.error('Error saving billboard:', error);
      toast.error(error.message || 'Error al guardar');
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceTypeLabel = (types: string[]) => {
    const type = types[0];
    const labels: Record<string, string> = {
      country: 'País',
      region: 'Estado',
      place: 'Ciudad',
      district: 'Zona',
      locality: 'Localidad',
      neighborhood: 'Colonia',
      address: 'Dirección',
      poi: 'Punto de interés',
    };
    return labels[type] || 'Ubicación';
  };

  const progress = (step / 5) * 100;

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-white/10 px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate('/owner?tab=propiedades')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
          
          <div className="flex-1 mx-8">
            <Progress value={progress} className="h-1 bg-white/10" />
          </div>
          
          <span className="text-white/50 text-sm">{step}/5</span>
        </div>
      </header>

      {/* Step Content */}
      <div className="flex-1 overflow-hidden relative">
        {/* Step 1: Basic Info */}
        <div 
          className={`absolute inset-0 flex flex-col transition-all duration-500 ease-out ${
            step === 1 
              ? 'opacity-100 translate-x-0' 
              : step > 1 ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'
          }`}
          style={{ pointerEvents: step === 1 ? 'auto' : 'none' }}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-xl mx-auto px-6 py-12">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                  ¿Cómo se llama tu espectacular?
                </h1>
                <p className="text-white/60">
                  Un nombre claro ayuda a los anunciantes a encontrar tu espacio.
                </p>
              </div>
              
              <div className="space-y-6">
                <div>
                  <Label className="text-white/80 mb-2 block">Nombre del espectacular</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-14 text-lg bg-[#2A2A2A] border-white/20 text-white placeholder:text-white/40 focus:border-[#9BFF43]"
                    placeholder="Ej: Plaza Cataviña - Vista Principal"
                  />
                </div>
                
                <div>
                  <Label className="text-white/80 mb-2 block">Precio mensual (MXN)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-lg">$</span>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="h-14 text-lg pl-8 bg-[#2A2A2A] border-white/20 text-white placeholder:text-white/40 focus:border-[#9BFF43]"
                      placeholder="10,000"
                    />
                  </div>
                  <p className="text-white/40 text-sm mt-2">
                    Puedes ajustar precios por temporada después.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Location */}
        <div 
          className={`absolute inset-0 flex flex-col transition-all duration-500 ease-out ${
            step === 2 
              ? 'opacity-100 translate-x-0' 
              : step > 2 ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'
          }`}
          style={{ pointerEvents: step === 2 ? 'auto' : 'none' }}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-12">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                  ¿Dónde está ubicado?
                </h1>
                <p className="text-white/60">
                  Busca por nombre de plaza, negocio o dirección.
                </p>
              </div>
              
              <div className="space-y-6">
                {/* Address with autocomplete */}
                <div className="relative">
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9BFF43]" />
                    <Input
                      ref={addressInputRef}
                      value={address}
                      onChange={(e) => {
                        isUserTypingRef.current = true;
                        setAddress(e.target.value);
                      }}
                      onFocus={() => {
                        if (addressSuggestions.length > 0 && isUserTypingRef.current) {
                          setShowAddressSuggestions(true);
                        }
                      }}
                      className="h-14 text-lg pl-12 bg-[#2A2A2A] border-white/20 text-white placeholder:text-white/40 focus:border-[#9BFF43]"
                      placeholder="Busca una plaza, negocio o dirección..."
                    />
                    {isLoadingSuggestions && (
                      <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 animate-spin" />
                    )}
                  </div>
                  
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#2A2A2A] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                      {addressSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => handleSelectAddress(suggestion)}
                          className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-white/5 transition-colors"
                        >
                          <MapPin className="w-4 h-4 mt-0.5 text-[#9BFF43] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{suggestion.text}</p>
                            <p className="text-sm text-white/50 truncate">{suggestion.place_name}</p>
                          </div>
                          <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded-full flex-shrink-0">
                            {getPlaceTypeLabel(suggestion.place_type)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/60 mb-1 block">Ciudad</Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="bg-[#2A2A2A] border-white/20 text-white"
                      placeholder="Mexicali"
                    />
                  </div>
                  <div>
                    <Label className="text-white/60 mb-1 block">Estado</Label>
                    <Input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="bg-[#2A2A2A] border-white/20 text-white"
                      placeholder="B.C."
                    />
                  </div>
                </div>

                {/* Map */}
                <div className="rounded-xl overflow-hidden border border-white/20">
                  <div 
                    ref={mapContainer} 
                    className="w-full h-[300px]"
                  />
                </div>
                <p className="text-white/40 text-sm text-center">
                  📍 Arrastra el marcador para ajustar la ubicación exacta
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Photos */}
        <div 
          className={`absolute inset-0 flex flex-col transition-all duration-500 ease-out ${
            step === 3 
              ? 'opacity-100 translate-x-0' 
              : step > 3 ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'
          }`}
          style={{ pointerEvents: step === 3 ? 'auto' : 'none' }}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-12">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Agrega fotos de tu espectacular
                </h1>
                <p className="text-white/60">
                  Las fotos ayudan a los anunciantes a evaluar mejor tu espacio. Puedes agregar hasta 6 imágenes.
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {imageUrls.map((url, index) => (
                  <div key={url} className="relative aspect-video rounded-xl overflow-hidden border border-white/20 group">
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {index === 0 && (
                      <span className="absolute bottom-2 left-2 text-xs bg-[#9BFF43] text-[#121212] px-2 py-1 rounded font-medium">
                        Foto principal
                      </span>
                    )}
                  </div>
                ))}

                {imageUrls.length < 6 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-[#9BFF43]/50 hover:bg-[#9BFF43]/5 transition-all bg-[#2A2A2A]"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="h-8 w-8 text-[#9BFF43] animate-spin mb-2" />
                        <p className="text-white/60 text-sm">Subiendo...</p>
                      </>
                    ) : (
                      <>
                        <Plus className="h-8 w-8 text-white/40 mb-2" />
                        <p className="text-white/60 text-sm">Agregar foto</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <p className="text-white/40 text-sm mt-4 text-center">
                {imageUrls.length}/6 imágenes · La primera será la principal · JPG, PNG, WebP (máx 5MB)
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleSingleImageSelect}
                className="hidden"
                multiple
              />
            </div>
          </div>
        </div>

        {/* Step 4: Characteristics */}
        <div 
          className={`absolute inset-0 flex flex-col transition-all duration-500 ease-out ${
            step === 4 
              ? 'opacity-100 translate-x-0' 
              : step > 4 ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'
          }`}
          style={{ pointerEvents: step === 4 ? 'auto' : 'none' }}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-xl mx-auto px-6 py-12">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Características del espectacular
                </h1>
                <p className="text-white/60">
                  Detalles técnicos que ayudarán a los anunciantes.
                </p>
              </div>
              
              <div className="space-y-6">
                {/* Type */}
                <div>
                  <Label className="text-white/80 mb-2 block">Tipo de espacio</Label>
                  <Select value={billboardType} onValueChange={setBillboardType}>
                    <SelectTrigger className="h-14 bg-[#2A2A2A] border-white/20 text-white">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2A2A2A] border-white/10">
                      <SelectItem value="espectacular">Espectacular</SelectItem>
                      <SelectItem value="pantalla_digital">Pantalla Digital</SelectItem>
                      <SelectItem value="mural">Mural</SelectItem>
                      <SelectItem value="mupi">Mupi</SelectItem>
                      <SelectItem value="valla">Valla</SelectItem>
                      <SelectItem value="puente_peatonal">Puente Peatonal</SelectItem>
                      <SelectItem value="parabus">Parabús</SelectItem>
                      <SelectItem value="totem">Totem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Size */}
                <div>
                  <Label className="text-white/80 mb-2 block">Tamaño (metros)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="Alto"
                        className="h-14 bg-[#2A2A2A] border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div>
                      <Input
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        placeholder="Ancho"
                        className="h-14 bg-[#2A2A2A] border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>
                </div>

                {/* Illumination */}
                <div>
                  <Label className="text-white/80 mb-2 block">Iluminación</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setIsIlluminated(true)}
                      className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                        isIlluminated
                          ? 'border-[#9BFF43] bg-[#9BFF43]/10 text-white'
                          : 'border-white/20 hover:border-white/30 text-white/70'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isIlluminated ? 'border-[#9BFF43]' : 'border-white/40'
                      }`}>
                        {isIlluminated && <div className="w-2.5 h-2.5 rounded-full bg-[#9BFF43]" />}
                      </div>
                      Iluminado
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsIlluminated(false)}
                      className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                        !isIlluminated
                          ? 'border-[#9BFF43] bg-[#9BFF43]/10 text-white'
                          : 'border-white/20 hover:border-white/30 text-white/70'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        !isIlluminated ? 'border-[#9BFF43]' : 'border-white/40'
                      }`}>
                        {!isIlluminated && <div className="w-2.5 h-2.5 rounded-full bg-[#9BFF43]" />}
                      </div>
                      No iluminado
                    </button>
                  </div>
                </div>

                {/* POIs */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-white/80">Puntos de Interés cercanos</Label>
                    {isLoadingPOIs && <Loader2 className="w-4 h-4 text-[#9BFF43] animate-spin" />}
                  </div>
                  
                  <div className="bg-[#9BFF43]/5 border border-[#9BFF43]/20 rounded-xl p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-[#9BFF43] mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-white/70">
                        Los puntos de interés se <span className="text-[#9BFF43] font-medium">detectan automáticamente</span> según la ubicación. 
                        Puedes agregar más o quitar los que no apliquen.
                      </p>
                    </div>
                  </div>
                  
                  {detectedPOIs.length > 0 && (
                    <p className="text-xs text-[#9BFF43] mb-2">
                      ✓ Se detectaron {detectedPOIs.length} tipos de lugares cercanos
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    {POINTS_OF_INTEREST.map((point) => {
                      const isDetected = detectedPOIs.includes(point);
                      return (
                        <div key={point} className={`flex items-center gap-2 p-2 rounded-lg ${isDetected ? 'bg-[#9BFF43]/10' : ''}`}>
                          <Checkbox
                            id={point}
                            checked={pointsOfInterest.includes(point)}
                            onCheckedChange={(checked) => 
                              handlePointOfInterestChange(point, checked as boolean)
                            }
                            className="border-white/30 data-[state=checked]:bg-[#9BFF43] data-[state=checked]:border-[#9BFF43]"
                          />
                          <label htmlFor={point} className="text-sm cursor-pointer text-white/80">
                            {point}
                            {isDetected && <span className="text-[#9BFF43] text-xs ml-1">(detectado)</span>}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Custom POI */}
                  <div className="flex gap-2 mt-3">
                    <Input
                      value={customPOI}
                      onChange={(e) => setCustomPOI(e.target.value)}
                      placeholder="Agregar otro..."
                      className="flex-1 bg-[#2A2A2A] border-white/20 text-white text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customPOI.trim()) {
                          e.preventDefault();
                          if (!pointsOfInterest.includes(customPOI.trim())) {
                            setPointsOfInterest(prev => [...prev, customPOI.trim()]);
                          }
                          setCustomPOI('');
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (customPOI.trim() && !pointsOfInterest.includes(customPOI.trim())) {
                          setPointsOfInterest(prev => [...prev, customPOI.trim()]);
                          setCustomPOI('');
                        }
                      }}
                      className="bg-transparent border-[#9BFF43]/50 text-[#9BFF43] hover:bg-[#9BFF43]/10"
                    >
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: Conditions */}
        <div 
          className={`absolute inset-0 flex flex-col transition-all duration-500 ease-out ${
            step === 5 
              ? 'opacity-100 translate-x-0' 
              : 'opacity-0 translate-x-full'
          }`}
          style={{ pointerEvents: step === 5 ? 'auto' : 'none' }}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-xl mx-auto px-6 py-12">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Condiciones de reserva
                </h1>
                <p className="text-white/60">
                  Define los requisitos mínimos para que un anunciante pueda reservar.
                </p>
              </div>
              
              <div className="space-y-8">
                {/* Availability */}
                <div>
                  <Label className="text-white/80 mb-3 block">Disponibilidad</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setAvailability('immediate')}
                      className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                        availability === 'immediate'
                          ? 'border-[#9BFF43] bg-[#9BFF43]/10 text-white'
                          : 'border-white/20 hover:border-white/30 text-white/70'
                      }`}
                    >
                      Disponible ahora
                    </button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setAvailability('scheduled')}
                          className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                            availability === 'scheduled'
                              ? 'border-[#9BFF43] bg-[#9BFF43]/10 text-white'
                              : 'border-white/20 hover:border-white/30 text-white/70'
                          }`}
                        >
                          {availableFrom 
                            ? format(availableFrom, 'd MMM yyyy', { locale: es })
                            : 'A partir de...'
                          }
                        </button>
                      </PopoverTrigger>
                      {availability === 'scheduled' && (
                        <PopoverContent className="w-auto p-0 bg-[#2A2A2A] border-white/10" align="center">
                          <Calendar
                            mode="single"
                            selected={availableFrom}
                            onSelect={setAvailableFrom}
                            locale={es}
                            initialFocus
                            className="bg-[#2A2A2A]"
                          />
                        </PopoverContent>
                      )}
                    </Popover>
                  </div>
                </div>

                {/* Min Campaign Days */}
                <div className="bg-[#1E1E1E] rounded-xl p-6 border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#9BFF43]/10 flex items-center justify-center flex-shrink-0">
                      <CalendarIcon className="w-6 h-6 text-[#9BFF43]" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-white font-medium mb-1 block">Duración mínima de campaña</Label>
                      <p className="text-white/50 text-sm mb-3">
                        ¿Cuál es el mínimo de días que quieres que dure cada campaña?
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={minCampaignDays}
                          onChange={(e) => setMinCampaignDays(e.target.value)}
                          className="w-24 h-12 text-center text-lg bg-[#2A2A2A] border-white/20 text-white"
                          min="1"
                        />
                        <span className="text-white/60">días</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Min Advance Booking Days */}
                <div className="bg-[#1E1E1E] rounded-xl p-6 border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-white font-medium mb-1 block">Tiempo de anticipación</Label>
                      <p className="text-white/50 text-sm mb-3">
                        ¿Con cuántos días de anticipación mínima deben reservar? Esto te da tiempo para aprobar, imprimir la lona y colgar el anuncio.
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={minAdvanceBookingDays}
                          onChange={(e) => setMinAdvanceBookingDays(e.target.value)}
                          className="w-24 h-12 text-center text-lg bg-[#2A2A2A] border-white/20 text-white"
                          min="1"
                        />
                        <span className="text-white/60">días antes</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <footer className="bg-[#1A1A1A] border-t border-white/10 px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={goToPrevStep}
            disabled={step === 1}
            className="text-white/70 hover:text-white disabled:opacity-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Atrás
          </Button>
          
          {step < 5 ? (
            <Button
              onClick={goToNextStep}
              className="bg-[#9BFF43] hover:bg-[#8AE63A] text-[#121212] font-medium px-8"
            >
              Siguiente
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-[#9BFF43] hover:bg-[#8AE63A] text-[#121212] font-medium px-8"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Publicar espectacular
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default AddProperty;
