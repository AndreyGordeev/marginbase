# SMB Finance Toolkit

# Scope V1 -- Common (Platform) Capabilities

------------------------------------------------------------------------

## 1. Guiding Principles

-   Local-first product design to minimize cloud cost.
-   Thin backend (Variant A): store-native subscriptions with minimal
    server validation.
-   Cloud state (data sync / backup) is NOT part of V1; planned for a
    later phase.
-   Calculations run on-device/in-browser; backend does not perform
    computations.

------------------------------------------------------------------------

## 2. Client Platforms (V1)

-   Mobile: iOS and Android clients.
-   Web: browser-based client.
-   UX goal (future): same data across web/mobile, but V1 achieves this
    via export/import, not cloud sync.

------------------------------------------------------------------------

## 3. Identity & Authentication (V1)

-   Sign-in via Google account (Google Sign-In).
-   Purpose: user identity, enabling future sync, and entitlement
    association.
-   No mandatory user data storage in backend beyond minimal identity
    mapping (subject to privacy needs).

------------------------------------------------------------------------

## 4. Subscriptions & Entitlements (V1)

-   Monetization: monthly subscriptions per module and bundle
    subscription.
-   Free trial: available (duration TBD).

### Variant A: Platform-native billing

-   iOS: App Store subscriptions

-   Android: Google Play subscriptions

-   Web: subscription method TBD (future)

-   Entitlements: app determines which modules are unlocked based on
    platform purchase status; backend validation kept minimal.

------------------------------------------------------------------------

## 5. Data Storage (V1)

-   User scenarios and inputs are stored locally only.
-   Mobile storage: SQLite (or equivalent local DB).
-   Web storage: IndexedDB (or equivalent) for offline persistence.
-   Data model prepared for future sync with schema versioning.

------------------------------------------------------------------------

## 6. Export / Import (V1)

-   Export user data as JSON file.
-   Import JSON file to restore/transfer scenarios between devices (web
    ↔ mobile).
-   Goal: enable "same data" across platforms without cloud storage in
    V1.

------------------------------------------------------------------------

## 7. Thin Backend (V1)

Backend responsibilities are intentionally minimal to reduce cost:

-   Verify Google identity token (optional if clients can handle it
    without server).
-   Optional entitlement validation endpoint (kept minimal; no heavy
    state).
-   Optional remote config for the ad block (if needed), otherwise
    static config in clients.
-   No storage of user scenarios in V1.

------------------------------------------------------------------------

## 8. Advertising (V1)

-   Single, small, non-intrusive ad block present in all versions
    (including subscriptions).
-   No interstitials, no rewarded ads, no auto-playing video.
-   Strict exclusion of gambling, betting, and similar categories.

------------------------------------------------------------------------

## 9. Out of Scope for V1 (Explicit)

-   Cloud backup / sync of scenarios
-   Conflict resolution / multi-device real-time sync
-   Complex analytics backend / data warehouse
-   Team collaboration / multi-user business accounts
