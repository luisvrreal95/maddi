import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Billboard } from '@/hooks/useBillboards';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Clock, MapPin, Calendar as CalendarIcon, X, Loader2, Plus, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billboard?: Billboard | null;
  onSave: () => void;
}

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

const AddPropertyDialog: React.FC<AddPropertyDialogProps> = ({
  open,
  onOpenChange,
  billboard,
  onSave,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  
  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  
  // Step 1 form data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  
  // City autocomplete
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number>(32.6245);
  const [longitude, setLongitude] = useState<number>(-115.4523);
  
  // User's current location for proximity bias
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Address autocomplete
  const [addressSuggestions, setAddressSuggestions] = useState<LocationSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const addressInputRef = useRef<HTMLInputElement>(null);
  const isUserTypingRef = useRef(false);

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
          // Set initial map position to user location if not editing
          if (!billboard) {
            setLatitude(userLoc.lat);
            setLongitude(userLoc.lng);
          }
        },
        (error) => {
          console.log('Location access denied, using default Mexico City:', error);
          // Default to Mexico City if location denied
          if (!billboard) {
            setLatitude(19.4326);
            setLongitude(-99.1332);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Geolocation not supported, default to Mexico City
      if (!billboard) {
        setLatitude(19.4326);
        setLongitude(-99.1332);
      }
    }
  }, [billboard]);
  
  // Multiple images upload
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 form data
  const [pointsOfInterest, setPointsOfInterest] = useState<string[]>([]);
  const [customPOI, setCustomPOI] = useState('');
  const [detectedPOIs, setDetectedPOIs] = useState<string[]>([]);
  const [isLoadingPOIs, setIsLoadingPOIs] = useState(false);
  const [billboardType, setBillboardType] = useState('espectacular');
  const [isIlluminated, setIsIlluminated] = useState(true);
  const [height, setHeight] = useState('');
  const [width, setWidth] = useState('');
  const [availability, setAvailability] = useState<'immediate' | 'scheduled'>('immediate');
  const [availableFrom, setAvailableFrom] = useState<Date | undefined>(undefined);
  
  // Booking constraints - completely optional, empty by default
  const [minCampaignDays, setMinCampaignDays] = useState('');
  const [minAdvanceBookingDays, setMinAdvanceBookingDays] = useState('');

  // Fetch Mapbox token and cities list
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
    const fetchCities = async () => {
      try {
        const { data } = await supabase.from('billboards').select('city');
        if (data) {
          const unique = [...new Set(data.map(b => b.city).filter(Boolean))].sort();
          setAllCities(unique);
        }
      } catch (e) { console.error(e); }
    };
    if (open) {
      fetchToken();
      fetchCities();
    }
  }, [open]);

  useEffect(() => {
    if (billboard) {
      setTitle(billboard.title);
      setDescription(billboard.description || '');
      setPrice(billboard.price_per_month.toString());
      setCity(billboard.city);
      setState(billboard.state);
      setAddress(billboard.address);
      setLatitude(billboard.latitude);
      setLongitude(billboard.longitude);
      setHeight(billboard.height_m.toString());
      setWidth(billboard.width_m.toString());
      setBillboardType(billboard.billboard_type || 'espectacular');
      setIsIlluminated(billboard.illumination === 'iluminado');
      // Load images - prioritize image_urls array, fallback to image_url
      const existingImages = (billboard as any).image_urls || [];
      if (existingImages.length > 0) {
        setImageUrls(existingImages);
      } else if (billboard.image_url) {
        setImageUrls([billboard.image_url]);
      } else {
        setImageUrls([]);
      }
      // Load existing POIs
      const existingPois = (billboard as any).points_of_interest || [];
      setPointsOfInterest(existingPois);
      // Load booking constraints - leave empty if not set (will use defaults on save)
      setMinCampaignDays((billboard as any).min_campaign_days ? ((billboard as any).min_campaign_days).toString() : '');
      setMinAdvanceBookingDays((billboard as any).min_advance_booking_days ? ((billboard as any).min_advance_booking_days).toString() : '');
    } else {
      resetForm();
    }
  }, [billboard, open]);

  // Initialize map on step 1
  useEffect(() => {
    if (!open || step !== 1 || !mapboxToken) return;
    
    // Larger delay to ensure dialog and container are fully mounted
    const timer = setTimeout(() => {
      if (!mapContainer.current) return;
      
      // Clean up existing map first
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

        // Add draggable marker
        marker.current = new mapboxgl.Marker({ 
          color: '#9BFF43',
          draggable: true 
        })
          .setLngLat([longitude, latitude])
          .addTo(map.current);

        // Update coordinates when marker is dragged
        marker.current.on('dragend', () => {
          const lngLat = marker.current?.getLngLat();
          if (lngLat) {
            setLongitude(lngLat.lng);
            setLatitude(lngLat.lat);
            // Reverse geocode to get address
            reverseGeocode(lngLat.lng, lngLat.lat);
          }
        });

        // Allow clicking on map to move marker
        map.current.on('click', (e) => {
          marker.current?.setLngLat(e.lngLat);
          setLongitude(e.lngLat.lng);
          setLatitude(e.lngLat.lat);
          reverseGeocode(e.lngLat.lng, e.lngLat.lat);
        });
        
        // Force resize after map loads
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
  }, [open, step, mapboxToken]);

  // Update marker when coordinates change externally
  useEffect(() => {
    if (marker.current && map.current) {
      marker.current.setLngLat([longitude, latitude]);
      map.current.flyTo({ center: [longitude, latitude], zoom: 15 });
    }
  }, [longitude, latitude]);

  const reverseGeocode = async (lng: number, lat: number) => {
    if (!mapboxToken) return;
    
    // Disable user typing flag to prevent dropdown from opening
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
        
        // Extract city and state from context
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

  // Address autocomplete - only when user is typing
  useEffect(() => {
    if (!address || address.length < 3 || !mapboxToken || !isUserTypingRef.current) {
      setAddressSuggestions([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        // Build URL with proximity bias if user location is available
        let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&country=mx&types=country,region,place,district,locality,neighborhood,address,poi&limit=6&language=es`;
        
        if (userLocation) {
          url += `&proximity=${userLocation.lng},${userLocation.lat}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.features && isUserTypingRef.current) {
          setAddressSuggestions(data.features);
          setShowAddressSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [address, mapboxToken, userLocation]);

  const handleSelectAddress = (suggestion: LocationSuggestion) => {
    // Disable typing flag to prevent dropdown from reopening
    isUserTypingRef.current = false;
    setAddress(suggestion.place_name);
    setLongitude(suggestion.center[0]);
    setLatitude(suggestion.center[1]);
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
    
    // Extract city and state
    const parts = suggestion.place_name.split(', ');
    if (parts.length >= 2) {
      setCity(parts[parts.length - 3] || parts[0]);
      setState(parts[parts.length - 2] || '');
    }
    
    // Update map
    if (marker.current && map.current) {
      marker.current.setLngLat(suggestion.center);
      map.current.flyTo({ center: suggestion.center, zoom: 16 });
    }
  };

  const resetForm = () => {
    setStep(1);
    setTitle('');
    setDescription('');
    setPrice('');
    setCity('');
    setState('');
    setAddress('');
    // Reset to user location or default Mexico City
    if (userLocation) {
      setLatitude(userLocation.lat);
      setLongitude(userLocation.lng);
    } else {
      setLatitude(19.4326);
      setLongitude(-99.1332);
    }
    setPointsOfInterest([]);
    setCustomPOI('');
    setBillboardType('espectacular');
    setIsIlluminated(true);
    setHeight('');
    setWidth('');
    setAvailability('immediate');
    setAvailableFrom(undefined);
    setImageUrls([]);
    setAddressSuggestions([]);
    setMinCampaignDays('');
    setMinAdvanceBookingDays('');
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
        // Map TomTom categories to our POI categories
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

  const handleContinue = async () => {
    if (!title || !price || !address) {
      toast.error('Por favor completa el nombre, precio y dirección');
      return;
    }
    
    // Fetch POIs automatically when moving to step 2
    fetchNearbyPOIs();
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handlePointOfInterestChange = (point: string, checked: boolean) => {
    if (checked) {
      setPointsOfInterest(prev => [...prev, point]);
    } else {
      setPointsOfInterest(prev => prev.filter(p => p !== point));
    }
  };

  // Multi-image upload handler
  const handleImagesChange = (urls: string[]) => {
    setImageUrls(urls);
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

  const handleSubmit = async () => {
    if (!height || !width || !billboardType) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setIsLoading(true);

    try {
      const billboardData = {
        title,
        description: description || null,
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
        min_campaign_days: minCampaignDays ? parseInt(minCampaignDays) : 0,
        min_advance_booking_days: minAdvanceBookingDays ? parseInt(minAdvanceBookingDays) : 7,
      };

      let savedBillboardId: string | null = null;

      if (billboard) {
        const { error } = await supabase
          .from('billboards')
          .update(billboardData)
          .eq('id', billboard.id);

        if (error) throw error;
        savedBillboardId = billboard.id;
        toast.success('Propiedad actualizada');
      } else {
        const { data, error } = await supabase
          .from('billboards')
          .insert(billboardData)
          .select('id')
          .single();

        if (error) throw error;
        savedBillboardId = data?.id || null;
        toast.success('Propiedad agregada');
      }

      // Automatically fetch traffic data from TomTom after saving
      if (savedBillboardId && latitude && longitude) {
        try {
          console.log('Fetching traffic data for new billboard...');
          const { data: trafficData, error: trafficError } = await supabase.functions.invoke('get-traffic-data', {
            body: {
              billboard_id: savedBillboardId,
              latitude,
              longitude,
              force_refresh: true
            }
          });
          
          if (trafficError) {
            console.error('Error fetching traffic data:', trafficError);
          } else {
            console.log('Traffic data fetched successfully:', trafficData);
            if (trafficData?.estimated_daily_traffic) {
              toast.success(`Datos de tráfico obtenidos: ~${(trafficData.estimated_daily_traffic / 1000).toFixed(0)}K impresiones/día`);
            }
          }
        } catch (trafficErr) {
          console.error('Error calling traffic function:', trafficErr);
        }
      }

      onSave();
      onOpenChange(false);
      resetForm();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A1A] border-white/10 text-white max-w-2xl p-0 gap-0 overflow-hidden h-[90vh] flex flex-col">
        {/* Header with Step Indicator */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button onClick={handleBack} className="text-white hover:text-[#9BFF43] transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold">{billboard ? 'Editar' : 'Agregar'} propiedad</h2>
              <p className="text-white/50 text-sm mt-0.5">Paso {step} de 2</p>
            </div>
          </div>
          <img src="/favicon.svg" alt="Maddi" className="w-8 h-8" />
        </div>

        {/* Animated Step Content Container */}
        <div className="flex-1 overflow-hidden relative">
          {/* Step 1: Basic Info + Map */}
          <div 
            className={`absolute inset-0 flex flex-col transition-all duration-300 ease-out ${
              step === 1 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 -translate-x-full pointer-events-none'
            }`}
          >
            {/* Contexto inicial solo para nuevas propiedades */}
            {!billboard && (
              <div className="px-6 pt-4 flex-shrink-0">
                <div className="bg-[#9BFF43]/10 border border-[#9BFF43]/20 rounded-xl p-4">
                  <p className="text-white/80 text-sm">
                    ✨ Completa estos pasos para publicar tu espectacular y comenzar a recibir contactos de anunciantes.
                  </p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 pb-4">
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-white/60">Nombre del espectacular</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 bg-[#2A2A2A] border-white/10 text-white placeholder:text-white/40"
                    placeholder="Plaza Cataviña"
                  />
                </div>
                <div>
                  <Label className="text-sm text-white/60">Precio por mes</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mt-1 bg-[#2A2A2A] border-white/10 text-white placeholder:text-white/40"
                    placeholder="10000"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-white/60">Descripción</Label>
                  <span className="text-xs text-white/30">{description.length}/800</span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => {
                    if (e.target.value.length <= 800) setDescription(e.target.value);
                  }}
                  rows={3}
                  className="mt-1 w-full rounded-md bg-[#2A2A2A] border border-white/10 text-white placeholder:text-white/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9BFF43]/30 resize-none"
                  placeholder="Describe tu espectacular: ubicación estratégica, visibilidad, tráfico..."
                />
              </div>

              {/* Address with autocomplete */}
              <div className="relative">
                <Label className="text-sm text-white/60">Dirección</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9BFF43]" />
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
                    className="pl-10 bg-[#2A2A2A] border-white/10 text-white placeholder:text-white/40"
                    placeholder="Escribe la dirección del espectacular..."
                  />
                  {isLoadingSuggestions && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />
                  )}
                </div>
                
                {/* Suggestions dropdown */}
                {showAddressSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#2A2A2A] border border-white/10 rounded-xl overflow-hidden shadow-xl">
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
                <div className="relative">
                  <Label className="text-sm text-white/60">Ciudad</Label>
                  <Input
                    value={city}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCity(val);
                      if (val.length > 0) {
                        const filtered = allCities.filter(c => c.toLowerCase().includes(val.toLowerCase()));
                        setCitySuggestions(filtered);
                        setShowCitySuggestions(filtered.length > 0);
                      } else {
                        setCitySuggestions(allCities);
                        setShowCitySuggestions(allCities.length > 0);
                      }
                    }}
                    onFocus={() => {
                      const filtered = city.length > 0
                        ? allCities.filter(c => c.toLowerCase().includes(city.toLowerCase()))
                        : allCities;
                      setCitySuggestions(filtered);
                      setShowCitySuggestions(filtered.length > 0);
                    }}
                    onBlur={() => setTimeout(() => setShowCitySuggestions(false), 150)}
                    className="mt-1 bg-[#2A2A2A] border-white/10 text-white placeholder:text-white/40"
                    placeholder="Mexicali"
                    autoComplete="off"
                  />
                  {showCitySuggestions && citySuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#2A2A2A] border border-white/10 rounded-xl overflow-hidden shadow-xl max-h-40 overflow-y-auto">
                      {citySuggestions.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setCity(c);
                            setShowCitySuggestions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm text-white/60">Estado</Label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="mt-1 bg-[#2A2A2A] border-white/10 text-white placeholder:text-white/40"
                    placeholder="B.C."
                  />
                </div>
              </div>

              {/* Map - Featured Section */}
              <div className="bg-[#2A2A2A] rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-[#9BFF43]" />
                  <Label className="text-base font-medium text-white">Selecciona la ubicación exacta</Label>
                </div>
                <p className="text-sm text-white/60 mb-3">
                  Arrastra el pin o toca en el mapa para seleccionar la ubicación de tu espectacular.
                </p>
                <div 
                  ref={mapContainer} 
                  className="w-full h-52 rounded-xl overflow-hidden border border-white/20"
                />
                <p className="text-xs text-white/40 mt-2 text-center">
                  📍 Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
                </p>
              </div>

              {/* Multi-Image Upload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm text-white/80">Fotos del espectacular (máx. 6)</Label>
                  <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">Opcional</span>
                </div>
                <p className="text-xs text-white/50 mb-2">
                  Las fotos ayudan a que los anunciantes evalúen mejor tu espacio y te contacten más rápido.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {imageUrls.map((url, index) => (
                    <div key={url} className="relative aspect-video rounded-lg overflow-hidden border border-white/10 group">
                      <img
                        src={url}
                        alt={`Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 text-xs bg-[#9BFF43] text-[#121212] px-1.5 py-0.5 rounded font-medium">
                          Principal
                        </span>
                      )}
                    </div>
                  ))}

                  {imageUrls.length < 6 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-[#9BFF43]/50 transition-colors bg-[#2A2A2A]"
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="h-6 w-6 text-[#9BFF43] animate-spin mb-1" />
                          <p className="text-white/60 text-xs">Subiendo...</p>
                        </>
                      ) : (
                        <>
                          <Plus className="h-6 w-6 text-white/40 mb-1" />
                          <p className="text-white/60 text-xs text-center px-2">Agregar foto</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-white/40 text-xs">
                    {imageUrls.length}/6 imágenes · JPG, PNG, WebP (máx 5MB c/u)
                  </p>
                  {imageUrls.length === 0 && (
                    <button
                      type="button"
                      onClick={handleContinue}
                      className="text-xs text-[#9BFF43] hover:text-[#8AE63A] transition-colors"
                    >
                      Omitir por ahora →
                    </button>
                  )}
                </div>
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

            {/* Fixed Footer Buttons - Step 1 */}
            <div className="flex gap-3 px-6 py-4 border-t border-white/10 bg-[#1A1A1A] flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleContinue}
                className="flex-1 bg-[#9BFF43] hover:bg-[#8AE63A] text-[#121212] font-medium"
              >
                Siguiente →
              </Button>
            </div>
          </div>

          {/* Step 2: Details */}
          <div 
            className={`absolute inset-0 flex flex-col transition-all duration-300 ease-out ${
              step === 2 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 translate-x-full pointer-events-none'
            }`}
          >
            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-4 py-4">
                {/* Property Preview Card */}
                <div className="bg-[#2A2A2A] rounded-xl p-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white">{title}</h3>
                    <p className="text-white/50 text-sm">
                      {address}
                    </p>
                  </div>
                  <div className="bg-[#9BFF43] text-[#121212] rounded-lg px-3 py-2 text-right">
                    <span className="font-bold">${parseInt(price || '0').toLocaleString()}</span>
                    <span className="text-sm opacity-70"> /mes</span>
                  </div>
                </div>

                {/* Puntos de Interés - Automated Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-[#9BFF43]" />
                    <Label className="text-sm font-medium text-white">Puntos de Interés</Label>
                  </div>
                  <div className="bg-[#2A2A2A] rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-[#9BFF43]/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-[#9BFF43]" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Cálculo automático</p>
                        <p className="text-white/60 text-sm">Los puntos de interés se calcularán automáticamente</p>
                      </div>
                    </div>
                    <p className="text-white/50 text-xs mt-3">
                      Cuando publiques tu espectacular, analizaremos la ubicación para detectar comercios, escuelas, restaurantes y otros lugares de interés cercanos.
                    </p>
                  </div>
                </div>

                {/* Tipo & Tamaño */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-[#9BFF43]" />
                      <Label className="text-sm font-medium text-white">Tipo de espacio</Label>
                    </div>
                    <Select value={billboardType} onValueChange={setBillboardType}>
                      <SelectTrigger className="bg-[#2A2A2A] border-white/10 text-white">
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
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-[#9BFF43]" />
                      <Label className="text-sm font-medium text-white">Tamaño (metros)</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="Alto"
                        className="bg-[#2A2A2A] border-white/10 text-white placeholder:text-white/40"
                      />
                      <Input
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        placeholder="Ancho"
                        className="bg-[#2A2A2A] border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>
                </div>

                {/* Iluminación */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-[#9BFF43]" />
                    <Label className="text-sm font-medium text-white">Iluminación</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsIlluminated(true)}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        isIlluminated
                          ? 'border-[#9BFF43] bg-[#9BFF43]/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isIlluminated ? 'border-[#9BFF43]' : 'border-white/40'
                      }`}>
                        {isIlluminated && <div className="w-2 h-2 rounded-full bg-[#9BFF43]" />}
                      </div>
                      <span className="text-sm text-white">Iluminado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsIlluminated(false)}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        !isIlluminated
                          ? 'border-[#9BFF43] bg-[#9BFF43]/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        !isIlluminated ? 'border-[#9BFF43]' : 'border-white/40'
                      }`}>
                        {!isIlluminated && <div className="w-2 h-2 rounded-full bg-[#9BFF43]" />}
                      </div>
                      <span className="text-sm text-white">No iluminado</span>
                    </button>
                  </div>
                </div>

                {/* Disponibilidad */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarIcon className="w-4 h-4 text-[#9BFF43]" />
                    <Label className="text-sm font-medium text-white">Disponibilidad</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAvailability('immediate')}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        availability === 'immediate'
                          ? 'border-[#9BFF43] bg-[#9BFF43]/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        availability === 'immediate' ? 'border-[#9BFF43]' : 'border-white/40'
                      }`}>
                        {availability === 'immediate' && (
                          <div className="w-2 h-2 rounded-full bg-[#9BFF43]" />
                        )}
                      </div>
                      <span className="text-sm text-white">Inmediata</span>
                    </button>

                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setAvailability('scheduled')}
                          className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                            availability === 'scheduled'
                              ? 'border-[#9BFF43] bg-[#9BFF43]/10'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            availability === 'scheduled' ? 'border-[#9BFF43]' : 'border-white/40'
                          }`}>
                            {availability === 'scheduled' && (
                              <div className="w-2 h-2 rounded-full bg-[#9BFF43]" />
                            )}
                          </div>
                          <span className="text-sm text-white">
                            {availableFrom 
                              ? `${format(availableFrom, 'd MMM yyyy', { locale: es })}`
                              : 'A partir de'
                            }
                          </span>
                        </button>
                      </PopoverTrigger>
                      {availability === 'scheduled' && (
                        <PopoverContent className="w-auto p-0 bg-[#2A2A2A] border-white/10" align="start">
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
                
                {/* Booking Constraints - Optional */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-[#9BFF43]" />
                    <Label className="text-sm font-medium text-white">Requisitos de reserva</Label>
                    <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">Opcional</span>
                  </div>
                  <p className="text-xs text-white/50 mb-3">
                    Puedes personalizar las condiciones de reserva o usar los valores predeterminados.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-white/60 mb-1 block">Duración mínima de campaña</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={minCampaignDays}
                          onChange={(e) => setMinCampaignDays(e.target.value)}
                          className="bg-[#2A2A2A] border-white/10 text-white"
                          placeholder="0"
                          min="0"
                        />
                        <span className="text-white/50 text-sm">días</span>
                      </div>
                      <p className="text-xs text-white/40 mt-1">Por defecto: sin mínimo (0 días)</p>
                    </div>
                    <div>
                      <Label className="text-xs text-white/60 mb-1 block">Tiempo de anticipación</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={minAdvanceBookingDays}
                          onChange={(e) => setMinAdvanceBookingDays(e.target.value)}
                          className="bg-[#2A2A2A] border-white/10 text-white"
                          placeholder="7"
                          min="0"
                        />
                        <span className="text-white/50 text-sm">días</span>
                      </div>
                      <p className="text-xs text-white/40 mt-1">Por defecto: 7 días de anticipación</p>
                    </div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-3">
                    <p className="text-xs text-blue-300">
                      💡 Puedes dejar estos campos vacíos para usar los valores predeterminados. Esto te da tiempo para revisar la solicitud, aprobarla y coordinar la instalación.
                    </p>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-[#2A2A2A] rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-4 text-white/60 text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span>Vistas por día</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Horas pico</span>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 uppercase tracking-wide">
                    Calculadas automáticamente con información en tiempo real
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex-1 bg-[#9BFF43] hover:bg-[#8AE63A] text-[#121212] font-medium"
                  >
                    {isLoading ? 'Guardando...' : 'Guardar Propiedad'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPropertyDialog;