# Integration folder shape (skill reference)

> **Metadata**
> - last-updated-by: v3 upgrade (skill authoring)
> - last-verified-against-code: (set on first use)
> - staleness-policy: Tier 4 reference — re-verify before relying on anything in a specific audit

```
integrations/<service>/
├── client.ts          # wrapper — the only file that imports the vendor SDK
├── config.ts          # config-driven keys/limits with documented fallbacks
└── types.ts            # integration data shapes, defined once
```

Callers import the wrapper, never the SDK:

```python
# callers
from integrations.email import email_sender
email_sender.send(...)
```

Rule: if you find `import vendor_sdk` anywhere except `integrations/<service>/client.*`, the wrapper was not created and the change violates §17. Swap test: replacing the vendor should only touch `client.*` plus config/types references — never call sites.