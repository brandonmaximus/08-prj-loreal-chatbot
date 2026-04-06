// Cloudflare Worker for proxying requests to OpenAI Chat Completions.
// Store your API key in Cloudflare Secrets as OPENAI_API_KEY.

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle browser preflight requests for CORS.
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Only POST is supported." }),
        { status: 405, headers: corsHeaders },
      );
    }

    try {
      const apiKey = env.OPENAI_API_KEY;

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing OPENAI_API_KEY secret." }),
          { status: 500, headers: corsHeaders },
        );
      }

      const body = await request.json();
      const messages = body.messages;

      if (!Array.isArray(messages)) {
        return new Response(
          JSON.stringify({
            error: "Request body must include a messages array.",
          }),
          { status: 400, headers: corsHeaders },
        );
      }

      const openAiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages,
            max_completion_tokens: 300,
          }),
        },
      );

      const data = await openAiResponse.json();

      return new Response(JSON.stringify(data), {
        status: openAiResponse.status,
        headers: corsHeaders,
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Worker request failed.",
          details: String(error),
        }),
        { status: 500, headers: corsHeaders },
      );
    }
  },
};
