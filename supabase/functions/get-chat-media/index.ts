import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  path: string;
}

// Validate request body
function validateBody(body: unknown): body is RequestBody {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as RequestBody).path === "string" &&
    (body as RequestBody).path.length > 0
  );
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Create admin client for database queries
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get JWT from authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validateBody(body)) {
      return new Response(
        JSON.stringify({ error: "Invalid request body: 'path' is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { path } = body;

    // Path format: {sender_user_id}/{filename}
    // We need to find which conversation this media belongs to by looking up the message
    const { data: messages, error: msgError } = await adminClient
      .from("messages")
      .select("conversation_id, sender_id")
      .eq("content", path)
      .in("message_type", ["image", "video", "audio", "voice"])
      .limit(1);

    if (msgError) {
      console.error("Error querying messages:", msgError);
      return new Response(
        JSON.stringify({ error: "Failed to verify media access" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Media not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = messages[0];
    const conversationId = message.conversation_id;

    // Check if the requesting user is a member of the conversation
    const { data: membership, error: memberError } = await adminClient
      .from("conversation_members")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError) {
      console.error("Error checking membership:", memberError);
      return new Response(
        JSON.stringify({ error: "Failed to verify conversation access" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Access denied: you are not a member of this conversation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User is a member - generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await adminClient
      .storage
      .from("chat-media")
      .createSignedUrl(path, 300); // 5 minutes expiration

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Error generating signed URL:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate access URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: signedUrlData.signedUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
