// Cloudflare Worker: SMTP Relay to MailChannels
// 
// This worker receives HTTP requests from the app and forwards them to MailChannels
// for email delivery. MailChannels is free for Cloudflare users and requires no
// domain verification for sending.
//
// Setup:
// 1. Create a Cloudflare Worker at https://dash.cloudflare.com/workers
// 2. Paste this code into the worker
// 3. Add a secret CLOUDFLARE_EMAIL_WORKER_SECRET in Worker settings
// 4. Deploy and use the worker URL as CLOUDFLARE_EMAIL_WORKER_URL in your app
//
// The worker validates the Authorization header against the secret, then forwards
// the email to MailChannels API.

export interface EmailPayload {
  to: string;
  from?: string;
  subject: string;
  html: string;
}

export interface MailChannelsPayload {
  personalizations: Array<{
    to: Array<{ email: string }>;
  }>;
  from: { email: string; name: string };
  subject: string;
  content: Array<{ type: "text/html"; value: string }>;
}

export default {
  async fetch(request: Request, env: { CLOUDFLARE_EMAIL_WORKER_SECRET: string }): Promise<Response> {
    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Verify the Authorization header
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = env.CLOUDFLARE_EMAIL_WORKER_SECRET;

    if (!expectedSecret) {
      console.error("CLOUDFLARE_EMAIL_WORKER_SECRET not configured in Worker environment");
      return new Response("Worker misconfigured: missing secret", { status: 500 });
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized: missing or invalid Authorization header", { status: 401 });
    }

    const providedSecret = authHeader.slice(7); // Remove "Bearer "
    if (providedSecret !== expectedSecret) {
      return new Response("Unauthorized: invalid secret", { status: 401 });
    }

    try {
      // Parse the request body
      const payload: EmailPayload = await request.json();

      // Validate required fields
      if (!payload.to || !payload.subject || !payload.html) {
        return new Response("Bad Request: missing required fields (to, subject, html)", { status: 400 });
      }

      // Default from email if not provided
      const fromEmail = payload.from ?? "noreply@nldv.vercel.app";
      const fromName = "Next Level Devotional";

      // Build MailChannels payload
      const mailChannelsPayload: MailChannelsPayload = {
        personalizations: [
          {
            to: [{ email: payload.to }],
          },
        ],
        from: { email: fromEmail, name: fromName },
        subject: payload.subject,
        content: [
          {
            type: "text/html",
            value: payload.html,
          },
        ],
      };

      // Send to MailChannels (free for Cloudflare users)
      const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mailChannelsPayload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error("MailChannels error:", response.status, responseText);
        return new Response(`MailChannels error: ${response.status} ${responseText}`, { status: 502 });
      }

      return new Response(responseText, { status: 200 });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
} satisfies ExportedHandler<{ CLOUDFLARE_EMAIL_WORKER_SECRET: string }>;