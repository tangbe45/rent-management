# Rental Manager — Architecture

## A. Product scope (IMPLEMENTED)
Offline-first rental management for a single landlord. Excludes Habi Move, property search, transport, marketplace, cloud sync, multi-user roles.

## B. Tech & module boundaries
React Native 0.86, Expo 57, TypeScript, Expo Router, SQLite (source of truth), Drizzle ORM, Expo SecureStore. Modular monolith under src/modules/<feature>/{domain,application,infrastructure,presentation}. Domain has no RN/Expo/SQLite/Drizzle deps (IMPLEMENTED). Application coordinates use cases; infrastructure implements persistence; presentation handles UI/navigation.

## C. Domain model
Property → PropertySpace (hierarchy, rentable flag) IMPLEMENTED. Tenant (archive instead of delete) IMPLEMENTED. RentalAgreement with frequencies monthly/quarterly/half-yearly/yearly, firstRentDueDate anchor, optional endDate IMPLEMENTED. RentalPayment, Receipt IMPLEMENTED. Settings (landlord profile/assets) IMPLEMENTED.

## D. Local data ownership
SQLite owns persistent records; migrations in drizzle/ (8 migrations). Repositories under infrastructure. SecureStore for secrets only. No second source of truth.

## E. Navigation
Root Stack (src/app/_layout.tsx) registers (tabs) plus detail/form/action routes. Auth/onboarding (setup, unlock) outside tabs. (tabs): index (Home/Dashboard), properties, tenants, more. More links to agreements, rent, receipts, settings; reports/security/backup/subscription shown as coming-soon placeholders.

## F. Security & PIN
PIN-based auth (single landlord). SecureStore used. DB at-rest encryption: UNKNOWN/NEEDS VERIFICATION (not claimed).

## G. Payments & receipts
Payments recorded via application workflow; receipts separate; reprint must not create second payment (per docs). Subscription restrictions block new payment recording/receipt creation after expiry.

## H. Backup & restore
Backup module present; encrypted backup/restore details: PARTIALLY IMPLEMENTED/UNKNOWN — verify.

## I. Subscription & trial
30-day inclusive trial; expired users can view records and back up; new payment recording and receipt creation blocked after expiry. State derived from date ranges, not stored status.

## J. Localization & testing
English/French via src/shared/i18n. Checks: npm run typecheck, npm run lint, npm test. Device validation outstanding.
