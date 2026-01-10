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

    const userId = user.id;

    console.log(`Starting account deletion for user: ${userId}`);

    // Delete user data in order (respecting foreign key constraints)
    
    // 1. Delete messages
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('sender_id', userId);
    if (messagesError) console.error('Error deleting messages:', messagesError);

    // 2. Delete conversations (as owner or business)
    const { error: conversationsError } = await supabase
      .from('conversations')
      .delete()
      .or(`owner_id.eq.${userId},business_id.eq.${userId}`);
    if (conversationsError) console.error('Error deleting conversations:', conversationsError);

    // 3. Delete notifications
    const { error: notificationsError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    if (notificationsError) console.error('Error deleting notifications:', notificationsError);

    // 4. Delete reviews
    const { error: reviewsError } = await supabase
      .from('reviews')
      .delete()
      .eq('business_id', userId);
    if (reviewsError) console.error('Error deleting reviews:', reviewsError);

    // 5. Delete favorites
    const { error: favoritesError } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId);
    if (favoritesError) console.error('Error deleting favorites:', favoritesError);

    // 6. Delete favorite folders
    const { error: foldersError } = await supabase
      .from('favorite_folders')
      .delete()
      .eq('user_id', userId);
    if (foldersError) console.error('Error deleting folders:', foldersError);

    // 7. Delete design templates
    const { error: templatesError } = await supabase
      .from('design_templates')
      .delete()
      .eq('user_id', userId);
    if (templatesError) console.error('Error deleting templates:', templatesError);

    // 8. Delete bookings (as business)
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .eq('business_id', userId);
    if (bookingsError) console.error('Error deleting bookings:', bookingsError);

    // 9. Get user's billboards to delete related data
    const { data: billboards } = await supabase
      .from('billboards')
      .select('id')
      .eq('owner_id', userId);

    if (billboards && billboards.length > 0) {
      const billboardIds = billboards.map(b => b.id);

      // Delete blocked dates
      await supabase
        .from('blocked_dates')
        .delete()
        .in('billboard_id', billboardIds);

      // Delete pricing overrides
      await supabase
        .from('pricing_overrides')
        .delete()
        .in('billboard_id', billboardIds);

      // Delete traffic data
      await supabase
        .from('traffic_data')
        .delete()
        .in('billboard_id', billboardIds);

      // Delete INEGI demographics
      await supabase
        .from('inegi_demographics')
        .delete()
        .in('billboard_id', billboardIds);

      // Delete API usage logs
      await supabase
        .from('api_usage_logs')
        .delete()
        .in('billboard_id', billboardIds);
    }

    // 10. Delete billboards
    const { error: billboardsError } = await supabase
      .from('billboards')
      .delete()
      .eq('owner_id', userId);
    if (billboardsError) console.error('Error deleting billboards:', billboardsError);

    // 11. Delete user roles
    const { error: rolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    if (rolesError) console.error('Error deleting roles:', rolesError);

    // 12. Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    if (profileError) console.error('Error deleting profile:', profileError);

    // 13. Delete storage files
    try {
      const { data: files } = await supabase.storage
        .from('billboard-images')
        .list(userId);
      
      if (files && files.length > 0) {
        const filePaths = files.map(f => `${userId}/${f.name}`);
        await supabase.storage
          .from('billboard-images')
          .remove(filePaths);
      }
    } catch (storageError) {
      console.error('Error deleting storage:', storageError);
    }

    // 14. Finally, delete the auth user
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
