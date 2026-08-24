# Email Service Alternatives for Free Vercel Domain (nldv.vercel.app)

## The Problem
Resend requires domain verification and doesn't allow sending from unverified domains like `nldv.vercel.app`. You need an email service that:
1. Works with free Vercel subdomains
2. Supports your existing email templates (stored in DB with variables)
3. Can be integrated with minimal code changes

---

## Option 1: SendGrid (Free Tier: 100 emails/day)
**Best for:** Quick setup, generous free tier, reliable delivery

- **Free tier:** 100 emails/day forever
- **Domain verification:** Optional for testing (can use `sendgrid.net` subdomain)
- **API:** REST API + SMTP
- **Integration:** Create `src/integrations/sendgrid/client.ts` following the Resend pattern

```typescript
// src/integrations/sendgrid/client.ts
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail({
  to,
  subject,
  html,
  from = process.env.SENDGRID_FROM_EMAIL!,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  await sgMail.send({ to, from, subject, html });
}
```

**Pros:** Easy migration, generous free tier, good deliverability
**Cons:** Requires domain auth for production volumes

---

## Option 2: Mailgun (Free Tier: 1,000 emails/month for 3 months)
**Best for:** Higher volume free tier initially

- **Free tier:** 1,000 emails/month for 3 months, then pay-as-you-go
- **Domain verification:** Required for production
- **API:** REST API + SMTP
- **Sandbox mode:** Can test without domain verification

```typescript
// src/integrations/mailgun/client.ts
import formData from "form-data";
import Mailgun from "mailgun.js";

const mailgun = new Mailgun(formData);
const client = mailgun.client({ username: "api", key: process.env.MAILGUN_API_KEY! });

export async function sendEmail({
  to,
  subject,
  html,
  from = process.env.MAILGUN_FROM_EMAIL!,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  await client.messages.create(process.env.MAILGUN_DOMAIN!, { to, from, subject, html });
}
```

**Pros:** Higher initial free tier, sandbox for testing
**Cons:** Requires domain verification after trial

---

## Option 3: Brevo (formerly Sendinblue) - Free Tier: 300 emails/day
**Best for:** EU-based, generous daily limit, no credit card required

- **Free tier:** 300 emails/day forever
- **Domain verification:** Optional for low volume
- **API:** REST API + SMTP
- **Features:** Marketing automation included

```typescript
// src/integrations/brevo/client.ts
import SibApiV3Sdk from "@getbrevo/brevo";

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!);

export async function sendEmail({
  to,
  subject,
  html,
  from = { email: process.env.BREVO_FROM_EMAIL!, name: "Next Level Devotional" },
}: {
  to: string;
  subject: string;
  html: string;
  from?: { email: string; name: string };
}) {
  await apiInstance.sendTransacEmail({
    sender: from,
    to: [{ email: to }],
    subject,
    htmlContent: html,
  });
}
```

**Pros:** 300/day free, EU GDPR compliant, no card needed
**Cons:** Lower deliverability than SendGrid/Mailgun for some regions

---

## Option 4: Postmark (Free Tier: 100 emails/month)
**Best for:** Transactional email focus, best deliverability

- **Free tier:** 100 emails/month (developer plan)
- **Domain verification:** Required
- **API:** REST API + SMTP
- **Focus:** Purely transactional (no marketing)

```typescript
// src/integrations/postmark/client.ts
import postmark from "postmark";

const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN!);

export async function sendEmail({
  to,
  subject,
  html,
  from = process.env.POSTMARK_FROM_EMAIL!,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  await client.sendEmail({ From: from, To: to, Subject: subject, HtmlBody: html });
}
```

**Pros:** Best deliverability for transactional, fast API
**Cons:** Lowest free tier, strict domain verification

---

## Option 5: Self-Hosted SMTP via Cloudflare Workers + MailChannels (FREE)
**Best for:** Zero cost, full control, works with any domain

### Architecture
```
Your App → Cloudflare Worker (SMTP relay) → MailChannels (free) → Recipient
```

### Setup
1. **MailChannels** - Free email delivery for Cloudflare users (no account needed)
2. **Cloudflare Worker** - Handles SMTP → HTTP conversion
3. **Your App** - Sends via HTTP to Worker

```typescript
// cloudflare-worker/smtp-relay.js
export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    
    const { to, subject, html, from } = await request.json();
    
    // MailChannels API (free for Cloudflare users)
    const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from, name: "Next Level Devotional" },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });
    
    return new Response(await response.text(), { status: response.status });
  },
};
```

```typescript
// src/integrations/mailchannels/client.ts
export async function sendEmail({
  to,
  subject,
  html,
  from = process.env.MAIL_FROM_EMAIL!,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  const workerUrl = process.env.MAILCHANNELS_WORKER_URL!;
  await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.MAILCHANNELS_WORKER_SECRET}` },
    body: JSON.stringify({ to, subject, html, from }),
  });
}
```

**Pros:** Completely free, no domain verification needed, unlimited emails
**Cons:** Requires Cloudflare account, Worker setup, slightly more complex

---

## Option 6: Self-Hosted SMTP Server (Docker + Postfix/Haraka)
**Best for:** Complete control, unlimited emails, runs on your infrastructure

### Simple Docker Setup (Haraka SMTP)
```yaml
# docker-compose.yml
version: '3.8'
services:
  haraka:
    image: haraka/haraka:latest
    ports:
      - "25:25"
      - "587:587"
    environment:
      - HOSTNAME=mail.yourdomain.com
    volumes:
      - ./config:/haraka/config
      - ./plugins:/haraka/plugins
```

**Pros:** Full control, no limits, no third-party dependency
**Cons:** Requires server management, IP reputation management, deliverability work

---

## Option 7: AWS SES + Lambda (Nearly Free)
**Best for:** AWS users, very cheap at scale ($0.10/1000 emails)

- **Free tier:** 62,000 emails/month if sent from EC2/Lambda
- **Domain verification:** Required
- **Setup:** Lambda function + SES

```typescript
// src/integrations/aws-ses/client.ts
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env.AWS_REGION });

export async function sendEmail({
  to,
  subject,
  html,
  from = process.env.SES_FROM_EMAIL!,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  await ses.send(new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: html } },
    },
  }));
}
```

**Pros:** Very cheap at scale, integrates with AWS
**Cons:** Requires AWS account, domain verification, sandbox mode limits

---

## Recommended Approach for Your Case

### Immediate Fix (Today): **Brevo (Sendinblue)**
- 300 emails/day free
- No credit card required
- Works without domain verification for testing
- API compatible with your template system

### Medium Term (This Week): **Cloudflare Workers + MailChannels**
- Completely free forever
- No domain verification
- Unlimited emails
- Runs on edge (fast)

### Long Term: **SendGrid or Postmark**
- Best deliverability for production
- Worth paying for when you scale

---

## Integration Pattern (Minimal Code Changes)

Your email system is already decoupled:
1. Templates in DB (`email_templates` table) with code fallbacks (`src/config/defaults.ts`)
2. Rendering in `src/lib/email-render.ts` / `src/lib/email-templates.ts`
3. Admin editor in `/admin/(panel)/email-templates`

To swap providers, you only need to:
1. Create `src/integrations/{provider}/client.ts` following the Resend pattern
2. Update call sites (`sendAccessEmail`, `sendTemplateEmail`) to use the new wrapper
3. Templates, variables, and admin UI remain **unchanged**

### Example: Swappable Email Client Interface
```typescript
// src/integrations/email-client.ts (new abstraction)
export interface EmailClient {
  sendAccessEmail(params: AccessEmailParams): Promise<void>;
  sendTemplateEmail(params: TemplateEmailParams): Promise<void>;
}

// Usage in your code:
let emailClient: EmailClient;

if (process.env.EMAIL_PROVIDER === "resend") {
  emailClient = await import("./resend/client").then(m => m.createResendClient());
} else if (process.env.EMAIL_PROVIDER === "brevo") {
  emailClient = await import("./brevo/client").then(m => m.createBrevoClient());
} else if (process.env.EMAIL_PROVIDER === "mailchannels") {
  emailClient = await import("./mailchannels/client").then(m => m.createMailChannelsClient());
}

// Call sites use emailClient.sendAccessEmail() / sendTemplateEmail()
```

---

## Quick Start: Brevo (Recommended for Immediate Fix)

1. Sign up at https://brevo.com (no credit card)
2. Get API key from Settings → SMTP & API
3. Add to Vercel environment variables:
   ```
   BREVO_API_KEY=your_api_key
   BREVO_FROM_EMAIL=noreply@yourdomain.com  # or use a verified sender
   EMAIL_PROVIDER=brevo
   ```
4. Create `src/integrations/brevo/client.ts` (see above)
5. Update `sendAccessEmail` and `sendTemplateEmail` to use the new client

This gets you running today with 300 emails/day free, no domain verification required for testing.