import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller
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

    // Check if this is an admin action or self-deletion
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body = self-deletion */ }
    
    const isAdminAction = body?.admin_action === true;
    const targetUserId = body?.target_user_id || user.id;

    // If admin action, verify caller is admin
    if (isAdminAction && targetUserId !== user.id) {
      const { data: adminRecord } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!adminRecord) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: not an admin" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const userId = targetUserId;
    console.log(`Starting account deletion for user: ${userId} (admin: ${isAdminAction})`);

    // Delete in order respecting FK constraints
    await supabase.from('messages').delete().eq('sender_id', userId);
    await supabase.from('conversations').delete().or(`owner_id.eq.${userId},business_id.eq.${userId}`);
    await supabase.from('notifications').delete().eq('user_id', userId);
    await supabase.from('reviews').delete().eq('business_id', userId);
    await supabase.from('favorites').delete().eq('user_id', userId);
    await supabase.from('favorite_folders').delete().eq('user_id', userId);
    await supabase.from('design_templates').delete().eq('user_id', userId);
    await supabase.from('bookings').delete().eq('business_id', userId);

    // Get user's billboards to delete related data
    const { data: billboards } = await supabase.from('billboards').select('id').eq('owner_id', userId);

    if (billboards && billboards.length > 0) {
      const billboardIds = billboards.map(b => b.id);
      await supabase.from('blocked_dates').delete().in('billboard_id', billboardIds);
      await supabase.from('pricing_overrides').delete().in('billboard_id', billboardIds);
      await supabase.from('traffic_data').delete().in('billboard_id', billboardIds);
      await supabase.from('inegi_demographics').delete().in('billboard_id', billboardIds);
      await supabase.from('api_usage_logs').delete().in('billboard_id', billboardIds);
      await supabase.from('poi_overview_cache').delete().in('billboard_id', billboardIds);
      // Delete bookings ON these billboards too
      await supabase.from('bookings').delete().in('billboard_id', billboardIds);
    }

    await supabase.from('billboards').delete().eq('owner_id', userId);
    await supabase.from('user_roles').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('user_id', userId);

    // Delete storage files
    for (const bucket of ['billboard-images', 'verification-docs']) {
      try {
        const { data: files } = await supabase.storage.from(bucket).list(userId);
        if (files && files.length > 0) {
          const filePaths = files.map(f => `${userId}/${f.name}`);
          await supabase.storage.from(bucket).remove(filePaths);
        }
      } catch (e) {
        console.error(`Error deleting ${bucket} files:`, e);
      }
    }

    // Delete auth user
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return new Response(
        JSON.stringify({ error: "Error al eliminar cuenta de autenticación" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Account successfully deleted for user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Cuenta eliminada exitosamente" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in delete-user-account:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
