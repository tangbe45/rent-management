# Rental Manager — Project Instructions

This is a **mobile rental management application** for a single landlord. It manages properties, property spaces, tenants, rental agreements, rental payments, receipts, landlord profile/signature/stamp, settings, local authentication, backup/restore, and a monthly subscription.

The authoritative development reference is **`docs/DEVELOPMENT.md`**. Follow it; this file summarizes the rules an agent must respect while working.

## Tech stack

- **React Native + Expo + TypeScript** (Expo SDK 57 / RN 0.86 as of the foundation).
- **Expo Router** for navigation. Routes live in `src/app/`; every file there is a screen, `_layout.tsx` defines navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- **SQLite (Expo SQLite) is the local source of truth.** Drizzle ORM is the query layer; the shared connection lives at `src/shared/infrastructure/database/connection.ts`.
- Prefer recommended Expo modules over third-party libraries.

## Expo has changed — do not trust training data

Expo ships breaking changes every SDK release. Before writing code that touches an Expo, EAS, or React Native API:

1. Read the major version of `expo` in `package.json`.
2. Fetch matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt and follow its links. Never answer from memory.

## Commands

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server (do not leave servers running)
npx expo lint               # lint
npx tsc --noEmit            # typecheck (npm run typecheck)
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Rules

1. This is a mobile rental management application.
2. React Native + Expo + Expo Router + TypeScript are the primary technologies.
3. SQLite (Expo SQLite) is the local source of truth; the app is **offline-first**.
4. **DDD is the architectural pattern.** Domain layer must not depend on React Native, Expo, SQLite, Drizzle, PDF, filesystem, or any infrastructure.
5. Business modules are developed as **vertical slices**, one concept at a time. Do not build the whole database or every screen first.
6. Each feature follows `domain/application/infrastructure/presentation` boundaries.
7. Do not bypass `domain`/`application` layers by accessing SQLite directly from presentation. Presentation calls application use cases.
8. Do not introduce server dependencies into offline-critical workflows.
9. Do not invent roles and permissions — the MVP has exactly one landlord.
10. Do not introduce unnecessary abstractions or over-engineering.
11. Do not change sealed domain decisions without explicitly raising the conflict (see `docs/DEVELOPMENT.md` §16).
12. Before implementing a new domain concept, model and discuss it first (concept-first workflow in `docs/DEVELOPMENT.md` §14).
13. Do not implement future concepts prematurely.
14. Keep rental payments and application subscription payments completely separate.
15. Subscription state is determined from subscription date ranges (`startDate <= today <= endDate`), never from a stored status.
16. The application must remain usable offline according to the current subscription period.
17. Internet-dependent integrations (subscription purchase, cloud backup/restore) are deferred until explicitly implemented.
18. Tests focus on business behavior (domain rules, use cases, repository behavior, important UI).
19. Documentation (`docs/DEVELOPMENT.md`) must be updated when important architectural/domain decisions change.
20. Do not leave long-running processes (Metro, dev servers, emulators) running — run only finite setup/validation commands.

## Native & build notes

- If `ios/` and `android/` do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes bundled native modules. After adding a library with native code, the app needs a development build (`npx expo run:ios|android` or `eas build --profile development`).
- EAS serves building, signing, submitting, and OTA updates. Docs: https://docs.expo.dev/eas/index.md