import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Step {
  icon: string;
  title: string;
  action?: string;
  to?: string;
  description?: string;
}

const OnboardingModal: React.FC = () => {
  const { user, userRole, isLoading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState<string>('');

  useEffect(() => {
    const check = async () => {
      if (isLoading || !user || !userRole) return;
      const key = `maddi_onboarding_shown_${user.id}`;
      if (localStorage.getItem(key) === 'true') return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.created_at) return;
      const ageMs = Date.now() - new Date(profile.created_at).getTime();
      if (ageMs > 5 * 60 * 1000) {
        // Mark as shown so we don't keep checking
        localStorage.setItem(key, 'true');
        return;
      }
      const firstName = (profile.full_name || '').split(' ')[0] || '';
      setFullName(firstName);
      // Mark shown before opening to prevent duplicate fires if effect re-runs
      localStorage.setItem(key, 'true');
      setOpen(true);
      // Fire-and-forget welcome email for brand-new accounts
      supabase.functions.invoke('send-notification-email', {
        body: {
          email: '',
          type: 'welcome',
          recipientName: firstName || 'Usuario',
          userId: user.id,
          data: { role: userRole },
        },
      }).catch((err: unknown) => console.error('[welcome email]', err));
    };
    check();
  }, [user, userRole, isLoading]);

  const handleClose = () => {
    if (user) localStorage.setItem(`maddi_onboarding_shown_${user.id}`, 'true');
    setOpen(false);
  };

  const go = (path: string) => {
    handleClose();
    navigate(path);
  };

  if (!user || !userRole) return null;

  const isOwner = userRole === 'owner';
  const steps: Step[] = isOwner
    ? [
        { icon: '🏗️', title: 'Agrega tu primer espectacular', action: 'Comenzar', to: '/owner' },
        { icon: '✅', title: 'Completa tu perfil', action: 'Ir a perfil', to: '/settings' },
        { icon: '🔒', title: 'Verifica tu identidad', action: 'Verificar', to: '/settings#verificacion' },
      ]
    : [
        { icon: '🔍', title: 'Explora espectaculares', action: 'Explorar', to: '/search' },
        { icon: '❤️', title: 'Guarda tus favoritos', action: 'Mis favoritos', to: '/favorites' },
        { icon: '📋', title: 'Solicita una reserva', description: 'Elige fechas y envía tu solicitud al propietario directamente desde el detalle del espectacular.' },
      ];

  const primaryLabel = isOwner ? 'Agregar mi primer espectacular →' : 'Explorar espectaculares →';
  const primaryPath = isOwner ? '/owner' : '/search';
  const secondaryLabel = isOwner ? 'Explorar primero' : 'Ver más tarde';
  const secondaryPath = isOwner ? '/search' : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg bg-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            ¡Bienvenido a Maddi{fullName ? `, ${fullName}` : ''}! 🎉
          </DialogTitle>
          <DialogDescription className="text-white/70">
            {isOwner
              ? 'Comienza a generar ingresos con tus espectaculares en 3 pasos.'
              : 'Encuentra el espacio publicitario perfecto en 3 pasos.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {steps.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="text-3xl">{s.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary">PASO {i + 1}</span>
                </div>
                <p className="font-medium text-white">{s.title}</p>
                {s.description && (
                  <p className="text-sm text-white/60 mt-1">{s.description}</p>
                )}
              </div>
              {s.to && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10"
                  onClick={() => go(s.to!)}
                >
                  {s.action}
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => (secondaryPath ? go(secondaryPath) : handleClose())}
          >
            {secondaryLabel}
          </Button>
          <Button
            className="flex-1 bg-primary text-black hover:bg-[#8AE83C] font-semibold"
            onClick={() => go(primaryPath)}
          >
            {primaryLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
