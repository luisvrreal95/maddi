import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendKey);

    // Find owners registered 24h+ ago who have NO billboards
    // and have NOT already received an owner_activation email
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Step 1: Get all owner user_ids registered before 24h ago
    const { data: ownerRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "owner")
      .lte("created_at", twentyFourHoursAgo);

    if (rolesError) {
      console.error("Error fetching owner roles:", rolesError);
      throw rolesError;
    }

    if (!ownerRoles || ownerRoles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No eligible owners found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ownerIds = ownerRoles.map((r) => r.user_id);

    // Step 2: Get owners who already have billboards
    const { data: billboardOwners, error: billboardError } = await supabase
      .from("billboards")
      .select("owner_id")
      .in("owner_id", ownerIds);

    if (billboardError) {
      console.error("Error fetching billboards:", billboardError);
      throw billboardError;
    }

    const ownersWithBillboards = new Set(
      (billboardOwners || []).map((b) => b.owner_id)
    );

    // Step 3: Get owners who already received this email
    const { data: alreadySent, error: sentError } = await supabase
      .from("email_notifications")
      .select("user_id")
      .eq("type", "owner_activation")
      .in("user_id", ownerIds);

    if (sentError) {
      console.error("Error checking sent emails:", sentError);
      throw sentError;
    }

    const alreadySentSet = new Set(
      (alreadySent || []).map((e) => e.user_id)
    );

    // Step 4: Filter to eligible owners
    const eligibleOwnerIds = ownerIds.filter(
      (id) => !ownersWithBillboards.has(id) && !alreadySentSet.has(id)
    );

    if (eligibleOwnerIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No eligible owners to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 5: Get profiles and emails for eligible owners
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, company_name")
      .in("user_id", eligibleOwnerIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    let sent = 0;
    let failed = 0;

    for (const ownerId of eligibleOwnerIds) {
      try {
        // Get email from auth
        const { data: authData } = await supabase.auth.admin.getUserById(ownerId);
        const email = authData?.user?.email;
        if (!email) {
          console.log(`No email found for owner ${ownerId}, skipping`);
          continue;
        }

        const profile = profiles?.find((p) => p.user_id === ownerId);
        const displayName = profile?.company_name || profile?.full_name || "Usuario";

        // Send email using the same template system
        const response = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            email,
            type: "owner_activation",
            recipientName: displayName,
            userId: ownerId,
            data: {},
          }),
        });

        if (response.ok) {
          sent++;
          console.log(`Activation email sent to ${email} (${ownerId})`);
        } else {
          failed++;
          const errBody = await response.text();
          console.error(`Failed to send to ${email}:`, errBody);
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        failed++;
        console.error(`Error processing owner ${ownerId}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: eligibleOwnerIds.length,
        sent,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in owner-activation-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
