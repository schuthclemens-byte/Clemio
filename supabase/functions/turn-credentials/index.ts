import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const username = Deno.env.get("TURN_USERNAME");
  const credential = Deno.env.get("TURN_CREDENTIAL");

  if (!username || !credential) {
    return new Response(JSON.stringify({ error: "TURN credentials not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "turn:a.relay.metered.ca:80", username, credential },
    { urls: "turn:a.relay.metered.ca:80?transport=tcp", username, credential },
    { urls: "turn:a.relay.metered.ca:443", username, credential },
    { urls: "turns:a.relay.metered.ca:443?transport=tcp", username, credential },
  ];

  return new Response(JSON.stringify({ iceServers }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
