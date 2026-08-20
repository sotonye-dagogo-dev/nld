// Email template payload types (engineering principle §18 — templated content
// with a preview path, never inline string-building at send time).

/** Template contract for the access-password email. */
export interface AccessEmailData {
  to: string;
  platformName: string;
  devotionalTitle: string;
  accessPassword: string;
  accessUrl: string;
  supportEmail: string;
}