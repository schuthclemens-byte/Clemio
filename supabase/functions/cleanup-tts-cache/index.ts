import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_AGE_DAYS = 90;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);

    let deletedCount = 0;
    let offset = 0;
    const limit = 100;

    while (true) {
      const { data: files, error } = await adminClient.storage
        .from("tts-cache")
        .list("", { limit, offset, sortBy: { column: "created_at", order: "asc" } });

      if (error) {
        console.error("List error:", error.message);
        break;
      }

      if (!files || files.length === 0) break;

      const toDelete: string[] = [];

      for (const file of files) {
        if (file.created_at && new Date(file.created_at) < cutoff) {
          toDelete.push(file.name);
        }
      }

      if (toDelete.length > 0) {
        const { error: delError } = await adminClient.storage
          .from("tts-cache")
          .remove(toDelete);

        if (delError) {
          console.error("Delete error:", delError.message);
        } else {
          deletedCount += toDelete.length;
        }
      }

      // If we got fewer files than the limit, we've reached the end
      if (files.length < limit) break;

      // If no files in this batch were old enough, all remaining are newer — stop
      if (toDelete.length === 0) break;

      // Don't increment offset when we deleted files (indices shift)
    }

    console.log(`Cleanup complete: ${deletedCount} files deleted (older than ${MAX_AGE_DAYS} days)`);

    return new Response(
      JSON.stringify({ deleted: deletedCount, max_age_days: MAX_AGE_DAYS }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
