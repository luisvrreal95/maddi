import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calculator, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

import Footer from '@/components/Footer';
import MobileNavBar from '@/components/navigation/MobileNavBar';

const CITIES = ['Mexicali', 'Tijuana', 'Otra'];
const STRUCTURES = [
  { value: 'unipolar', label: 'Espectacular unipolar', factor: 1.2 },
  { value: 'valla', label: 'Valla publicitaria', factor: 1.0 },
  { value: 'azotea', label: 'Azotea', factor: 1.1 },
  { value: 'digital', label: 'Pantalla digital', factor: 1.6 },
  { value: 'muro', label: 'Muro', factor: 0.8 },
];
const SIZES = [
  { value: '12x4', label: '12 × 4 m', factor: 1.0 },
  { value: '14x4', label: '14 × 4 m', factor: 1.2 },
  { value: '16x4', label: '16 × 4 m', factor: 1.4 },
  { value: 'otra', label: 'Otra medida', factor: 1.1 },
];
const RENTED_OPTIONS = ['Sí', 'No', 'A veces'];

const TOTAL_STEPS = 6; // 5 form steps + lead capture

function estimateValue(city: string, structureType: string, size: string) {
  // Base value by city traffic estimate
  const cityBase: Record<string, number> = {
    Mexicali: 14000,
    Tijuana: 18000,
    Otra: 12000,
  };
  const base = cityBase[city] || 12000;
  const structureFactor = STRUCTURES.find(s => s.value === structureType)?.factor || 1.0;
  const sizeFactor = SIZES.find(s => s.value === size)?.factor || 1.0;

  const mid = base * structureFactor * sizeFactor;
  const min = Math.round(mid * 0.75 / 1000) * 1000;
  const max = Math.round(mid * 1.35 / 1000) * 1000;
  return { min, max };
}

const ValorEspectacular: React.FC = () => {
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form data
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const [structureType, setStructureType] = useState('');
  const [size, setSize] = useState('');
  const [rented, setRented] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [result, setResult] = useState<{ min: number; max: number } | null>(null);

  const canAdvance = () => {
    switch (step) {
      case 1: return !!city;
      case 2: return zone.length >= 3;
      case 3: return !!structureType;
      case 4: return !!size;
      case 5: return !!rented;
      case 6: return name.trim().length > 0 && email.includes('@');
      default: return false;
    }
  };

  const handleNext = async () => {
    if (step < 6) {
      setStep(s => s + 1);
    } else {
      // Save lead and show result
      setSaving(true);
      const estimated = estimateValue(city, structureType, size);
      setResult(estimated);

      const structureLabel = STRUCTURES.find(s => s.value === structureType)?.label || structureType;
      const sizeLabel = SIZES.find(s => s.value === size)?.label || size;

      try {
        await supabase.from('spectacular_valuation_leads').insert({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          city,
          location_coordinates: { zone },
          structure_type: structureType,
          size,
          is_currently_rented: rented,
          estimated_value_min: estimated.min,
          estimated_value_max: estimated.max,
        });
        console.log('[chatbot_event] calculator_completed');

        // Send result email to user
        supabase.functions.invoke('send-notification-email', {
          body: {
            email: email.trim(),
            type: 'valuation_result',
            recipientName: name.trim(),
            data: {
              valueMin: estimated.min.toLocaleString(),
              valueMax: estimated.max.toLocaleString(),
              city,
              zone,
              structureType: structureLabel,
              size: sizeLabel,
            },
          },
        }).catch(err => console.error('Error sending valuation email to user:', err));

        // Notify admin
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
              size: sizeLabel,
              valueMin: estimated.min.toLocaleString(),
              valueMax: estimated.max.toLocaleString(),
              isRented: rented,
            },
          },
        }).catch(err => console.error('Error sending admin notification:', err));
      } catch (err) {
        console.error('Error saving lead:', err);
      }
      setSaving(false);
      setShowResult(true);
    }
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

  if (showResult && result) {
    return (
      <main className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-lg w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Valor estimado de renta
            </h2>
            <div className="bg-card border border-border rounded-2xl p-8">
              <p className="text-muted-foreground text-sm mb-2">Ubicaciones similares en esta zona se rentan entre:</p>
              <p className="text-3xl md:text-4xl font-bold text-primary">
                ${result.min.toLocaleString()} — ${result.max.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">MXN</span>
              </p>
              <p className="text-muted-foreground text-xs mt-3">por periodo mensual</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Este cálculo es una estimación basada en datos de tráfico y ubicaciones similares. El valor real puede variar.
            </p>

            <div className="bg-card border border-border rounded-2xl p-6 text-left space-y-3">
              <p className="font-semibold text-foreground">
                ¿Quieres recibir solicitudes de marcas interesadas en tu espectacular?
              </p>
              <p className="text-sm text-muted-foreground">
                Publica tu ubicación en Maddi y permite que marcas evalúen tu espacio usando datos de tráfico.
              </p>
              <Button
                className="w-full rounded-xl"
                onClick={() => { console.log('[chatbot_event] calculator_conversion_clicked'); navigate('/auth?role=owner'); }}
              >
                Publicar mi espectacular
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <button
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Volver al inicio
            </button>
          </div>
        </div>
        <Footer />
        <MobileNavBar />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-lg w-full space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Paso {step} de {TOTAL_STEPS}</span>
              <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
            </div>
            <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
          </div>

          {/* Step content */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-5 min-h-[280px]">
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
                <h2 className="text-lg font-bold text-foreground">¿Qué tipo de estructura es?</h2>
                <div className="flex flex-col gap-2">
                  {STRUCTURES.map(s => (
                    <ChoiceButton key={s.value} selected={structureType === s.value} onClick={() => setStructureType(s.value)}>
                      {s.label}
                    </ChoiceButton>
                  ))}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="text-lg font-bold text-foreground">¿Cuáles son las medidas aproximadas?</h2>
                <div className="flex flex-col gap-2">
                  {SIZES.map(s => (
                    <ChoiceButton key={s.value} selected={size === s.value} onClick={() => setSize(s.value)}>
                      {s.label}
                    </ChoiceButton>
                  ))}
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <h2 className="text-lg font-bold text-foreground">¿Tu espectacular está actualmente rentado?</h2>
                <div className="flex flex-col gap-2">
                  {RENTED_OPTIONS.map(r => (
                    <ChoiceButton key={r} selected={rented === r} onClick={() => setRented(r)}>{r}</ChoiceButton>
                  ))}
                </div>
              </>
            )}

            {step === 6 && (
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

          {/* Nav buttons */}
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
              {saving ? 'Calculando...' : step === 6 ? 'Ver mi estimación' : 'Siguiente'}
              {!saving && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
      <MobileNavBar />
    </main>
  );
};

export default ValorEspectacular;
