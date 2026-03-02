## Entitlements offline policy (v1)
- Store: last_verified_at, entitlement_set, trial_started_at, trial_expires_at (if applicable).
- When online: refresh entitlements at startup and at most once per 24h (debounced).
- When offline: allow module access if last_verified_at <= 72h ago; otherwise lock modules but keep dashboard + export available.
- Never block export due to entitlement refresh failures (user data portability).
