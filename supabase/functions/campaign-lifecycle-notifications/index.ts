import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsFor, gate } from "../_shared/http.ts";


Deno.serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const denied = await gate(req, { name: 'campaign-lifecycle-notifications', internalOnly: true });
  if (denied) return denied;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 1. Find campaigns that START today (approved bookings where start_date = today)
    const { data: startingCampaigns, error: startErr } = await supabase
      .from("bookings")
      .select("id, billboard_id, business_id, start_date, end_date, total_price")
      .eq("status", "approved")
      .eq("start_date", today);

    if (startErr) throw startErr;

    // 2. Find campaigns that END today
    const { data: endingCampaigns, error: endErr } = await supabase
      .from("bookings")
      .select("id, billboard_id, business_id, start_date, end_date, total_price")
      .eq("status", "approved")
      .eq("end_date", today);

    if (endErr) throw endErr;

    const results: string[] = [];

    // Process starting campaigns
    for (const booking of startingCampaigns || []) {
      // Get billboard info
      const { data: billboard } = await supabase
        .from("billboards")
        .select("title, owner_id")
        .eq("id", booking.billboard_id)
        .single();

      if (!billboard) continue;

      // Notify business: campaign starts today
      await supabase.from("notifications").insert({
        user_id: booking.business_id,
        title: "🚀 ¡Tu campaña inicia hoy!",
        message: `Tu campaña en "${billboard.title}" ha comenzado oficialmente. ¡Buena suerte!`,
        type: "campaign_started",
        related_booking_id: booking.id,
        related_billboard_id: booking.billboard_id,
      });

      // Notify owner: campaign on their billboard starts today
      await supabase.from("notifications").insert({
        user_id: billboard.owner_id,
        title: "📢 Campaña activa hoy",
        message: `La campaña en tu espectacular "${billboard.title}" ha iniciado hoy.`,
        type: "campaign_started",
        related_booking_id: booking.id,
        related_billboard_id: booking.billboard_id,
      });

      // Send emails
      const { data: businessProfile } = await supabase
        .from("profiles")
        .select("full_name, company_name")
        .eq("user_id", booking.business_id)
        .maybeSingle();

      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("full_name, company_name")
        .eq("user_id", billboard.owner_id)
        .maybeSingle();

      // Get emails from email_notifications (best effort)
      const { data: businessEmail } = await supabase
        .from("email_notifications")
        .select("to_email")
        .eq("user_id", booking.business_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: ownerEmail } = await supabase
        .from("email_notifications")
        .select("to_email")
        .eq("user_id", billboard.owner_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (businessEmail?.to_email) {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            email: businessEmail.to_email,
            type: "campaign_started",
            recipientName: businessProfile?.company_name || businessProfile?.full_name || "Usuario",
            entityId: booking.id,
            data: {
              billboardTitle: billboard.title,
              startDate: booking.start_date,
              endDate: booking.end_date,
            },
          },
        });
      }

      if (ownerEmail?.to_email) {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            email: ownerEmail.to_email,
            type: "campaign_started_owner",
            recipientName: ownerProfile?.company_name || ownerProfile?.full_name || "Propietario",
            entityId: booking.id,
            data: {
              billboardTitle: billboard.title,
              startDate: booking.start_date,
              endDate: booking.end_date,
              businessName: businessProfile?.company_name || businessProfile?.full_name || "Anunciante",
            },
          },
        });
      }

      results.push(`Started: ${booking.id}`);
    }

    // Process ending campaigns
    for (const booking of endingCampaigns || []) {
      const { data: billboard } = await supabase
        .from("billboards")
        .select("title, owner_id")
        .eq("id", booking.billboard_id)
        .single();

      if (!billboard) continue;

      // Notify business: campaign ends today
      await supabase.from("notifications").insert({
        user_id: booking.business_id,
        title: "✅ Tu campaña ha finalizado",
        message: `Tu campaña en "${billboard.title}" ha terminado. ¡Déjanos una reseña!`,
        type: "campaign_ended",
        related_booking_id: booking.id,
        related_billboard_id: booking.billboard_id,
      });

      // Notify owner: campaign on their billboard ends today
      await supabase.from("notifications").insert({
        user_id: billboard.owner_id,
        title: "📋 Campaña finalizada",
        message: `La campaña en tu espectacular "${billboard.title}" ha finalizado hoy. Tu espacio está disponible.`,
        type: "campaign_ended",
        related_booking_id: booking.id,
        related_billboard_id: booking.billboard_id,
      });

      // Update booking status to completed
      await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", booking.id);

      results.push(`Ended: ${booking.id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        started: (startingCampaigns || []).length,
        ended: (endingCampaigns || []).length,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Campaign lifecycle error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
