import { vi } from "vitest";

// `server-only` throws when imported outside a React Server Component context.
// Node-based unit tests mock it so server-only modules are testable.
vi.mock("server-only", () => ({}));

// Give the access-password HMAC a stable secret for deterministic tests.
process.env.ACCESS_PASSWORD_SECRET = "test-access-password-secret";