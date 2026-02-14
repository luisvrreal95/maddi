import { supabase } from "@/integrations/supabase/client";

interface SendEmailParams {
  email: string;
  type: string;
  recipientName: string;
  userId?: string;
  entityId?: string;
  data: Record<string, string | number | boolean>;
}

export const sendNotificationEmail = async (params: SendEmailParams) => {
  try {
    const { error } = await supabase.functions.invoke('send-notification-email', {
      body: params,
    });
    if (error) {
      console.error('Email send error:', error);
    }
  } catch (err) {
    console.error('Failed to send notification email:', err);
  }
};

/** Helper to get user email + profile name from user_id */
export const getUserEmailAndName = async (userId: string): Promise<{ email: string | null; name: string }> => {
  // Get profile name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company_name')
    .eq('user_id', userId)
    .maybeSingle();

  const name = profile?.company_name || profile?.full_name || 'Usuario';

  // We can't directly access auth.users from client, so we look for the email
  // in admin_users or rely on caller to provide it
  return { email: null, name };
};
