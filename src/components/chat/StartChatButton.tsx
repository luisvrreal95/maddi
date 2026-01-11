import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface StartChatButtonProps {
  billboardId: string;
  ownerId: string;
  className?: string;
}

const StartChatButton: React.FC<StartChatButtonProps> = ({ 
  billboardId, 
  ownerId,
  className 
}) => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  const handleStartChat = async () => {
    if (!user) {
      toast.error('Inicia sesión para enviar mensajes');
      navigate('/auth');
      return;
    }

    if (userRole !== 'business') {
      toast.error('Solo negocios pueden iniciar conversaciones');
      return;
    }

    try {
      // Check if conversation exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('billboard_id', billboardId)
        .eq('business_id', user.id)
        .single();

      if (existing) {
        // Navigate with the conversation ID to auto-select it
        navigate(`/messages?conversation=${existing.id}&billboard=${billboardId}`);
        return;
      }

      // Create new conversation
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          billboard_id: billboardId,
          business_id: user.id,
          owner_id: ownerId
        })
        .select('id')
        .single();

      if (error) throw error;

      // Navigate with new conversation ID and billboard context
      navigate(`/messages?conversation=${newConversation.id}&billboard=${billboardId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Error al iniciar conversación');
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleStartChat}
      className={className}
    >
      <MessageSquare className="w-4 h-4 mr-2" />
      Contactar al dueño
    </Button>
  );
};

export default StartChatButton;
