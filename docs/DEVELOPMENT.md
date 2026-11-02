# Rental Manager — Development Reference

This document is the **development reference** for the Rental Manager mobile application. It records the sealed product and architecture decisions for this project. When a decision is marked **sealed**, it must not be changed silently; any conflict must be raised and resolved by a human.

Status legend used throughout this document:

- **Sealed** — decided. Do not change without raising a conflict.
- **Future** — a possibility we intend to support eventually.
- **Deferred** — intentionally left for later; do not build it now.

---

## 1. Purpose

A mobile rental management application for a **single landlord**. It helps the landlord manage, from a mobile device:

- Properties
- Property spaces
- Tenants
- Rental agreements
- Rental payments
- Receipts
- Landlord profile
- Signature and stamp
- Application settings
- Local authentication
- Backup and restore
- Monthly subscription

The application is designed around a **practical real-world landlord workflow**.

## 2. Product scope — sealed

- The MVP supports exactly **one user: the landlord**.
- **No** staff accounts, **no** roles, **no** permissions, **no** multi-user collaboration, **no** employee-management domain in the MVP.
- Authentication is required; authorization is intentionally minimal because there is only one authenticated landlord.

### Scope — future

- Roles and permissions, if a genuine multi-user requirement appears later.
- Cloud backup/restore providers.

### Scope — non-goals for the MVP

- Real-time synchronization.
- Server-based authentication dependency for normal offline operation.
- Multi-user collaboration.
- Anti-trial-abuse infrastructure (device fingerprinting, hardware binding, elaborate fraud detection, cross-installation account tracking).
- Advanced subscription verification.
- A separate "Rental Unit" entity.

## 3. Target user — sealed

The MVP targets a single landlord who rents property spaces to tenants. The UI must eventually feel:

- Playful, intuitive, comfortable
- Clearly structured and readable
- Spacious, without excessive font sizes
- Visually polished
- Slightly tactile/3D through cards, elevation, shadows, depth and layered surfaces

The application must **not** look childish. It must remain pleasant for landlords of different ages, including elderly landlords.

## 4. Product philosophy — sealed

Keep the application:

- Simple
- Practical
- Understandable
- Offline-first
- Easy to use
- Extensible where there is a genuine future need
- Free from unnecessary complexity

Do not over-engineer. Do not introduce abstractions simply because they are theoretically possible. A future requirement is allowed to introduce additional complexity when that requirement actually exists.

## 5. Offline-first architecture — sealed

- Normal rental management must **not** depend on an Internet connection.
- The **local device database (SQLite) is the primary source of truth** for rental-management data.
- Cloud services, when introduced later, are initially intended for **backup and restore only**, **not** real-time synchronization.
- Do not build synchronization infrastructure during initialization.

## 6. Core domain model — sealed

```text
Account
   |
   └── Landlord
         |
         ├── Property
         |     |
         |     └── Property Space
         |           |
         |           └── Property Space
         |                 |
         |                 └── ...
         |
         ├── Tenant
         |
         ├── Rental Agreement
         |
         ├── Rental Payment
         |
         ├── Receipt
         |
         └── Settings
```

Important domain decisions:

- A **Property** is the overall physical property/compound owned by the landlord (e.g. "Paul's Compound", "Molyko Building"). A Property can contain multiple Property Spaces.
- There is **no separate physical "Rental Unit" entity**. A rentable Property Space plays the role of the rental unit.
- A **Property Space** is a physical space within a property and has a type/category. The controlled type list is `BUILDING`, `FLOOR`, `APARTMENT`, `STUDIO`, `ROOM`, `SHOP`, `OFFICE`, `WAREHOUSE`, `OTHER`. Property Spaces form a hierarchy. A space may be rentable itself and/or contain child spaces that are rentable.
  - **Invariant:** a parent space and its rentable child spaces must not simultaneously be rented in a way that creates ambiguity.
- A **Tenant** is the person renting a rentable Property Space. The initial model stays simple: full name, phone, optional second phone, optional email, optional address, optional identification information, optional notes. Introduce fields only when a real requirement exists.
- A **Rental Agreement** connects a Tenant to a rentable Property Space for a specific period under defined terms. It contains: Tenant, rentable Property Space, start date, optional end date, rent amount, rent frequency, optional security deposit, optional termination date, optional notes, creation/update timestamps. The rent amount is the amount payable **per stated frequency** and is never derived from, or converted to, a monthly base. The property is **not stored** on the agreement; it is always derived through the space.
  - **There is no separate Rent Price entity.** The rental amount belongs to the Rental Agreement so historical agreements remain intact.
  - **There is no stored `status` column.** Lifecycle (`UPCOMING` | `ACTIVE` | `ENDED` | `TERMINATED`) is derived from the dates and the current date: a `terminationDate` wins, else a future `startDate` is `UPCOMING`, else an `endDate` before today is `ENDED`, else `ACTIVE`.
- A **Rental Payment** is money actually received from a tenant, and belongs to a Rental Agreement. Payment methods are generic: `CASH`, `MOBILE_MONEY`, `BANK_TRANSFER`, `OTHER`. Do not couple the rental domain to specific payment vendors (e.g. MTN, Orange). The reference is free text.
- A **Receipt** is a permanent historical document proving a payment was received. It must be an **immutable snapshot** — it must not depend on the current state of the Tenant, Property, Property Space, or Rental Agreement after generation. Snapshot content may include: receipt number, payment ID, tenant name, property name, property space name, amount, payment date, rental period, landlord name, signature snapshot, stamp snapshot, generation date.
  - **Rental Payment and Application Subscription are completely different money flows and must never be mixed.** Rental payment: tenant → landlord. Subscription: landlord → application business.

## 7. Account and authentication — sealed (direction)

- The MVP has one authenticated landlord.
- Authentication answers: "Is this person allowed to open and use the application?"
- **No role/permission system** for the MVP.
- Potential account information: ID, name, phone/email as needed, password credential, PIN credential, created timestamp.
- The eventual experience: first setup → create account → create PIN → optional biometric unlock → later PIN / biometric → application. Password remains a possible fallback.
- **PIN is the required initial credential.** During Application Setup the landlord creates only a 4-digit PIN; a password is **not** collected or required (single landlord, elderly users must not be forced to create a password).
- A recovery password is **optional/deferred**, not required: it may later be configured voluntarily (Settings → Security → Recovery Password) and is **not** a mandatory part of setup. Building that recovery workflow stays out of scope beyond the implemented Authentication slice (§18) — there is deliberately no "Forgot PIN" UI yet.
- Authentication must be designed for an **offline-first** mobile application. Do not assume a server-based authentication architecture. No email/SMS/cloud/OAuth/provider-based recovery in the MVP.

### Security stack — sealed (direction)

- `expo-secure-store` for local secrets.
- `expo-local-authentication` / platform biometric authentication.
- Database encryption via SQLCipher (or the most appropriate option for the chosen Expo/native build configuration) is to be considered.
- No server-based authentication dependency for normal offline operation.

## 8. Landlord profile and settings — sealed (direction)

- Do not create an unnecessarily complex Landlord domain. The authenticated **Account plus profile/settings** is sufficient for the MVP.
- Settings will eventually hold: landlord name, phone, address, signature, stamp, receipt appearance, receipt numbering, default signature/stamp behavior, security preferences, backup settings, currency, other application preferences.

## 9. Subscription model — sealed

- The application uses a **monthly subscription** with an initial **30-day free trial**.
- Subscription is a separate business module from rental management. Keep the two completely separate.
- A Subscription is simply a **period**:

```text
Subscription
├── id
├── type            -- TRIAL | PAID
├── startDate
├── endDate
└── createdAt
```

- **There is intentionally no status column.** No `trialEndsAt`, no `currentPeriodStart`/`currentPeriodEnd`, no subscription state machine. Start and end dates describe the subscription period.
- First record: `type = TRIAL`, `startDate = account/trial start date`, `endDate = startDate + 29 days`. The trial covers **30 inclusive calendar days** — the start date and the end date both count, so an `startDate` of `2026-10-08` ends on `2026-11-06`.
- Paid subscription: the landlord requests N months (e.g. 1/3/6/12). The application calculates the resulting period and creates a new Subscription row. The number of months is **not** stored (dates already represent the period).
- Do not couple the domain to a specific payment provider. Pricing/payment mechanics are not implemented yet.

### Determining the current subscription — sealed

Do not store status. Access is active when a subscription exists with:

```text
startDate <= today AND today <= endDate
```

That is the core subscription algorithm. The application does not need Internet access simply to determine whether a stored subscription period has expired.

### Subscription period rule — sealed

Avoid overlapping active subscriptions. A new paid subscription should normally begin after the current subscription period ends. Do not create overlapping periods, unless a future business requirement explicitly introduces subscription extension/stacking.

### Subscription and offline operation — sealed

Normal operation does not require constant Internet access. Subscription expiration is determined locally from the stored dates. Internet is only needed later for subscription purchase processing, payment verification, and cloud backup/restore.

## 10. Backup and restore — sealed (direction)

- The local SQLite database is the primary source of truth.
- Backup/restore will eventually include: the database, the signature, the stamp, receipt assets/files where necessary, schema/application version, and relevant subscription information.
- Possible dedicated backup format: `rental-manager-backup-YYYY-MM-DD.rentalbackup`.
- Cloud storage is for backup/restore only — it is **not** full synchronization.
- Future provider abstraction: Local File, Google Drive, OneDrive, Dropbox. Providers are future work.

## 11. Technology stack — sealed

### Mobile

- React Native, Expo, Expo Router, TypeScript. (SDK 57 / React Native 0.86 / React 19 as of this foundation.)

### Local database

- SQLite via **Expo SQLite**.
- **Drizzle ORM** is the query layer over Expo SQLite (it integrates cleanly).
- The local database is the primary application data store.

### Security

- Expo SecureStore, Expo Local Authentication, platform biometric authentication where supported.
- SQLCipher-based database encryption to be considered where appropriate.

### Files

- Expo/native file system for: signature, stamp, generated receipt files, backup files, other local application assets.

### PDF / sharing / printing

- Receipts will eventually be generated as PDF documents and shared/printed/exported through native mechanisms (e.g. device share sheet, WhatsApp, email).
- Not implemented during initialization.

### Testing (direction)

- Tests are part of implementation, covering: domain rules, application use cases, repository behavior, important UI behavior, authentication behavior, subscription calculations, rental calculations, receipt snapshot behavior, backup/restore behavior.
- Use the appropriate testing tools for the chosen Expo/React Native stack. Do not over-test trivial implementation details. Prioritize business behavior.
- Test runner decided: **Jest** with the **`jest-expo`** preset. Tests live beside the code (`*.test.ts`). Domain/application tests use fakes and never touch native SQLite. `tsconfig.json` sets `"types": ["jest"]` because TypeScript 6 no longer auto-includes `@types` globals.

## 12. Architecture — Domain-Driven Design (DDD) — sealed

This project uses **DDD** as the development pattern. DDD is not just a folder-naming convention; the domain model must represent real business concepts and rules.

### Domain layer purity — sealed

The domain layer must **not** depend on:

- React Native, Expo, SQLite, Drizzle
- PDF libraries, file-system APIs, cloud providers
- Native UI, WhatsApp, email, printing APIs

Infrastructure details must remain outside the domain.

### Layer responsibilities — sealed

- **Domain** — entities, value objects, domain rules, domain services, repository contracts where appropriate. The domain should represent the business and must not know data is stored in SQLite.
- **Application** — use cases and application orchestration (e.g. Create Property, Create Property Space, Register Tenant, Create Rental Agreement, Record Rental Payment, Generate Receipt, Create Subscription, Check Subscription Access). Application services coordinate domain objects and infrastructure contracts.
- **Infrastructure** — concrete implementations of technical concerns (SQLite repositories, Drizzle queries, file storage, PDF generation, backup providers, secure credential storage, native integrations).
- **Presentation** — the mobile-facing UI and interaction layer: screens, routes, components, forms, navigation, view models/hooks, UI state. **Presentation must call application use cases, not directly manipulate the database.**

### Module structure — sealed

```text
src/
├── modules/
│   ├── account/               -- account + authentication
│   ├── property-management/
│   ├── tenant-management/
│   ├── rental-agreement-management/
│   ├── rent-payment-management/
│   ├── receipt-management/
│   ├── settings/
│   └── subscription/
│
└── shared/                    -- genuinely shared foundations
    ├── domain/
    ├── application/
    ├── infrastructure/
    │   └── database/          -- SQLite/Drizzle connection foundation
    └── presentation/
```

Each feature/module follows:

```text
feature/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

The exact final structure can be adjusted if a technically better organization is justified, but the DDD boundaries must remain clear.

## 13. Development order — sealed

Development proceeds **concept by concept** as vertical slices. Do not build the whole database or every screen first.

```text
Project Foundation
    ↓
Application Setup              <- implemented (first vertical slice)
    ↓
Authentication                 <- implemented (second vertical slice, §18)
    ↓
Authorization foundation / access boundary
    ↓
Subscription                   <- implemented (third vertical slice, §19)
    ↓
    Property                       <- implemented (fourth vertical slice, §20)
    ↓
    Property Space                 <- implemented (fifth vertical slice, §21)
    ↓
Tenant                        <- implemented (sixth vertical slice, §22)
    ↓
Rental Agreement              <- implemented (seventh, §23)
    ↓
Rental Payment                <- implemented (eighth, §24)
    ↓
Receipt                       <- implemented (ninth, §25)
    ↓
Settings                      <- implemented (minimal slice, §26)
    ↓
Backup & Restore              <- still deferred
    ↓
Additional integrations
```

Authorization in the MVP is intentionally simple: one landlord, no role system. Do not invent roles and permissions.

## 14. Concept-first workflow — sealed

Before implementing a new domain concept, model it first:

1. Understand the real-world concept.
2. Define its purpose.
3. Identify its responsibilities.
4. Identify its invariants/business rules.
5. Identify relationships with existing concepts.
6. Decide what data belongs to it.
7. Decide what data does **not** belong to it.
8. Define its application use cases.
9. Define repository boundaries.
10. Implement infrastructure.
11. Implement presentation.
12. Add tests.
13. Document important decisions.
14. Verify the complete vertical slice.

Do not jump directly from a vague requirement to database tables.

## 15. Database and SQLite/Drizzle foundation — sealed (direction)

- `src/shared/infrastructure/database/connection.ts` opens the SQLite database and exposes the Drizzle instance. This is the single, shared database connection entry point. SQLite disables foreign keys by default, so the connection executes `PRAGMA foreign_keys = ON` immediately after opening; every query then runs with foreign-key enforcement. Migrations cannot toggle this pragma inside their transaction and use `PRAGMA defer_foreign_keys = ON` instead (see §21).
- Drizzle schema files live under `src/shared/infrastructure/database/schema/`. Each concept adds its own schema file(s) when that concept is modeled and implemented.
- `drizzle.config.ts` drives `drizzle-kit` migration generation. Generated migrations go to `drizzle/` and are applied at runtime via the Drizzle Expo SQLite migrator. The **sync** Expo SQLite driver is in use (`openDatabaseSync`).
- Business tables are created **per concept**, when that concept is implemented — never up front. The `accounts` and `subscriptions` tables exist because Application Setup was the first implemented slice; the `properties` table exists because the Property slice (§20) was implemented; the `property_spaces` table exists because the Property Space slice (§21) was implemented.

### Migration setup — implemented

- SQL migration files are bundled into the app: `babel-plugin-inline-import` inlines `.sql`; `metro.config.js` pushes the `sql` extension onto `resolver.sourceExts`.
- `drizzle/migrations.js` is a **generated artifact**. Because `drizzle.config.ts` uses `driver: 'expo'`, `npx drizzle-kit generate` writes it (`embeddedMigrations`) by iterating `drizzle/meta/_journal.json` — one import and one registration per journal entry — and **overwrites** the file on every run. Do **not** hand-edit it (hand-editing previously duplicated the `m0004` import and broke Android bundling); if it is ever out of sync, regenerate instead. The journal is the source of truth for order and entries.
- `src/shared/infrastructure/database/migrate.ts` runs `migrate()` (Drizzle Expo migrator) against the shared connection and is bootstrapped in `src/app/_layout.tsx` before the router renders.

## 16. Conflict handling — sealed

If an existing implementation, generated configuration, dependency choice, or proposed design conflicts with a sealed decision in this document:

1. **STOP.**
2. Report the conflict with: Conflict / Current behavior / Sealed decision / Potential impact / Recommended resolution.
3. Wait for human direction.

Do not silently reinterpret the requirement. Do not replace a sealed decision with a different architecture merely because another approach is more common.

## 17. Application Setup — implemented (sealed direction)

The **Application Setup** concept is the first vertical slice. It is a **workflow**, not a persisted entity — there is **no** Installation/InstallationStatus table or domain object.

### Flow

```text
APP LAUNCH → Is the application initialized? → NO → Application Setup:
  1. Create account (landlord name)
  2. Establish authentication credential (PIN)
  3. Create 30-day trial subscription
  → Setup complete → Authentication
YES → Authentication → Dashboard
```

Initialization state is derived, never stored: the app is *initialized* when an Account exists (`accounts` is non-empty).

### Credential — first implementation decision

- During setup the user creates a **4-digit numeric PIN** as the single credential (matches the sealed account flow "create account → create PIN"). **A password is not part of Application Setup**; password-based recovery is optional/deferred (see §7).
- Authentication rules live at the **authentication boundary**, not in `InitializeApplication`. The orchestrator depends on a `CredentialService` port (`establish` / `verify` / `remove`); it never touches passwords, hashes, or SecureStore directly. Today the application code truly talks to SecureStore; a future Authentication slice may insert verification flows behind the same boundary.
- Storage: **SecureStore**, key `rental-manager.credential.<accountId>`, value `saltHex:sha256Hex(salt:pin)` using `expo-crypto` (`getRandomBytesAsync` + `digestStringAsync`). The PIN itself is never stored.
- `verify` was added to the boundary (plus the `VerifyCredential` application use case) so the created credential can be checked without building the full unlock screen. `verify` sits behind the boundary and is tested at the application and secure-storage layers; the Authentication slice wires it into the real `/unlock` screen through `AuthenticateWithPin` (§18).
- The `saltHex:hashHex` value is parsed and compared by testable pure helpers (`hashCredential`, `credentialMatches` — constant-time hex compare, malformed values rejected).
- Password and biometric unlock are **deferred** (future Security slice, §18).

### Transactions and ordering — critical decision

`InitializeApplication` is `async` in the application layer, but the SQLite work runs through a **synchronous** unit of work:

1. Pre-check for an existing account (throw `ApplicationAlreadyInitializedError` if present).
2. Establish the credential in SecureStore **first** (async, outside the database). If this fails, nothing has been persisted — the app remains uninitialized.
3. Run one **synchronous** SQLite transaction that writes the Account and the 30-day trial Subscription atomically.
4. If the transaction throws, best-effort `credentialService.remove(accountId)`.

Why synchronous: the Expo SQLite **sync** driver's `transaction()` commits as soon as the callback returns (`expo-sqlite/session.ts` logic). An async callback would commit before its awaited queries finish, breaking atomicity. There is no atomic transaction spanning SecureStore + SQLite; step 2's ordering plus step 4's cleanup is the designed partial-failure recovery. Do not "simplify" this back to an async transaction callback.

Consequences of the sync driver:

- Repositories (`AccountRepository`, `SubscriptionRepository`), the unit of work, and the inner use cases (`CreateAccount`, `CreateTrialSubscription`) are **synchronous** (`save(): void`, `findFirst(): Account | null`).
- Drizzle queries must call the sync execute methods explicitly — `.run()`, `.get()`, `.all()` — never rely on `await db.select()...` (that resolves without executing).

### Date and ID conventions

- Calendar dates are `YYYY-MM-DD` strings (`CalendarDateString`). `today()` uses the device-local timezone; arithmetic uses UTC. Calendar-day math is inclusive: `addCalendarDays('2026-10-08', 29)` is `2026-11-06`, and a 30-day trial covers 30 dates.
- Trial rule: `TRIAL_DURATION_DAYS = 30`; the end date is `startDate + (TRIAL_DURATION_DAYS - 1)` days so the count is inclusive (`startDate <= today <= endDate`, matching §9).
- `createdAt` is integer epoch milliseconds. IDs come from the `IdGenerator` port (`expo-crypto` `randomUUID`).

### Schema (created by this slice)

- `accounts` — `id` (PK), `full_name`, `created_at`.
- `subscriptions` — `id` (PK), `type` (`TRIAL` | `PAID`), `start_date`, `end_date`, `created_at`. **No status column** (sealed, §9).

### Presentation

- `src/app/_layout.tsx` runs `runMigrations()` before rendering.
- `src/app/index.tsx` gates with `resolveInitialRoute({ initialized, authenticated })`: `/setup` (account absent), `/unlock` (account present, unauthenticated), `/dashboard` (account present, runtime session already authenticated).
- `src/app/setup/index.tsx` renders the `SetupWizard` (welcome → account name → PIN → complete), which calls `initializeApplication.execute({ fullName, pin })`.
- Setup steps render inside a shared `KeyboardSafeContainer` (setup-ui): a `KeyboardAvoidingView` with `behavior="padding"` (on **both** platforms) wrapping a scrollable `ScrollView` with `keyboardShouldPersistTaps="handled"`, `keyboardDismissMode="on-drag"`, and `automaticallyAdjustKeyboardInsets` (iOS). The scroll content container has `flexGrow: 1`, and children sit in an inner `centered` wrapper (`flexGrow: 1` + `justifyContent: 'center'`). When the viewport (or keyboard-reduced viewport) has room, the form is vertically centered; when there is not enough room, the wrapper takes its natural height and the content starts at the top and scrolls — so centering never clips the form behind the keyboard. `flexGrow` (not `flex: 1`) is used so tall content is never shrunk. This keeps the focused field, the Confirm PIN field, and the Continue action visible and tappable while the on-screen keyboard is open. No third-party keyboard library.
- **Why `behavior="padding"` on Android too:** Expo Go runs Android edge-to-edge (always-on since SDK 53, mandatory on Android 16). In that mode the window no longer auto-adjusts for the keyboard — Android behaves like iOS, and `KeyboardAvoidingView` must therefore be given `behavior` on Android as well (the previous `undefined` on Android made it a no-op, which is why the keyboard was still covering the form). RN 0.86 docs: "On both iOS and Android, setting `behavior` is recommended." Config `android.softwareKeyboardLayoutMode` is left at the default `resize`.
- The PIN step renders two clearly separated fields — "Choose a 4-digit PIN" and "Confirm your PIN" — with the same validation messages and security rules.
- `src/app/unlock/index.tsx` renders the real `UnlockScreen` (Authentication slice, §18).
- Composition root: `src/modules/account/infrastructure/composition-root.ts` wires `initializeApplication`, `getApplicationState`, `verifyCredential`, plus the Authentication slice's `authenticationSession`, `authenticateWithPin`, and `getOwnerProfile` (sharing one `SecureStoreCredentialService` instance).

### Toolchain notes

- The `typedRoutes` experiment is **disabled** (`app.json → experiments.typedRoutes = false`). Expo's router type generation for this SDK emits file-path route literals (e.g. `/setup/index` instead of `/setup`), which made `Redirect`/`router` hrefs fail typecheck unless `.expo/types/router.d.ts` was hand-maintained. Hrefs are plain strings until the generator is fixed in a future SDK; revisit by switching the experiment on again at that point.
- `babel.config.js` adds `inline-import` for `.sql`; `metro.config.js` extends `sourceExts` with `sql`. `src/types/declarations.d.ts` declares `*.sql`.
- `tsconfig.json` sets `"types": ["jest"]` (TypeScript 6 no longer auto-includes `@types` globals).

---

## 18. Authentication (PIN unlock) — implemented

The Authentication slice replaced the `/unlock` placeholder with the real PIN unlock flow. Authentication is a **behavior** around Account + Credential + Authentication Session: there is intentionally **no** Authentication entity/table and **no** persisted `isAuthenticated` flag (§7).

### Implemented behavior

- **PIN is the primary authentication method** — the only credential. Application Setup establishes it (§17); no password exists anywhere in the app.
- **Authentication is local and offline** — verification flows through the existing `VerifyCredential` → `CredentialService` port → `SecureStoreCredentialService`. No network, no server sessions, independent of Subscription and of every rental feature.
- **A correct PIN establishes the runtime authenticated state** — `AuthenticationSession` holds a single in-memory boolean. A cold start is always UNAUTHENTICATED; the state is never written to SQLite or SecureStore.
- **An incorrect PIN is rejected** — `Incorrect PIN. Please try again.`, the entered PIN is cleared, and another attempt is allowed. No per-digit feedback, no credential details, no lockout system.
- **Empty or incomplete PINs never reach verification** — the form blocks them with `Please enter your 4-digit PIN.` and `AuthenticateWithPin` independently validates the format against `Pin` (domain rule authoritative).
- **No roles, permissions, staff, or multi-user logic exists** — one local owner; the authenticated boundary is a plain yes/no guard.
- **No online authentication exists** — no OAuth, email, SMS, or cloud involvement.
- **Password recovery remains deferred** — no "Forgot PIN" UI exists until a real recovery flow is built.
- **Biometric authentication remains deferred** — no fingerprint/Face ID UI exists yet.

### Flow and boundaries

```text
UnlockScreen (presentation)
  → AuthenticateWithPin (application orchestration)
      → Pin.create                (domain format rule)
      → VerifyCredential          (application)
          → CredentialService     (port)
              → SecureStoreCredentialService → expo-secure-store
      → session.authenticate()    (runtime state only)
  → router.replace('/dashboard')
```

- Presentation never verifies the credential and never touches SecureStore; screens only call composition-root use cases.
- `AuthenticateWithPin.execute({ pin })` returns `Promise<boolean>` and does not throw for a wrong or malformed PIN. Unexpected infrastructure errors surface to the UI as `Something went wrong. Please try again.` and leave the session unauthenticated.
- `GetOwnerProfile` supplies the owner's `fullName`; the unlock screen greets with the first name, derived in the presentation layer as the first whitespace-separated token of `fullName` (computed in `unlock-screen.tsx`, never by the use case). The user is never asked for a username, email, or phone number.

### Routing and guard

- `src/app/index.tsx` uses `resolveInitialRoute({ initialized, authenticated })`; after setup, setup completion still routes to `/unlock`.
- `/dashboard` (`src/app/dashboard/index.tsx`) is a minimal **authenticated placeholder route**: it guards itself with `resolveProtectedRoute` + `authenticationSession.isAuthenticated()` and renders `<Redirect href="/unlock" />` when unauthenticated. It renders `DashboardScreen` — a simple placeholder whose only action is **Lock application**.
- The pure helpers `resolveInitialRoute` / `resolveProtectedRoute` live in `src/modules/account/presentation/routing.ts` and are unit-tested.
- **Locking:** the explicit Lock action calls `authenticationSession.lock()` and returns to `/unlock`. Automatic background/timeout locking is **deferred** — it needs an application-lifecycle/security slice before it is built.

### Unlock screen UX

- One screen, one purpose: "Welcome back" + first name, one obscured 4-digit input (`secureTextEntry`, `keyboardType="number-pad"`, `maxLength={4}`, digits-only sanitizing), one primary **Unlock** button. An explicit button is used rather than auto-submit on the fourth digit (§6 of the slice chose exactly one mechanism).
- Reuses the setup's `KeyboardSafeContainer` (`behavior="padding"` on both platforms) — no second keyboard-management implementation. The numeric keyboard never hides the PIN field or the Unlock button, and no manual keyboard dismissal is needed to unlock.
- Elderly-friendly by design: plain language, large centered PIN field, comfortable touch targets, no clutter, no technical terminology.
- No "Forgot PIN", no biometric controls, no roles/permissions, no account lockout — all deferred by decision, not accidentally missing.

---

## 19. Subscription entitlement & expiration — implemented

The subscription slice turns the sealed §9 model into a working, offline-first entitlement rule. There is still **no status column** and no subscription state machine — entitlement is always derived from stored date periods.

### Deriving entitlement

`GetSubscriptionStatus` (application) reads all periods (`SubscriptionRepository.findAll`) and the `Clock::today`, and returns a single status:

- `ACTIVE` — at least one period satisfies `startDate <= today <= endDate` (boundaries inclusive). When several are active, the latest-ending period wins.
- `EXPIRED` — no active period, but at least one ended before today; the latest end date is reported. (For past periods, the most recent is the earliest start date.)
- `FUTURE` — no active period; the earliest not-yet-started period is reported.
- `NONE` — nothing is persisted.

Only `ACTIVE` is entitled. **No subscription and a not-yet-started (`FUTURE`) period are treated as not entitled** — this is not an authentication failure; the app stays usable, it is only the restricted operations below that are blocked.

### The single access policy

`SubscriptionAccessPolicy` (application) is the one place expiry is enforced. It exposes `canRecordRentalPayment` / `canGenerateReceipt` and `assertCanRecordRentalPayment` / `assertCanGenerateReceipt`; the `assert*` methods throw `SubscriptionExpiredError` (`"Your subscription has expired. It must be renewed before this operation can continue."`).

Expiration blocks **exactly two operations** — recording a new rental payment and generating a new receipt. Everything else remains available: unlocking/signing in, navigation, viewing existing records and receipts, editing, settings, and backup/restore. Restricted use cases must call this policy at the application boundary; unrelated flows never consult it. It is consumed by §24 (recording a rental payment) and §25 (generating a receipt).

### Period validation (no checkout yet)

`ValidateSubscriptionPeriod` (application) is the boundary a future purchase flow must call before persisting: dates must be valid, `endDate` cannot precede `startDate`, and the period must not overlap any existing period. A period starting the day *after* an existing `endDate` is allowed (sequential periods). This use case validates only — it creates no paid period, so no checkout, payment provider, or renewal flow is introduced here.

### Presentation

The authenticated dashboard shows one subscription line inside its card: the active trial/paid end date, or — when `EXPIRED` — a danger-coloured message stating the end date and that renewal is required before recording payments or generating receipts. It hides entirely when there is no subscription. There is deliberately **no renewal button** and no claim of a backend; navigation is never blocked by subscription state.

### Still deferred

Subscription purchase and payment verification, paid-period creation, renewal UI, and the payment-provider abstraction remain deferred (see below). No server or Internet dependency was added to any offline-critical workflow.

---

## 20. Property management — implemented

The Property slice is the fourth vertical slice. A **Property** is the overall physical property the landlord manages (a building or an estate). It is **not** a rentable area — apartments, rooms, shops and offices belong to the future Property Space slice. A landlord may own many properties; names are not required to be unique.

### Model and invariants

- Fields: `id`, `name`, `address`, `description`, `createdAt`, `updatedAt`, `archivedAt`.
- `name` is required, trimmed, at most `PROPERTY_NAME_MAX_LENGTH` (100) characters.
- `address` is required, trimmed, at most `PROPERTY_ADDRESS_MAX_LENGTH` (200) characters.
- `description` is optional and trimmed; a blank/whitespace-only value is stored as `null`.
- **No `status` column and no permanent delete.** Lifecycle is derived from `archivedAt`: `null` means active, a timestamp means archived.
- Archiving sets `updatedAt = archivedAt`; restoring clears `archivedAt` and sets `updatedAt` to the clock's current instant. Updating preserves identity, `createdAt` and the current lifecycle state.

### Use cases

- `CreateProperty` — validates through the domain, assigns an id, sets `createdAt`/`updatedAt`.
- `GetProperty` — returns `Property | null`; a missing id is not an error.
- `ListProperties` — active properties only (`findActive`).
- `ListArchivedProperties` — archived properties only (`findArchived`).
- `UpdateProperty`, `ArchiveProperty`, `RestoreProperty` — load by id first and throw `PropertyNotFoundError` when absent.

Domain errors: `InvalidPropertyNameError`, `InvalidPropertyAddressError`, `PropertyAlreadyArchivedError`, `PropertyAlreadyActiveError`. Application errors: `PropertyNotFoundError`, `ArchiveBlockedByActiveRentalAgreementsError`.

### Rental-agreement boundary (dependency inversion)

A property with active rental agreements must not be archived. `ArchiveProperty` depends on an **application-level port** `ActiveRentalAgreementsQuery { hasActiveForProperty(propertyId): boolean }`. With the Rental Agreement slice landed (§23), the infrastructure implementation is `PreventPropertyArchiveQuery`, backed by the rental-agreement repository; the earlier `NoActiveRentalAgreementsQuery` placeholder has been removed. The Property domain and use cases were not touched by this change.

### Infrastructure

- Table `properties` (`src/shared/infrastructure/database/schema/properties.ts`), created by migration `drizzle/0001_puzzling_husk.sql`.
- `DrizzlePropertyRepository` implements the `PropertyRepository` port (`save` / `update` / `findById` / `findActive` / `findArchived`) using the synchronous Expo SQLite driver.
- The pure mapping helpers `toPropertyData` / `toPropertyRow` are exported and unit-tested without a database. (As elsewhere in this codebase, `expo-sqlite` has no working database under `jest-expo`, so full SQL round-trips are not exercised in tests.)

### Localization (new shared module)

The slice requires English and French text, but no i18n system existed (the reference assumed one). A minimal, dependency-free module was added under `src/shared/i18n/`: `en`/`fr` catalogues, `TranslationKey` parity enforced by the type system, best-effort device-language detection via `Intl`, and a `useTranslation()` React binding (`useSyncExternalStore`). All new Property UI strings go through it; existing screens were left untouched. This is the project's only localization mechanism until a dedicated i18n slice formalizes it.

### Presentation

- Routes in `src/app/properties/`: `index` (active list), `new` (create), `archived` (archived list), `[id]/index` (Property Workspace, the primary screen), `[id]/details` (Property Details, secondary) and `[id]/edit` (edit). Each guards itself with `resolveProtectedRoute` + `authenticationSession.isAuthenticated()`; the `ApplicationRoute` union in `routing.ts` was extended accordingly. Creating a property navigates straight to its workspace (`router.replace('/properties/${id}')`).
- The dashboard gained a single "Manage properties" entry point.
- Screens call only composition-root use cases (`src/modules/property-management/infrastructure/composition-root.ts`); presentation never touches SQLite.
- Property presentation reuses the setup UI primitives (`Card`, `PrimaryButton`, `KeyboardSafeContainer`, palette/spacing/styles) from the account module rather than introducing a third copy. If a shared UI module is ever introduced, this cross-module import should be revisited.

### Still deferred

Property Spaces, rental agreements, payments and receipts now live in their own slices (§21, §23–§25). Archiving does **not** yet cascade to related records; only the boundary port above exists.

---

## 21. Property space — implemented

The Property Space slice is the fifth vertical slice. A **Property Space** is a physical space inside a Property, modelled as a tree. It may represent a building, floor, apartment, studio, room, shop, office, warehouse or another space. There is **no separate Rental Unit entity**: a rentable space is simply a space whose `rentable` role is enabled.

### Model and invariants

- Fields: `id`, `propertyId`, `parentSpaceId` (nullable), `name`, `type`, `rentable`, `createdAt`, `updatedAt`, `archivedAt`.
- `type` is a controlled vocabulary: `BUILDING`, `FLOOR`, `APARTMENT`, `STUDIO`, `ROOM`, `SHOP`, `OFFICE`, `WAREHOUSE`, `OTHER`. It describes the physical nature only and never determines rentability.
- `name` is required, trimmed, at most `PROPERTY_SPACE_NAME_MAX_LENGTH` (100) characters. Active sibling names must be unique within `same property + same parent + active spaces`; archived spaces do not block reuse of a name. This guarantee is enforced by **both** the application prechecks **and** SQLite partial unique indexes (migration `drizzle/0007_property_space_name_uniqueness.sql`), so the database remains authoritative if a write ever races past the precheck.
- `rentable` is independent of `type`. A rentable space does **not** have to be a leaf: a rentable parent may contain children (the ancestor/descendant rental conflict is a future Rental Agreement concern, not modelled here).
- `parentSpaceId = null` means a root space. A child's `propertyId` must equal its parent's `propertyId`; a space can never move across properties. The hierarchy must never contain cycles.
- **No `status` column, no `isArchived` field, no availability/occupancy field, and no permanent delete.** Lifecycle is derived from `archivedAt`: `null` = active, timestamp = archived. Restoring returns the same identity and clears `archivedAt` without changing `rentable`.

### Availability projection (derived, read-only)

Availability is deliberately **not** a stored field. `GetPropertyWorkspaceOverview` (application layer) reads a property's spaces and the occupancy facts supplied by Rental Agreement Management, then projects **exactly one** read-only label per space with a fixed precedence:

1. `NOT_RENTABLE` — the space has `rentable = false`.
2. `ARCHIVED` — the space itself is archived.
3. `SUSPENDED` — an ancestor is archived, at any depth. The space stays active but cannot receive new rental agreements until the ancestor is restored.
4. `OCCUPIED` — a current agreement exists.
5. `UPCOMING` — only a future agreement exists.
6. `AVAILABLE` — rentable, active, and no current or upcoming agreement.

Occupancy crosses the module boundary through the application-level port `SpaceOccupancyQuery.findForSpaces(spaceIds, today)`, implemented by `AgreementSpaceOccupancyQuery` in Rental Agreement Management and wired in the composition roots. The workspace read model asks once per property (`findAll({ spaceIds })`, never once per space) and receives only `hasCurrentAgreement` / `hasUpcomingAgreement` facts — Property Management does not import rental-agreement domain or infrastructure. A current agreement wins over an upcoming one.

The workspace summary (`summarizeAvailability`) counts rentable, non-archived spaces and partitions them into `occupied`, `upcoming` and `available`. Suspended spaces are still counted as rentable but in none of those three buckets, so the three counters need not add up to the rentable total. Labels are computed on read and never persisted; badges are presentation-only.

### Archive and restore confirmations

Every archive/restore entry point (workspace, property details, space details, archived property list and archived space list) asks for confirmation first through the shared `confirmLifecycleAction`, a thin wrapper over native `Alert.alert`. The copy states what happens and what is preserved:

- archiving a property hides it from active lists while agreements, payments, receipts and history stay unchanged;
- archiving a space with descendants explains that active descendants **remain active but are suspended from new agreements until the parent is restored**, while history stays unchanged;
- archiving a leaf space explains that it leaves the active list only;
- restores are confirmed with a simple prompt.

The dialog is presentation/UX only: confirming runs the use case, which still validates and may reject the operation (for example an active rental agreement blocks archiving). Cancelling does nothing.

### Archiving

`archivedAt` represents intentional retirement of a space from active management — not occupancy or unavailability. Archiving therefore **never cascades**: archiving a parent does not archive, delete or mutate its children. An archived space cannot receive new children and cannot be selected as a parent. If business rules prevent an archive, the operation is rejected instead of silently mutating descendants. The `rentable` flag does **not** independently determine whether a space may be archived; only the active-rental-agreement protection (§23) blocks archiving, and restoring never changes `rentable`.

### Use cases

`CreatePropertySpace`, `GetPropertySpace`, `ListPropertySpaces` (all spaces, active + archived), `UpdatePropertySpace` (name/type/rentable only, preserving parent and lifecycle), `MovePropertySpace` (validates same-property, active parent, non-self, no cycle, destination sibling-name uniqueness), `ArchivePropertySpace`, `RestorePropertySpace`. Domain errors: `InvalidPropertySpaceNameError`, `InvalidPropertySpaceTypeError`, `InvalidPropertySpaceParentError`, `PropertySpaceArchivedError`, `PropertySpaceAlreadyActiveError`. Application errors: `PropertySpaceNotFoundError`, `PropertySpaceNameAlreadyExistsError`, `PropertySpaceCycleError`, `PropertySpaceParentArchivedError`, `PropertySpaceParentMismatchError`, `PropertySpaceCannotArchiveError`, plus the reused `PropertyNotFoundError` / `PropertyArchivedError`.

### Rental-agreement boundary (dependency inversion)

Archiving a space with active rental agreements must be blocked. As with Property (§20), `ArchivePropertySpace` depends on an application-level port `SpaceActiveRentalAgreementsQuery { hasActiveForSpace(spaceId): boolean }`. With the Rental Agreement slice landed (§23), it is bound to `PreventSpaceArchiveQuery`; the `NoSpaceActiveRentalAgreementsQuery` placeholder has been removed.

### Infrastructure

- Table `property_spaces` (`src/shared/infrastructure/database/schema/property-spaces.ts`), created by migration `drizzle/0002_yummy_yellowjacket.sql`, with indexes on `property_id`, `parent_space_id` and `archived_at`. Migration `drizzle/0007_property_space_name_uniqueness.sql` adds two **partial unique indexes** that scope active-name uniqueness exactly like the application check: `property_spaces_active_parented_name_idx` on `(property_id, parent_space_id, name)` where `parent_space_id IS NOT NULL AND archived_at IS NULL`, and `property_spaces_active_root_name_idx` on `(property_id, name)` where `parent_space_id IS NULL AND archived_at IS NULL`. Root spaces need their own index because SQLite treats `NULL` parents as distinct in a composite unique index.
- Migration `drizzle/0008_property_space_integrity.sql` rebuilds `property_spaces` with storage-level integrity to back the application rules:
  - `property_id` → `properties(id)` with `ON DELETE RESTRICT`, so a property can never be physically deleted while it still owns spaces;
  - composite self-reference `(parent_space_id, property_id)` → `property_spaces(id, property_id)` with `ON DELETE RESTRICT`, so a parent must exist **in the same property** and a parent with children can never be deleted;
  - `CHECK property_spaces_not_self_parent` — the composite key alone does not reject a row that is its own parent;
  - unique index `property_spaces_id_property_id_unique` as the parent key required by that composite reference.
  - No cascade anywhere: deletes are rejected (`RESTRICT`), not propagated. All lookup indexes and both partial name-uniqueness indexes are recreated by the rebuild.
- The rebuild validates existing rows **before** touching the table using temporary `BEFORE INSERT` triggers that `RAISE(ABORT, …)` with actionable messages (orphan property, missing parent, cross-property parent, self parent). Rows are copied through an in-transaction temporary backup, then `PRAGMA defer_foreign_keys = ON` defers foreign-key checks to commit so a child may be stored before its parent. Any violation aborts the migration transaction, rolling back to the legacy table and data unchanged; after the data is fixed, the migration can be retried. `connection.ts` enables `PRAGMA foreign_keys = ON` for every connection (§15). `property-space-integrity.integrity.test.ts` exercises the migration on `node:sqlite` (enforcement, restrictive deletes, index preservation, rollback and retry).
- `DrizzlePropertySpaceRepository` implements the `PropertySpaceRepository` port (`save` / `update` / `findById` / `findByPropertyId` / `findActiveSiblingByName`) on the synchronous Expo SQLite driver. The pure mapping helpers `toPropertySpaceData` / `toPropertySpaceRow` are exported and unit-tested without a database (same `expo-sqlite`-under-jest limitation as Property). `save` and `update` translate a `UNIQUE constraint failed` from these name indexes into the existing `PropertySpaceNameAlreadyExistsError`; unrelated SQLite errors are rethrown unchanged. The application prechecks in `CreatePropertySpace`, `UpdatePropertySpace`, `MovePropertySpace` and `RestorePropertySpace` remain for user-friendly feedback — the indexes (and this mapping) are the durable backstop.

### Presentation

- Routes in `src/app/properties/[id]/spaces/`: `index` (archived spaces), `new` (create, optional `?parentSpaceId=`), `[spaceId]/index` (details), `[spaceId]/edit`. Each guards itself with `resolveProtectedRoute`; the existing `/properties/${string}` template in the `ApplicationRoute` union already covers them. There is no separate "Manage spaces" entry point: the **Property Workspace** (`/properties/[id]`, §20) is the primary place to browse and manage the space tree, with a "Property actions" header menu linking to Property Details, Edit, Archive/Restore and the archived-spaces list.
- The workspace renders the active space tree with the pure `visibleSpaceRows(flattenSpaceTree(spaces), isExpanded)` helper: a collapsed-by-default, expandable tree where a row reveals/hides its whole subtree, leaves show no misleading disclosure control, and each row exposes a `⋮` menu (View details / Edit / Add sub-space / Archive). `flattenSpaceTree` annotates each node with `depth` and `childCount` (direct children). An emoji per type improves scanning; emojis are a presentation-only mapping (`space-emoji.ts`) and are never stored in the domain or database, and are never the only representation of a type. A 2×2 header summary is derived through `GetPropertyWorkspaceOverview` / `summarizeAvailability` (rentable, occupied, upcoming, available), and every active row shows its derived, read-only `SpaceAvailabilityBadge`; the archived-spaces list marks entries `ARCHIVED`. Indicators are recomputed on focus and are never stored.
- Creating a sub-space from the workspace records a one-shot expansion hint (`requestExpandOnNextWorkspaceFocus(propertyId, parentId)` / `consumePendingExpansions(propertyId)`) so the workspace reopens with the new parent expanded. This is a presentation-only, in-memory cross-screen handoff; it is not persisted and must never be treated as state.
- The shared create/edit form (`space-form.tsx`) answers the four questions with labelled sections: **Space type** (a touch-friendly, wrapping grid of tiles, each with the type emoji and localized label; the selected tile gets a border, tinted background and a checkmark), **Space name** (contextual placeholder per type, existing required/trim/uniqueness validation), **Where does it belong?** (the property shown as the root row, selectable by both label and `accessibilityLabel` "Top-level space", with existing active spaces indented by `depth + 1`) and **Can this space be rented on its own?** (two explicit mutually-exclusive Yes/No options with plain-language supporting text, not a raw `rentable` switch). A live summary preview (`{emoji} {name}` + `{parent} · {rentable}`) sits above the actions. The primary action reads `Save space`/`Save changes`; a secondary `Cancel` calls `router.back()`. Saves are synchronous (offline, single SQLite connection), so there is no in-progress window to disable.
- In edit mode the parent picker still allows re-parenting; the container calls `MovePropertySpace` and `UpdatePropertySpace` accordingly. Parent options exclude the space itself, its descendants, archived spaces and spaces of other properties. None of this builds a second hierarchy model: it reuses `flattenSpaceTree` and `collectDescendantIds` from `space-tree.ts`.
- All user-facing text is translated (English/French) through `src/shared/i18n`; localisation follows the mechanism introduced in §20.

### Still deferred

Availability is derived only from Rental Agreements (§23); payments and receipts play no role in Property Management, and the `property_spaces` table deliberately stores no rental data. Deletion remains unsupported in the application: the database rejects physical deletion of a property that owns spaces or of a parent space that still has children, and never cascades.

---

## 22. Tenant management — implemented

The Tenant slice is the sixth vertical slice. A **Tenant** is the person who rents a rentable Property Space. It is an independent entity, not owned by a property or a space.

### Model and invariants

- Fields: `id`, `fullName`, `phone`, `secondPhoneNumber`, `email`, `nationalIdCardNumber`, `notes`, `createdAt`, `updatedAt`, `archivedAt`.
- `fullName` is required, trimmed and non-blank, at most `TENANT_NAME_MAX_LENGTH` (120) characters.
- `phone` / `secondPhoneNumber` are optional and trimmed; a blank value is stored as `null`. Plausibility is advisory, not identity: `isPlausibleTenantPhone` accepts digits plus `+ - ( ) . space` and requires at least one digit.
- `email` is optional and trimmed; `isPlausibleTenantEmail` applies a simple `local@domain.tld` check.
- `nationalIdCardNumber` is optional free text (at most `TENANT_NATIONAL_ID_MAX_LENGTH`, 40). Its **format is not restricted** and leading zeros are preserved by storing it as a string.
- `notes` is optional free text, at most `TENANT_NOTES_MAX_LENGTH` (1000).
- **No `status` column and no permanent delete.** Lifecycle is derived from `archivedAt`: `null` = active, timestamp = archived. Archiving sets `updatedAt = archivedAt`; restoring clears `archivedAt` and sets `updatedAt` to the clock's current instant. Updating preserves identity, `createdAt` and the current lifecycle state.

### Use cases

- `CreateTenant` — validates through the domain, assigns an id, sets `createdAt`/`updatedAt`.
- `GetTenant` — returns `Tenant | null`; a missing id is not an error. Both active and archived tenants are retrievable.
- `ListTenants` / `ListArchivedTenants` — active and archived tenants respectively; the two lists never mix.
- `UpdateTenant`, `ArchiveTenant`, `RestoreTenant` — load by id first and throw `TenantNotFoundError` when absent.
- `UpdateTenant` — follows a partial-update contract for the optional fields (`phone`, `secondPhoneNumber`, `email`, `nationalIdCardNumber`, `notes`): omitting a property (`undefined`) preserves the stored value, while `null` explicitly clears it. An empty or whitespace-only string still normalizes to `null`; a non-empty string is trimmed, validated and replaces the stored value. `fullName` remains required.
- The edit form always submits complete values, so its behaviour is unaffected; the partial-update semantics matter to application callers that omit optional properties.

Domain errors: `InvalidTenantNameError`, `InvalidTenantPhoneError`, `InvalidTenantEmailError`, `InvalidTenantNationalIdError`, `InvalidTenantNotesError`, `TenantAlreadyArchivedError`, `TenantAlreadyActiveError`. Application errors: `TenantNotFoundError`, `ArchiveBlockedByActiveTenantRentalAgreementsError`.

### Rental-agreement boundary (dependency inversion)

As with Property (§20) and Property Space (§21), `ArchiveTenant` must be blocked while the tenant is bound by an active rental agreement. It depends on the application-level port `ActiveTenantRentalAgreementsQuery { hasActiveForTenant(tenantId): boolean }`, bound to `PreventTenantArchiveQuery` now that the Rental Agreement slice has landed (§23); the `NoActiveTenantRentalAgreementsQuery` placeholder has been removed.

### Search and pagination convention (new)

The tenant lists are the first read models that can grow beyond a single screen, so the tenant repository establishes the project's search/pagination contract:

- `TenantRepository.findActive` / `findArchived` take a `TenantSearchCriteria { search; limit; offset }` and return a `TenantPage { tenants; total }` (the unpaginated `total` lets the UI know whether more rows remain).
- `normalizeTenantQuery` is the single place that applies defaults: trimmed `search` (default empty), `offset = 0`, `limit = DEFAULT_TENANT_PAGE_SIZE` (20).
- Search is a case-insensitive substring match over `fullName`, `phone`, `secondPhoneNumber` and `email`. Results are ordered by `createdAt` ascending.
- The active list exposes a search input and a "Load more" control shown only while `tenants.length < total`; the archived list has no search/pagination UI and requests a single large page (`ARCHIVED_LIST_LIMIT = 1000`).

Future list slices should follow this contract unless a genuine need justifies a different one.

### Infrastructure

- Table `tenants` (`src/shared/infrastructure/database/schema/tenants.ts`), created by migration `drizzle/0003_dear_toxin.sql`, with indexes `tenants_full_name_idx` and `tenants_archived_at_idx`.
- `DrizzleTenantRepository` implements the `TenantRepository` port (`save` / `update` / `findById` / `findActive` / `findArchived`) on the synchronous Expo SQLite driver. The pure mapping helpers `toTenantData` / `toTenantRow` are exported and unit-tested without a database (same `expo-sqlite`-under-jest limitation as the other slices).

### Presentation

- Routes in `src/app/tenants/`: `index` (active list), `new` (create), `archived` (archived list), `[tenantId]/index` (details) and `[tenantId]/edit` (edit). Each guards itself with `resolveProtectedRoute` + `authenticationSession.isAuthenticated()`; the `ApplicationRoute` union in `routing.ts` was extended accordingly. Creating a tenant navigates straight to its details (`router.replace('/tenants/${id}')`).
- The dashboard gained a "Manage tenants" entry point. All user-facing text is translated (English/French) through `src/shared/i18n`, and tenant presentation reuses the setup UI primitives from the account module like the other slices.
- Tenant archive and restore ask for confirmation first through the existing `confirmLifecycleAction` helper (native `Alert.alert`, imported from Property presentation rather than duplicated); archive is destructive and states that the tenant and their rental history are preserved, restore is non-destructive. The "New rental agreement" action is hidden on an archived tenant's details; existing tenant information and the rent/history entry point remain available. Rental Agreement business validation is unchanged.

---

## 23. Rental agreement - implemented

A Rental Agreement binds a Tenant to a rentable Property Space. It is the join between the Tenant and Property-management slices and the first slice that reads across module boundaries.

### Model and invariants

- The agreement stores `tenantId`, `spaceId`, `startDate`, optional `endDate`, `rentAmount`, `rentFrequency`, `firstRentDueDate`, optional `securityDepositAmount`, optional `terminationDate`, optional `notes`, `createdAt` and `updatedAt`. The **property is never stored**; it is always derived through the space (`space.propertyId`). `propertyId` is accepted as an input on create/update only to validate it matches the selected space.
- **No `status` column.** Lifecycle is derived on demand from the dates and `Clock::today`: `terminationDate != null` → `TERMINATED`; else `startDate > today` → `UPCOMING`; else `endDate != null && endDate < today` → `ENDED`; else `ACTIVE`.
- `rentAmount` is the amount payable **per `rentFrequency`** (`MONTHLY` | `QUARTERLY` | `HALF_YEARLY` | `YEARLY`); it is never derived from a monthly base and there is no implicit conversion. Amounts are integer **minor units** with no currency column in the MVP.
- `securityDepositAmount` is optional and, when present, must be a positive amount; an empty value means "no deposit" and `0` is rejected.
- Termination preserves the original `endDate` and records an earlier (or equal-day but strictly-before-end) `terminationDate`. **Sealed decision: future-dated termination is allowed** — any valid `terminationDate` on or after `startDate` and strictly before `endDate` is accepted, becomes the effective end date, and shortens the schedule. This resolves the ambiguity left open in the feature prompt (§5); no `cancelUpcoming` path exists.
- **Note (UI rule):** the "Terminate" action is only offered while the agreement is `ACTIVE`; terminating an `UPCOMING` agreement through the "cancellation of upcoming agreements" path is intentionally not exposed. Editing is hidden once `TERMINATED`.

### Conflict rule (ancestor/descendant)

Before a space may be used, the candidate space plus its **ancestors and descendants** are checked. A period conflict exists when any other agreement on those spaces has an overlapping interval, using the **effective end** (`terminationDate ?? endDate`, `null` meaning infinity). Overlap is **inclusive** at the boundaries, and **historical agreements are not exempt**. Siblings and separate tenants do not conflict. Conflicts are reported as `RentalAgreementPeriodConflictError`.

### Lifecycle-derived archiving guards

An agreement blocks archiving while its `effectiveEnd` is `null` or `>= today` (`blocksArchiveOn(today)`). This is wired into the Property, Property Space and Tenant archive use cases through their existing application ports, replacing the earlier always-`false` placeholders (see §20, §21, §22). For a **Property**, the guard considers agreements on **every descendant space at any depth — including archived spaces**: `PreventPropertyArchiveQuery` reads all spaces of the property (`SpaceLookup` returns active + archived rows) so a not-yet-ended agreement on an archived space still blocks the property archive.

### Use cases

`CreateRentalAgreement`, `GetRentalAgreement`, `ListRentalAgreements`, `UpdateRentalAgreement`, `TerminateRentalAgreement` and `GetRentSchedule`. Listing derives each item's lifecycle, resolves tenant/property/space names, supports filtering by lifecycle/tenant/property/space and an offset/limit page (`DEFAULT_RENTAL_AGREEMENT_PAGE_SIZE = 20`, `RentPage { items; total }`).

### Rent schedule (derived, never stored)

`GetRentSchedule` derives due dates from `firstRentDueDate` and the frequency using month-clamped occurrence math (`addCalendarMonths`, so a 31st anchor stays on the last day of shorter months without drifting). The schedule runs to the earlier of the effective end and a `RENT_SCHEDULE_HORIZON_MONTHS = 12` horizon; it exposes `dueDates` and the next due date. No schedule rows are persisted.

### Infrastructure

- Table `rental_agreements` (`src/shared/infrastructure/database/schema/rental-agreements.ts`), created by migration `drizzle/0004_jittery_lightspeed.sql`, with indexes on `tenant_id`, `space_id` and `start_date`. No foreign keys (there is no cascade).
- `DrizzleRentalAgreementRepository` implements the `RentalAgreementRepository` port (`save`/`update`/`findById`/`findAll`/`findOverlapping`) on the synchronous Expo SQLite driver. The pure mapping helpers `toRentalAgreementData`/`toRentalAgreementRow` are exported and unit-tested without a database.
- Cross-module reads go through application ports (`TenantLookup`, `PropertyLookup`, `SpaceLookup`) so the domain never depends on other modules' internals. Writes that create/update/terminate an agreement run inside a `RentalAgreementUnitOfWork` transaction.

### Presentation

- Routes in `src/app/agreements/`: `index` (list with lifecycle filter), `new` (create, accepts optional `tenantId`/`propertyId`/`spaceId` prefill), `[agreementId]/index` (details) and `[agreementId]/edit`. Each guards itself with `resolveProtectedRoute` + `authenticationSession.isAuthenticated()`; the `ApplicationRoute` union in `routing.ts` was extended. Creating navigates to the new agreement's details (`router.replace`); editing returns to details (`router.back`).
- Entry points: the dashboard "Rental agreements" link, plus "New rental agreement" buttons on Tenant details (prefills the tenant) and on Property Space details, shown only for active, rentable spaces (prefills property and space).
- Money is rendered/parsed through `src/shared/presentation/money.ts` (minor units ↔ editable decimal, no float drift). All text is translated (English/French) via `src/shared/i18n`, reusing the account module's setup UI primitives.
- The create/edit form is a single guided flow of four plain-language sections ("Who is renting?", "What are they renting?", "How much is the rent?", "When does the agreement start and end?") followed by a read-only review summary. Every choice renders as a large, high-contrast card whose selected state shows a check mark; each option carries a plain label plus a secondary hint (tenant phone, property address, and for a space its type plus ancestor breadcrumb, indented by depth). Empty states offer the next action (add tenant / add property / manage spaces) rather than an empty list. Money in the summary is formatted through `money.ts`; all text is translated.
- The form owns all field state, per-field validation and a duplicate-submit guard: a `submitting` latch blocks repeat presses and is released only when a field or the mapped error changes, so a failed save stays retryable while a double tap cannot fire twice. The screen passes option lists and callbacks (including the empty-state navigation handlers) and maps thrown use-case errors to messages; presentation never re-implements business rules.
- Locked agreements (already started) show the locked notice, the read-only summary and only the notes field editable. Date entry reuses the existing `YYYY-MM-DD` text-input convention because the project has no date-picker component or native date module; no native picker dependency was added.

## 24. Rent payment management - implemented

Records the money actually received from a tenant against one rental agreement: how much is still owed (overdue, due now, collected this month), full and partial payments, one payment split across several rent periods of the **same** agreement, a never-deleted payment history, and reversals that preserve the original payment.

### Model and invariants

- **Rent instalment** (`domain/installment.ts`) — a persisted rent obligation materialized from an agreement's schedule: `id`, `agreementId`, `dueDate`, `periodIndex`, immutable `amount` snapshot and `createdAt`. Instalments are generated lazily (see viewing window) and an instalment that already carries payment history is never mutated or discarded.
- **Rent payment** (`domain/payment.ts`) — money received for one agreement: `id`, `agreementId`, positive `amount` (minor units), `paymentDate`, `method` (`CASH` | `MOBILE_MONEY` | `BANK_TRANSFER` | `OTHER`), optional `reference`/`notes`, `createdAt`. It is **immutable**: a wrong payment is reversed, never edited or deleted. The `paymentDate` may be dated **before** the agreement's first rent due date (an advance payment); the only date rule is that it is a valid calendar date no later than `today`, and the normal allocation rules still apply.
- **Allocation** (`domain/allocation.ts`) — the many-to-many split linking one payment to the instalments it covers. It always targets instalments of the payment's own agreement, has no duplicate instalment, never exceeds that instalment's remaining balance, and the allocations of one payment must sum exactly to the payment amount.
- **Reversal** (`domain/payment-reversal.ts`) — a separate immutable fact keyed by `paymentId` with a `reason` (`WRONG_AMOUNT` | `WRONG_RENT` | `DUPLICATE` | `OTHER`) and an `explanation` required only when the reason is `OTHER`. At most one reversal exists per payment; it never edits the original and its allocations are excluded from every derived balance.

### Derived status (never stored)

Instalment status is derived on demand from the immutable amount snapshot, the net allocated amount (allocations of reversed payments excluded) and `Clock::today`: `remaining <= 0` → `PAID`; else `today > dueDate` → `OVERDUE`; else some money paid → `PARTIAL`; else `dueDate == today` → `DUE`; else `UPCOMING`. **Overdue wins over partially paid**; a due date equal to today is `DUE`. All comparisons are date-only UTC (see `src/shared/domain/calendar-date.ts`).

### Use cases

`GetRentDashboard`, `GetRentSummary` (one summary per agreement for a tenant), `GetAgreementRent`, `EnsureInstallments`, `ListRentObligations`, `RecordRentPayment`, `ReverseRentPayment`, `ListRentPayments`, `GetRentPayment` and `ResetAgreementInstallments`. Money is always integer minor units; presentation formats through `money.ts`.

### Viewing window (lazy installments) - new decision

The dashboard and tenant/agreement views must show overdue and due obligations without opening each agreement first, but generating a whole agreement's schedule eagerly would create rows that may never be needed. `EnsureInstallments` therefore materializes a **viewing window**: for the dashboard it generates every agreement's periods up to `today`; for a specific agreement it generates the requested window. Generation is idempotent (keyed by agreement + period) and never touches instalments already carrying history.

- For an **open-ended** agreement, the default materialized horizon is a rolling window of `RENT_PAYMENT_GENERATION_HORIZON_MONTHS = 12` months from `today` when no explicit window is requested. Generation stays lazy/on-demand, never exceeds the agreement's effective end, and does **not** end the agreement or remove future obligations. This persisted-installment bound is distinct from the derived schedule horizon `RENT_SCHEDULE_HORIZON_MONTHS = 12` (§23).

### Subscription gate

Recording a payment calls `SubscriptionAccessPolicy.assertCanRecordRentalPayment()` first, so it is blocked (like receipt generation) once the current subscription period has ended. **Reversal is intentionally not gated** — correcting a past mistake must remain possible offline. Rental payments and application-subscription payments stay completely separate concepts.

### Infrastructure

- Tables in `src/shared/infrastructure/database/schema/rent-payments.ts` (`rent_installments`, `rent_payments`, `rent_payment_allocations`, `rent_payment_reversals`), created by migration `drizzle/0005_white_namorita.sql`. Plain text ids + indexes; **no DB-level foreign keys** (consistency is enforced in the domain/application layer). Timestamps are integers, money is integer minor units, dates are date-only text.
- `DrizzleRentPaymentRepository`, `DrizzleRentalAgreementLookup` (reads the `rental_agreements` table read-only; the payment module never imports another module's repository) and `DrizzleRentPaymentUnitOfWork` (a single transaction per write). The composition root (`infrastructure/composition-root.ts`) wires the use cases.
- `RentalAgreementLookup` is the read-only boundary: the payment module depends on its own projection of an agreement (`RentAgreementReference`), not on the rental-agreement module.

### Presentation

- Screens (all under `src/modules/rent-payment-management/presentation/`): **rent dashboard** (overdue / due-now / collected-this-month totals plus the unpaid due/overdue periods that need attention), **agreement rent** and **tenant rent** (per-agreement summaries and their obligations), the **guided record-payment flow**, **payment details** (with the reversal flow) and **payment history** (search by tenant, filter by method; reversed payments stay listed and flagged).
- The record flow is a guided three-step wizard — **Who paid?** (tenant search → agreement pick) → **Money received** (amount, method, date, reference, notes) → **Review** (the oldest-outstanding-first split, seeded by `paymentAllocation.allocatePayment`, each applied amount editable) → **Done** (confirmation, with a link to the saved payment). Saving is blocked until the whole payment is allocated and every amount is valid.
- `presentation/payment-allocation.ts` splits a payment oldest-first across outstanding periods; `presentation/rent-ui.tsx` holds the shared rent UI primitives (`SecondaryButton`, `TextLink`, `RentMessage`, `statusLabel`, `methodLabel`, `reasonLabel`). `presentation/payment-error-message.ts` maps caught errors to translation keys — it deliberately lives in **presentation**, not application, so the application layer stays free of i18n. (Note: its `InvalidRentPaymentReversalError` branch keys off `'explanation'`, matching the domain message.)
- Routes `src/app/rent/{index,record}.tsx`, `src/app/rent/agreements/[agreementId]/{index,pay}.tsx`, `src/app/rent/payments/{index,[paymentId]}.tsx` and `src/app/rent/tenants/[tenantId].tsx`, registered in `src/app/_layout.tsx`; the `ApplicationRoute` union was extended. Entry points: the account dashboard ("Rent") plus optional "Rent" links on Agreement details and Tenant details.

### Boundary and gap

- **Receipts are implemented in their own slice (§25).** The payment module intentionally has no receipt port: recording a payment never generates a receipt. Receipt generation reads rental payments through a separate **read-only** boundary (`ReceiptContextLookup`), so the dependency direction stays payment-owning-data → receipt-reading-data.

---

## 25. Receipt management — implemented

The Receipt slice turns the sealed "receipts are immutable snapshots" model into a working offline-first feature. A receipt is a permanent historical document proving a payment was received; it is generated **manually** from an eligible payment and never changes afterwards.

### Model and invariants

- `Receipt` (domain) carries an immutable **snapshot**: its identity, `receipt_number`, `payment_id`, `agreement_id`, the `language` frozen at generation, and the stored document reference/size plus `created_at`. `Receipt.create` allocates, `hydrate` validates on every read.
- `ReceiptSnapshotData` is a versioned (v1), fully validated JSON blob — receipt number, language, generation date, landlord identity + contact, property, space, tenant, payment (method/reference), per-period allocations, and the logo/signature/stamp appearance used. `validateReceiptSnapshot`/`parseReceiptSnapshot`/`serializedReceiptSnapshot` round-trip strictly; a corrupt stored snapshot is rejected on read and never silently repaired.
- Receipts are generated from a **frozen moment in time**: later edits to settings, tenants, properties, spaces or payments never alter an existing receipt (mirrors §22/§23 archiving immunity — archived records stay readable).
- Receipts are never edited, replaced or deleted through normal application functionality. A reversed payment keeps its already-generated receipt (the details screen shows a reversal warning); a payment that was reversed *before* generation is ineligible.

### Sequential numbers

- Numbers are `RCP-` plus a **lifetime** six-digit counter (`RCP-000001` first), allocated only once and never reused: `formatReceiptNumber` rejects `0`, negatives, non-integers and anything beyond the six-digit range, and `parseReceiptNumber`/`isReceiptNumber` recognize only the exact `^RCP-\d{6}$` pattern.
- Allocation is a single database transaction (`UPDATE + 1` then read back) in `DrizzleReceiptNumberSequenceRepository`, seeded lazily (`onConflictDoNothing`, row `id = 1`) — the same number can never be issued twice even across crashes or concurrent retries. The counter row is the only persistent numbering state (target for future backup/restore).

### One receipt per payment

- The database has a unique index on `receipts.payment_id` (and on `receipts.receipt_number`). `GenerateReceipt` first returns an existing receipt if one is found, so repeated taps, retries and concurrent requests never duplicate. If a racing insert still violates the unique constraint, the new orphan PDF is removed and the stored receipt is returned.
- A receipt is only *finalized* after its PDF has been safely persisted (durable documents directory, not a temp cache path). If persistence fails the row is not saved and nothing is considered finalized.

### GenerateReceipt flow

`assertCanGenerateReceipt` (entitlement) → payment context lookup (rejects unknown/reversed) → best-effort orphan-PDF cleanup → read settings + landlord identity + asset images → allocate number → build snapshot → render PDF → persist PDF → insert row, in one transaction. Missing tenant/property/space raises `ReceiptContextIncompleteError`; a configured but unreadable logo/signature/stamp is **omitted** (with `omittedAssets` reported in the UI) rather than failing generation.

### Read, print, share

- `GetReceipt`, `GetReceiptForPayment` and `ListReceipts` are un-gated reads — receipts stay viewable while expired.
- `PrintReceipt` / `ShareReceipt` act on the saved document and are **not** gated by the subscription; they never mutate the receipt. Document verification happens before the action. A missing document surfaces a clear message. Printing and sharing remain allowed for reversed payments (with the reversal warning shown on the details screen).

### Infrastructure

- `DrizzleReceiptRepository` (rows are `receipts` columns; mapping helpers exported for tests), `DrizzleReceiptUnitOfWork` (runs repository work inside one DB transaction), `DrizzleReceiptNumberSequenceRepository` (§ above).
- `DrizzleReceiptContextLookup` reads the payment, reversal, allocations, tenant, property and space tables through a read-only view and exposes `findByPaymentId` / `isReversed` / `findReversedPaymentIds`. `DrizzleLandlordIdentityLookup` reads the landlord name from `accounts.full_name` (single source of truth — the settings slice stores contact/asset data only, never a duplicate name).
- Documents: `ExpoReceiptDocumentStore` (persists to `receipts/` under the documents directory, `verify`/`remove`/`pruneOrphans`), `ExpoPrintReceiptDocumentGenerator` (HTML → PDF via `Print.printToFileAsync({ base64: true })`), `ExpoReceiptPrinter`, `ExpoReceiptSharer`. `receipt-html.ts` is the pure HTML builder — escaped values, locale labels, `formatFcfaAmount`, embedded asset images as data URIs, and a handwritten signature/stamp space when SAVED mode is not in use. Note: `persist` writes the generator's base64 payload straight into a file under the documents directory — it never `move`s/`copy`s `printToFileAsync`'s temp file, because SDK 57 `expo-file-system` rejects access ("Missing 'READ' permission") to paths outside its own scope (see Expo Go experience-isolated storage).
- `infrastructure/composition-root.ts` wires the use cases (`generateReceipt`, `getReceipt`, `getReceiptForPayment`, `listReceipts`, `printReceipt`, `shareReceipt`, `receiptContextLookup`).
- Migration `drizzle/0006_receipts_and_settings.sql`: `receipts`, `receipt_number_sequence` and `settings` tables. The `settings` row also stores the new receipt-appearance data (see §26).

### Presentation

- Screens (`src/modules/receipt-management/presentation/`): **receipt history** (recent receipts with number/tenant/property/date), **generate receipt** (review of everything that will be frozen, with the finalize confirmation making non-editability explicit), and **receipt details** (snapshot view + print/share, reversal warning, document-missing message). `receipt-error-message.ts` maps errors to translation keys.
- Routes `src/app/receipts/index.tsx`, `src/app/receipts/new.tsx`, `src/app/receipts/[receiptId]/index.tsx`, registered in `_layout.tsx`; the `ApplicationRoute` union was extended. Entry points: the **payment details** screen card (view existing receipt / generate / reversal note) and the dashboard **Receipts** link.
- All receipts text is translated (English/French) through `src/shared/i18n`; PDF labels use the language frozen in the snapshot (`receipt.pdf.*` keys).

### Still deferred

Backup/restore integration for receipt records, snapshots, PDFs and receipt numbering state (existing backup/restore does not yet cover receipts; §10). Cloud services remain out of scope. Printing depends on the printer being available on the device.

---

## 26. Landlord settings (minimal slice) — implemented

A small Settings slice now exists to support receipts and later features, without inventing a full settings framework. The landlord **name** stays on `accounts.full_name`; this slice stores only what the account row does not.

### Model

- `LandlordSettings` (domain, row `id = 1` in `settings`): landlord phone, email and address (nullable), receipt-appearance assets — logo file name, signature file name, stamp file name, and signature/stamp modes (`SAVED` or `MANUAL`). Accessors: `defaults()` (all empty), `withContact(...)`, `withAsset(kind, fileName, mode)`.
- The **mode** records whether an image should be embedded into the PDF (`SAVED`) or a handwritten space left for the landlord to fill in afterwards (`MANUAL`).

### Asset storage

- Images are copied into the documents directory (`assets/`) and referenced by file name in the settings row — never stored as base64. `expo/image-picker` supplies the source; `ExpoReceiptAssetStore` persists `{ fileName, base64 }` image data safely (copy then record, or remove when cleared). `RemoveReceiptAsset` deletes the reference and the file.
- `saveReceiptAsset` / `removeReceiptAsset` apply immediately (the settings screen updates at once); contact fields are editable and committed together via `updateLandlordSettings`.

### Infrastructure & presentation

- `DrizzleLandlordSettingsRepository` (single-row access), `infrastructure/composition-root.ts` wiring `getLandlordSettings` / `updateLandlordSettings` / `saveReceiptAsset` / `removeReceiptAsset`.
- **Settings screen** (`src/modules/settings/presentation/settings-screen.tsx`, route `src/app/settings/index.tsx`, registered in `_layout.tsx`, dashboard link): contact fields + appearance section with pick-image and remove actions per asset, each reflecting its SAVED/MANUAL mode.
- The Receipt slice reads these through `SettingsRepository.get()`; if no settings row exists, defaults are used so receipt generation never breaks.

### Still deferred

Other settings (§8: security preferences, backup settings, currency, default receipt behavior, recovery password) and backup/restore coverage are not implemented.

---

## Screen data refresh (presentation convention)

Every screen that displays persisted data must reflect a successful mutation immediately, without requiring the user to leave and re-enter it.

- Read screens (active list, archived list, Property Workspace, archived spaces list, Property details, Space details) initialize state lazily from a composition-root use case (`useState(() => query.execute())`) and reload the same query on **focus** via `useFocusEffect`, not `useIsFocused()` used as a `useMemo` dependency. A native-stack screen that is covered may not re-render while blurred, so an `isFocused` toggle can be missed; the navigation `focus` event fires regardless. Queries are synchronous, so the reload is synchronous.
- After an in-place mutation that does not navigate away (archive/restore), the handler explicitly runs the same reload so the current screen updates at once.
- A form that pre-fills from a loaded record remounts when the record identity changes via `key` (`key={existing?.id ?? 'create'}`). This re-initializes the fields for a newly loaded record while leaving in-progress input untouched when the same record re-renders (for example after a failed update).

---

## Open decisions (tracked)

These are intentionally not decided yet; leave them minimal and deferred until a genuine requirement exists:

- Exact subscription payment provider.
- Cloud backup provider (Google Drive / OneDrive / Dropbox decisions).
- Exact biometric UX.
- Advanced subscription verification.
- Multi-user support, roles, permissions.
- Synchronization.
- Advanced anti-trial-abuse mechanisms.
- Subscription purchase, payment-provider integration, paid-period creation, and renewal UI (§19 enforces entitlement but does not sell subscriptions).

## Deferred (do not implement now)

- Recovery-password workflow ("Forgot PIN"), biometric unlock, background/timeout auto-lock, authorization, subscription purchase, backup and restore, cloud providers.
- Real-time synchronization infrastructure.
- Any cloud/server dependency for offline-critical workflows.

## Sealed summary (quick checklist)

- One landlord, no roles/permissions, no staff/employee domain.
- Offline-first; local SQLite is the source of truth; cloud is backup/restore only.
- DDD; domain layer free of any framework/infrastructure dependency.
- Vertical-slice, concept-by-concept development; model before implementing.
- Property spaces are the rental units; no separate Rental Unit entity.
- No separate Rent Price entity; rent lives on the Rental Agreement.
- Receipts are immutable snapshots.
- Receipt numbers are a lifetime sequential `RCP-000001`-style six-digit sequence, allocated once and never reused.
- Rental payments and subscription payments are separate flows.
- Subscription is a period (TRIAL | PAID) described by dates; no status column; active period = `startDate <= today <= endDate`.
- The trial is 30 inclusive calendar days: `endDate = startDate + 29 days` (a `2026-10-08` trial ends `2026-11-06`).
- No overlapping subscription periods; sequential periods (starting the day after an end date) are allowed.
- Subscription expiration blocks exactly two operations — recording a rental payment and generating a receipt — via one reusable policy; everything else stays available offline.
- Presentation never touches SQLite directly.
- Expo Router for navigation; every route lives in `src/app/`; non-route code lives outside `src/app/`.
- Application Setup is a workflow only — no installation entity/table; initialization state is derived from whether an account exists.
- During setup, the credential is a 4-digit PIN kept in SecureStore; SQLite writes happen in one synchronous transaction (§17).
- The Expo SQLite sync driver means repositories, use cases and unit of work are synchronous in this codebase (§17).
- Authentication is PIN-only, local and offline: correct PIN → in-memory `AuthenticationSession`; wrong PIN rejected with a retry; no database auth flag, no roles/permissions, no online authentication (§18).
- A Property is the overall physical property (building/estate); Property Spaces are the physical spaces inside it and play the role of rental units (no separate Rental Unit entity). Property names need not be unique.
- Property lifecycle is derived from `archivedAt` (no status column, no permanent delete); archiving is blocked when active rental agreements exist, enforced through the application-level `ActiveRentalAgreementsQuery` port (§20).
- A Property Space is a node in a per-property tree: `id`, `propertyId`, nullable `parentSpaceId`, `name`, controlled `type`, `rentable`, timestamps; lifecycle derived from `archivedAt`; active sibling names unique within the same parent, enforced by both application prechecks and SQLite partial unique indexes (§21).
- A rentable space need not be a leaf and `rentable` is independent of `type`; rental availability is never stored — it is projected with fixed precedence (not rentable → archived/suspended → occupied → upcoming → available) from Rental Agreement occupancy, and ancestor/descendant rental conflicts are enforced by the Rental Agreement module (§21, §23).
- `property_spaces` has database-level integrity: restrictive foreign keys to the owning property and to the same-property parent, a self-parent `CHECK`, and no cascade; migration 0008 preflights existing rows and rolls back atomically on invalid data, while `PRAGMA foreign_keys = ON` is applied to every connection (§15, §21).
- Archiving a space never cascades to its descendants; a parent can only be archived when no active rental agreements exist, via the application-level `SpaceActiveRentalAgreementsQuery` port (§21).
- Localization uses a minimal shared, dependency-free i18n module (`src/shared/i18n`, English/French, `useTranslation`); all new UI text is translated (§20).
- A Tenant is an independent entity (a person) with a required `fullName` and optional phone, second phone, email, national ID card number and notes; national-ID format is unrestricted and leading zeros are preserved; lifecycle is derived from `archivedAt` (no status column, no permanent delete) (§22).
- Archiving a tenant is blocked while active rental agreements exist, via the application-level `ActiveTenantRentalAgreementsQuery` port (§22).
- List reads expose the tenant repository's search/pagination contract: `TenantSearchCriteria { search; limit; offset }` in, `TenantPage { tenants; total }` out, defaults normalised once by `normalizeTenantQuery` (§22).
- A Rental Agreement binds a Tenant to a rentable Property Space; it stores the rent amount **per rent frequency** (integer minor units, no currency column) and never stores the property (derived through the space); lifecycle (`UPCOMING` | `ACTIVE` | `ENDED` | `TERMINATED`) is derived from the dates and today, with no status column (§23).
- Rental agreement period conflicts are checked across the candidate space plus its ancestors and descendants using the effective end (`terminationDate ?? endDate`), inclusive and not exempting historical agreements (§23).
- The rent schedule is derived (never stored) with month-clamped occurrences up to the effective end or a 12-month horizon (§23).
- Persisted rent instalments are materialized lazily; an open-ended agreement defaults to a rolling 12-month generation horizon and an instalment is never mutated once it carries payment history. A rent payment may be dated before the first rent due date (advance payment) as long as it is a valid calendar date no later than today (§24).
- Read screens reload from SQLite on focus (`useFocusEffect`, not `useIsFocused` in a memo) and forms remount on record-identity change via `key`, so successful mutations are visible immediately (Screen data refresh convention).