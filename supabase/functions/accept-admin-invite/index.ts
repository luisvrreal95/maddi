import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsFor, gate } from "../_shared/http.ts";


serve(async (req: Request): Promise<Response> => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const denied = await gate(req, { name: 'accept-admin-invite', ip: [10, 3600] });
  if (denied) return denied;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, userId } = await req.json();

    if (!token || !userId) {
      return new Response(
        JSON.stringify({ error: "Token and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token) || !uuidRegex.test(userId)) {
      return new Response(
        JSON.stringify({ error: "Invalid token or userId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("admin_invitations")
      .select("id, email, role, expires_at, accepted_at")
      .eq("token", token)
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return new Response(
        JSON.stringify({ error: "This invitation has already been used" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invitation has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // La cuenta debe pertenecer al email invitado (evita asignar el rol a un usuario arbitrario
    // con solo conocer el token).
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    if (!authUser?.user?.email || authUser.user.email.toLowerCase() !== String(invitation.email).toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "La cuenta no corresponde a la invitación" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reclamo atómico: solo una petición puede consumir la invitación.
    const { data: claimed } = await supabase
      .from("admin_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("id");

    if (!claimed?.length) {
      return new Response(
        JSON.stringify({ error: "This invitation has already been used" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin_users record
    const { error: insertError } = await supabase.from("admin_users").insert({
      user_id: userId,
      role: invitation.role,
      email: invitation.email,
      permissions: null,
    });

    if (insertError) {
      console.error("Error creating admin record:", insertError);
      // Devuelve la invitación para que pueda reintentarse.
      await supabase.from("admin_invitations").update({ accepted_at: null }).eq("id", invitation.id);
      return new Response(
        JSON.stringify({ error: "Failed to create admin record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in accept-admin-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
