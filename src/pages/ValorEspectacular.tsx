import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calculator, CheckCircle2, Loader2, Info, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Footer from '@/components/Footer';
import MobileNavBar from '@/components/navigation/MobileNavBar';
import {
  estimateSpectacularValue,
  classifyZone,
  estimateTrafficByCity,
  STRUCTURE_OPTIONS,
  type StructureType,
  type ZoneCategory,
  type ValuationResult,
} from '@/lib/valuationEngine';

const CITIES = ['Mexicali', 'Tijuana', 'Otra'];
const RENTED_OPTIONS = ['Sí', 'No', 'A veces'];
const TOTAL_STEPS = 5;

const ZONE_LABELS: Record<ZoneCategory, string> = {
  premium: 'Premium',
  comercial_fuerte: 'Comercial fuerte',
  comercial: 'Comercial',
  media: 'Media',
  periferica: 'Periférica',
};

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors ml-1.5 align-middle">
        <Info className="w-3.5 h-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-[220px] text-xs leading-relaxed" side="top">
      {text}
    </TooltipContent>
  </Tooltip>
);

const FactorCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-secondary/50 rounded-xl px-4 py-3 text-left">
    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);

const ValorEspectacular: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [saving, setSaving] = useState(false);

  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const [structureType, setStructureType] = useState<StructureType | ''>('');
  const [rented, setRented] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [result, setResult] = useState<ValuationResult | null>(null);
  const [detectedZone, setDetectedZone] = useState<ZoneCategory | null>(null);

  const resetWizard = () => {
    setStarted(true);
    setStep(1);
    setShowResult(false);
    setResult(null);
    setDetectedZone(null);
    setCity('');
    setZone('');
    setStructureType('');
    setRented('');
    setName('');
    setEmail('');
    setPhone('');
  };

  const canAdvance = () => {
    switch (step) {
      case 1: return !!city;
      case 2: return zone.length >= 3;
      case 3: return !!structureType;
      case 4: return !!rented;
      case 5: return name.trim().length > 0 && email.includes('@');
      default: return false;
    }
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
      return;
    }

    setSaving(true);
    try {
      let trafficDaily = estimateTrafficByCity(city);
      try {
        const cityCoords: Record<string, [number, number]> = {
          Mexicali: [32.6245, -115.4523],
          Tijuana: [32.5149, -117.0382],
        };
        const coords = cityCoords[city];
        if (coords) {
          const { data } = await supabase.functions.invoke('get-traffic-estimate', {
            body: { latitude: coords[0], longitude: coords[1], city },
          });
          if (data?.traffic_daily) trafficDaily = data.traffic_daily;
        }
      } catch {
        // Use fallback — already set
      }

      const zoneCategory = classifyZone(zone, city, trafficDaily);
      setDetectedZone(zoneCategory);

      const valuation = estimateSpectacularValue({
        trafficDaily,
        structureType: structureType as StructureType,
        zoneCategory,
        rentedStatus: rented,
      });
      setResult(valuation);

      const structureLabel = STRUCTURE_OPTIONS.find(s => s.value === structureType)?.label || structureType;

      await supabase.from('spectacular_valuation_leads').insert({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        city,
        location_coordinates: { zone },
        structure_type: structureType,
        size: structureLabel,
        is_currently_rented: rented,
        estimated_value_min: valuation.valueLow,
        estimated_value_max: valuation.valueHigh,
        zone_category: zoneCategory,
        traffic_daily: valuation.trafficDaily,
        impressions_monthly: valuation.impressionsMonthly,
        cpm_base: valuation.cpmBase,
        visibility_score: valuation.visibilityScore,
        format_multiplier: valuation.formatMultiplier,
        zone_multiplier: valuation.zoneMultiplier,
        estimated_value: valuation.estimatedValue,
      } as any);

      console.log('[chatbot_event] calculator_completed');

      supabase.functions.invoke('send-notification-email', {
        body: {
          email: email.trim(),
          type: 'valuation_result',
          recipientName: name.trim(),
          data: {
            valueMin: valuation.valueLow.toLocaleString(),
            valueMax: valuation.valueHigh.toLocaleString(),
            city,
            zone,
            structureType: structureLabel,
            size: structureLabel,
          },
        },
      }).catch(err => console.error('Error sending valuation email:', err));

      supabase.functions.invoke('send-notification-email', {
        body: {
          email: 'luis@maddi.com.mx',
          type: 'valuation_admin_notification',
          recipientName: 'Luis',
          data: {
            contactName: name.trim(),
            contactEmail: email.trim(),
            contactPhone: phone.trim() || '',
            city,
            zone,
            structureType: structureLabel,
            size: structureLabel,
            valueMin: valuation.valueLow.toLocaleString(),
            valueMax: valuation.valueHigh.toLocaleString(),
            isRented: rented,
          },
        },
      }).catch(err => console.error('Error sending admin notification:', err));
    } catch (err) {
      console.error('Error saving lead:', err);
    }
    setSaving(false);
    setShowResult(true);
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const ChoiceButton: React.FC<{ selected: boolean; onClick: () => void; children: React.ReactNode }> = ({ selected, onClick, children }) => (
    <button
      onClick={onClick}
      className={`w-full text-left px-5 py-3.5 rounded-xl text-sm font-medium transition-all border ${
        selected
          ? 'bg-primary/10 border-primary text-foreground ring-2 ring-primary/30'
          : 'bg-card border-border text-foreground hover:bg-secondary'
      }`}
    >
      {children}
    </button>
  );

  // ── Landing ───────────────────────────────────────────────
  if (!started) {
    return (
      <main className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-lg w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Calculator className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              ¿Cuánto podría valer tu espectacular?
            </h1>
            <p className="text-muted-foreground text-lg">
              Calcula el valor estimado de renta de tu espectacular usando datos de tráfico y ubicación.
            </p>
            <Button
              size="lg"
              className="rounded-full px-10 text-base"
              onClick={() => { setStarted(true); console.log('[chatbot_event] calculator_started'); }}
            >
              Calcular valor
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
        <Footer />
        <MobileNavBar />
      </main>
    );
  }

  // ── Result ────────────────────────────────────────────────
  if (showResult && result) {
    const structureLabel = STRUCTURE_OPTIONS.find(s => s.value === structureType)?.label ?? structureType;
    const zoneLabelDisplay = detectedZone ? ZONE_LABELS[detectedZone] : 'No disponible';

    return (
      <TooltipProvider>
        <main className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="max-w-lg w-full space-y-5 animate-in fade-in-0 duration-300">

              {/* Header */}
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Valor estimado de renta
                </h2>
                <p className="text-muted-foreground text-sm">
                  Ubicaciones similares en {city} podrían rentarse entre:
                </p>
              </div>

              {/* Price range */}
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <p className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
                  ${result.valueLow.toLocaleString('es-MX')} — ${result.valueHigh.toLocaleString('es-MX')}
                </p>
                <p className="text-muted-foreground text-sm mt-2">MXN / mes</p>
              </div>

              {/* Why this value */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <p className="text-sm font-semibold text-foreground">¿Por qué este valor?</p>
                <div className="grid grid-cols-3 gap-2">
                  <FactorCard label="Zona" value={zoneLabelDisplay} />
                  <FactorCard label="Tipo" value={structureLabel} />
                  <FactorCard label="Historial" value={rented === 'Sí' ? 'Rentado' : rented === 'A veces' ? 'A veces' : 'Sin rentar'} />
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground text-center px-2 leading-relaxed">
                Estimación basada en datos del mercado local. El valor real puede variar ±25%
                según condiciones específicas de la ubicación.
              </p>

              {/* CTAs */}
              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full rounded-xl text-base"
                  onClick={() => {
                    console.log('[chatbot_event] calculator_conversion_clicked');
                    navigate(user ? '/owner' : '/auth?role=owner');
                  }}
                >
                  Publicar mi espectacular gratis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full rounded-xl"
                  onClick={resetWizard}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Calcular otro espectacular
                </Button>
              </div>

              <button
                onClick={() => navigate('/')}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                ← Volver al inicio
              </button>
            </div>
          </div>
          <Footer />
          <MobileNavBar />
        </main>
      </TooltipProvider>
    );
  }

  // ── Form steps ────────────────────────────────────────────
  return (
    <TooltipProvider>
      <main className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-lg w-full space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Paso {step} de {TOTAL_STEPS}</span>
                <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
              </div>
              <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
            </div>

            {/* Step card — key triggers fade-in on each step change */}
            <div
              key={step}
              className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-5 min-h-[280px] animate-in fade-in-0 duration-300"
            >
              {step === 1 && (
                <>
                  <h2 className="text-lg font-bold text-foreground">¿En qué ciudad está tu espectacular?</h2>
                  <div className="flex flex-col gap-2">
                    {CITIES.map(c => (
                      <ChoiceButton key={c} selected={city === c} onClick={() => setCity(c)}>{c}</ChoiceButton>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="text-lg font-bold text-foreground">¿En qué avenida o zona se encuentra?</h2>
                  <Input
                    placeholder="Ej: Blvd. López Mateos, Zona Río..."
                    value={zone}
                    onChange={e => setZone(e.target.value)}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">Escribe la avenida o zona principal donde se ubica tu espectacular.</p>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="text-lg font-bold text-foreground">
                    ¿Qué tipo de espectacular tienes?
                    <InfoTooltip text="El tipo de estructura determina su tamaño e iluminación, ambos factores que afectan el valor de renta." />
                  </h2>
                  <div className="flex flex-col gap-2">
                    {STRUCTURE_OPTIONS.map(s => (
                      <ChoiceButton key={s.value} selected={structureType === s.value} onClick={() => setStructureType(s.value)}>
                        {s.label}
                      </ChoiceButton>
                    ))}
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <h2 className="text-lg font-bold text-foreground">
                    ¿Tu espectacular está actualmente rentado?
                    <InfoTooltip text="Un espectacular con historial de arrendamiento tiene mayor valor de mercado." />
                  </h2>
                  <div className="flex flex-col gap-2">
                    {RENTED_OPTIONS.map(r => (
                      <ChoiceButton key={r} selected={rented === r} onClick={() => setRented(r)}>{r}</ChoiceButton>
                    ))}
                  </div>
                </>
              )}

              {step === 5 && (
                <>
                  <h2 className="text-lg font-bold text-foreground">Casi listo — ¿a dónde enviamos tu estimación?</h2>
                  <div className="space-y-3">
                    <Input placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
                    <Input placeholder="tu@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl" />
                    <Input placeholder="Teléfono (opcional)" value={phone} onChange={e => setPhone(e.target.value)} className="rounded-xl" />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} disabled={step === 1} className="rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Atrás
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canAdvance() || saving}
                className="flex-1 rounded-xl"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Calculando...
                  </>
                ) : step === TOTAL_STEPS ? 'Ver mi estimación' : 'Siguiente'}
                {!saving && <ArrowRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
        <MobileNavBar />
      </main>
    </TooltipProvider>
  );
};

export default ValorEspectacular;
