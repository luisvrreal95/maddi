import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type FlowStep = 'welcome' | 'owner-city' | 'owner-cta' | 'brand-city' | 'brand-cta' | 'calculator-cta' | 'support-form' | 'support-sent';

interface ChatMessage {
  id: string;
  content: React.ReactNode;
  isBot: boolean;
}

const logEvent = (event: string) => {
  console.log(`[chatbot_event] ${event}`);
};

const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>('welcome');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showPulse, setShowPulse] = useState(true);
  const navigate = useNavigate();

  // Support form state
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);

  const addBotMessage = useCallback((content: React.ReactNode) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), content, isBot: true }]);
  }, []);

  const addUserMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), content, isBot: false }]);
  }, []);

  const welcomeMessage = (
    <div>
      <p>Hola 👋</p>
      <p className="mt-1">Bienvenido a <strong>Maddi</strong>.</p>
      <p className="mt-2 text-muted-foreground text-sm">Estamos organizando el mapa digital de espectaculares en México.</p>
      <p className="mt-3 font-medium">¿Qué te gustaría hacer?</p>
    </div>
  );

  // Auto-open after 6 seconds
  useEffect(() => {
    if (hasAutoOpened) return;
    const timer = setTimeout(() => {
      setIsOpen(true);
      setHasAutoOpened(true);
      logEvent('chatbot_opened');
    }, 6000);
    return () => clearTimeout(timer);
  }, [hasAutoOpened]);

  // Initialize welcome messages
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: 'welcome-1', content: welcomeMessage, isBot: true }]);
    }
  }, [messages.length]);

  const handleOpen = () => {
    setIsOpen(true);
    setShowPulse(false);
    if (!hasAutoOpened) logEvent('chatbot_opened');
  };

  const handleClose = () => setIsOpen(false);

  const handleReset = () => {
    setFlowStep('welcome');
    setSupportName('');
    setSupportEmail('');
    setSupportPhone('');
    setMessages([{ id: 'welcome-1', content: welcomeMessage, isBot: true }]);
  };

  const handleOwnerFlow = () => {
    logEvent('chatbot_option_selected');
    logEvent('chatbot_owner_flow');
    addUserMessage('Tengo un espectacular y quiero publicarlo');
    setFlowStep('owner-city');
    setTimeout(() => {
      addBotMessage(
        <div>
          <p>Perfecto 🙌</p>
          <p className="mt-2 text-sm text-muted-foreground">
            En Maddi puedes publicar tu espectacular para que marcas y agencias puedan evaluarlo usando datos de tráfico y perfil demográfico.
          </p>
          <p className="mt-2 text-sm font-medium text-primary">En esta etapa inicial no tiene costo publicar.</p>
          <p className="mt-3 font-medium">¿Dónde se encuentra tu espectacular?</p>
        </div>
      );
    }, 400);
  };

  const handleOwnerCity = (city: string) => {
    addUserMessage(city);
    setFlowStep('owner-cta');
    setTimeout(() => {
      addBotMessage(<p>Publicar tu ubicación toma menos de 5 minutos.</p>);
    }, 400);
  };

  const handleBrandFlow = () => {
    logEvent('chatbot_option_selected');
    logEvent('chatbot_brand_flow');
    addUserMessage('Quiero anunciar una marca o campaña');
    setFlowStep('brand-city');
    setTimeout(() => {
      addBotMessage(
        <div>
          <p>Perfecto.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            En Maddi puedes encontrar espectaculares disponibles y evaluarlos usando datos de tráfico y perfil demográfico.
          </p>
          <p className="mt-3 font-medium">¿En qué ciudad quieres anunciarte?</p>
        </div>
      );
    }, 400);
  };

  const handleBrandCity = (city: string) => {
    addUserMessage(city);
    setFlowStep('brand-cta');
    setTimeout(() => {
      addBotMessage(<p>¡Genial! Tenemos opciones disponibles para ti.</p>);
    }, 400);
  };

  const handleCalculatorFlow = () => {
    logEvent('chatbot_option_selected');
    logEvent('chatbot_calculator_clicked');
    addUserMessage('Calcular cuánto podría valer mi espectacular');
    setFlowStep('calculator-cta');
    setTimeout(() => {
      addBotMessage(
        <div>
          <p>Podemos estimar el valor de renta de tu espectacular usando datos de tráfico y ubicación.</p>
          <p className="mt-2 text-sm text-muted-foreground">Te tomará menos de 1 minuto.</p>
        </div>
      );
    }, 400);
  };

  const handleSupportFlow = () => {
    logEvent('chatbot_option_selected');
    addUserMessage('Contactar al equipo de soporte');
    setFlowStep('support-form');
    setTimeout(() => {
      addBotMessage(
        <div>
          <p>Con gusto te ayudamos 🙌</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Déjanos tus datos y nuestro equipo se pondrá en contacto contigo en breve.
          </p>
        </div>
      );
    }, 400);
  };

  const handleSendSupport = async () => {
    if (!supportName.trim() || !supportEmail.includes('@')) return;
    setSendingSupport(true);
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          email: 'luis@maddi.com.mx',
          type: 'support_contact',
          recipientName: 'Luis',
          data: {
            contactName: supportName.trim(),
            contactEmail: supportEmail.trim(),
            contactPhone: supportPhone.trim() || '',
          },
        },
      });
    } catch (err) {
      console.error('Error sending support contact:', err);
    }
    setSendingSupport(false);
    setFlowStep('support-sent');
    addBotMessage(
      <div>
        <p>¡Gracias, {supportName.trim()}! ✅</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Recibimos tus datos. Nuestro equipo se pondrá en contacto contigo en breve a <strong>{supportEmail.trim()}</strong>.
        </p>
      </div>
    );
  };

  const OptionButton: React.FC<{ onClick: () => void; children: React.ReactNode; variant?: 'primary' | 'outline' }> = ({ onClick, children, variant = 'outline' }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
        variant === 'primary'
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
      )}
    >
      {children}
    </button>
  );

  const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; primary?: boolean; disabled?: boolean }> = ({ onClick, children, primary, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50",
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
      )}
    >
      {children}
    </button>
  );

  const renderOptions = () => {
    switch (flowStep) {
      case 'welcome':
        return (
          <div className="flex flex-col gap-2 p-3">
            <OptionButton onClick={handleOwnerFlow}>🏗️ Tengo un espectacular y quiero publicarlo</OptionButton>
            <OptionButton onClick={handleBrandFlow}>📢 Quiero anunciar una marca o campaña</OptionButton>
            <OptionButton onClick={handleCalculatorFlow}>💰 Calcular cuánto podría valer mi espectacular</OptionButton>
            <OptionButton onClick={handleSupportFlow}>💬 Contactar al equipo de soporte</OptionButton>
          </div>
        );
      case 'owner-city':
        return (
          <div className="flex flex-col gap-2 p-3">
            <OptionButton onClick={() => handleOwnerCity('Mexicali')}>Mexicali</OptionButton>
            <OptionButton onClick={() => handleOwnerCity('Tijuana')}>Tijuana</OptionButton>
            <OptionButton onClick={() => handleOwnerCity('Otra ciudad')}>Otra ciudad</OptionButton>
          </div>
        );
      case 'owner-cta':
        return (
          <div className="flex flex-col gap-2 p-3">
            <ActionButton primary onClick={() => { logEvent('chatbot_owner_flow'); navigate('/auth?role=owner'); handleClose(); }}>
              Publicar mi espectacular
            </ActionButton>
            <ActionButton onClick={() => { logEvent('chatbot_calculator_clicked'); navigate('/valor-espectacular'); handleClose(); }}>
              💰 Calcular valor de mi espectacular
            </ActionButton>
            <ActionButton onClick={() => { navigate('/messages'); handleClose(); }}>
              💬 Hablar con el equipo
            </ActionButton>
          </div>
        );
      case 'brand-city':
        return (
          <div className="flex flex-col gap-2 p-3">
            <OptionButton onClick={() => handleBrandCity('Mexicali')}>Mexicali</OptionButton>
            <OptionButton onClick={() => handleBrandCity('Tijuana')}>Tijuana</OptionButton>
            <OptionButton onClick={() => handleBrandCity('Otra ciudad')}>Otra ciudad</OptionButton>
          </div>
        );
      case 'brand-cta':
        return (
          <div className="flex flex-col gap-2 p-3">
            <ActionButton primary onClick={() => { navigate('/search'); handleClose(); }}>
              Ver espectaculares disponibles
            </ActionButton>
            <ActionButton onClick={() => { navigate('/messages'); handleClose(); }}>
              💬 Hablar con el equipo
            </ActionButton>
          </div>
        );
      case 'calculator-cta':
        return (
          <div className="flex flex-col gap-2 p-3">
            <ActionButton primary onClick={() => { logEvent('chatbot_calculator_clicked'); navigate('/valor-espectacular'); handleClose(); }}>
              💰 Calcular valor de mi espectacular
            </ActionButton>
          </div>
        );
      case 'support-form':
        return (
          <div className="flex flex-col gap-2 p-3">
            <input
              type="text"
              placeholder="Tu nombre *"
              value={supportName}
              onChange={e => setSupportName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="email"
              placeholder="Tu correo *"
              value={supportEmail}
              onChange={e => setSupportEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="tel"
              placeholder="Teléfono (opcional)"
              value={supportPhone}
              onChange={e => setSupportPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <ActionButton
              primary
              onClick={handleSendSupport}
              disabled={!supportName.trim() || !supportEmail.includes('@') || sendingSupport}
            >
              {sendingSupport ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</span>
              ) : (
                <span className="flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Enviar</span>
              )}
            </ActionButton>
          </div>
        );
      case 'support-sent':
        return (
          <div className="flex flex-col gap-2 p-3">
            <ActionButton onClick={handleReset}>← Volver al inicio</ActionButton>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={handleOpen}
          className={cn(
            "fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform hover:scale-105",
            showPulse && "animate-bounce"
          )}
          aria-label="Abrir chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
          style={{ maxHeight: 'min(520px, calc(100vh - 120px))' }}
        >
          <div className="bg-foreground px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {flowStep !== 'welcome' && (
                <button onClick={handleReset} className="text-background/60 hover:text-background">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-background text-sm font-semibold">Maddi</span>
            </div>
            <button onClick={handleClose} className="text-background/60 hover:text-background">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.map(msg => (
              <div key={msg.id} className={cn("flex", msg.isBot ? "justify-start" : "justify-end")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                  msg.isBot
                    ? "bg-secondary text-foreground rounded-tl-md"
                    : "bg-primary text-primary-foreground rounded-tr-md"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border shrink-0">
            {renderOptions()}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
