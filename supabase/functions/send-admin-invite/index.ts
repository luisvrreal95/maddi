import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  role: "admin" | "super_admin";
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is a super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is super admin
    const { data: adminData, error: adminError } = await supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (adminError || !adminData || adminData.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Only super admins can send invitations" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, role }: InviteRequest = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "Email and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    if (!["admin", "super_admin"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already an admin
    const { data: existingAdmin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ error: "This email is already an admin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from("admin_invitations")
      .select("id")
      .eq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "There is already a pending invitation for this email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create invitation
    const { data: invitation, error: insertError } = await supabase
      .from("admin_invitations")
      .insert({
        email,
        role,
        invited_by: user.id,
      })
      .select("token")
      .single();

    if (insertError || !invitation) {
      console.error("Error creating invitation:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build invite URL
    const baseUrl = req.headers.get("origin") || "https://maddiapp.lovable.app";
    const inviteUrl = `${baseUrl}/admin/accept-invite?token=${invitation.token}`;

    // Send email
    const resend = new Resend(resendKey);
    const roleLabel = role === "super_admin" ? "Super Administrador" : "Administrador";

    const emailResult = await resend.emails.send({
      from: "Maddi <onboarding@resend.dev>",
      to: [email],
      subject: `Invitación al Panel de Administración de Maddi`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0A0A0A; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A1A1A; border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 64px; height: 64px; background-color: rgba(155, 255, 67, 0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="font-size: 32px;">🛡️</span>
              </div>
              <h1 style="color: #FFFFFF; font-size: 24px; margin: 0 0 8px 0;">Invitación al Panel Admin</h1>
              <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0;">Has sido invitado como <strong style="color: #9BFF43;">${roleLabel}</strong></p>
            </div>
            
            <p style="color: rgba(255,255,255,0.8); font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
              Has recibido esta invitación para unirte al panel de administración de Maddi. 
              Haz clic en el botón de abajo para aceptar la invitación y crear tu cuenta.
            </p>
            
            <a href="${inviteUrl}" style="display: block; background-color: #9BFF43; color: #1A1A1A; text-decoration: none; padding: 16px 24px; border-radius: 12px; font-weight: 600; text-align: center; font-size: 16px;">
              Aceptar Invitación
            </a>
            
            <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 24px; text-align: center;">
              Este enlace expira en 7 días. Si no solicitaste esta invitación, puedes ignorar este correo.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Invitation email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Invitation sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-admin-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
