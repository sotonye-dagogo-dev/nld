// Cloudflare email integration types

export interface CloudflareEmailInput {
  to: string;
  from?: string;
  subject: string;
  html: string;
}