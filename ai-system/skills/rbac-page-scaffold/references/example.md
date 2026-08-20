# RBAC scaffold — worked example (skill reference)

> **Metadata**
> - last-updated-by: v3 upgrade (skill authoring)
> - last-verified-against-code: (set on first use)
> - staleness-policy: Tier 4 reference — re-verify before relying on anything in a specific audit

```python
# route registered once
@app.get("/projects/{id}")
def project_page(id, user): return render_project(user.role, id)

# composition driven by config, not a fork
def render_project(role, project_id):
    sections = ROLE_PAGE_CONFIG.get(role, ROLE_PAGE_CONFIG["default"])
    return render_sections(sections, project_id)

ROLE_PAGE_CONFIG = {
    "admin":   ["project-detail", "edit-actions", "delete-action"],
    "member":  ["project-detail", "edit-actions"],
    "viewer":  ["project-detail"],
    "default": ["project-detail"],
}
```

Anti-pattern (fail): two route handlers `project_page_admin` and `project_page_user`, or a single handler full of `if role == "admin": return ...` branches. Both are §11 violations.