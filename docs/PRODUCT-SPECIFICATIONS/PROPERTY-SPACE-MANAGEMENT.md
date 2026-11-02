# Rental Manager — Property & Space Management Specification

**Status:** Product decisions agreed; implementation completed  
**Module:** Property Management  
**Related module:** Rental Agreement Management

## 1. Purpose

Property Management allows a landlord to register and organize physical properties and their rentable spaces.

The module must support flexible property hierarchies, preserve historical records, and provide a clear overview of space availability.

Rental Agreement Management remains the authority for rental lifecycle, occupancy, and agreement conflicts.

## 2. Property model

A Property represents a physical property owned or managed by the landlord.

Existing fields:
- id
- name
- address
- description
- createdAt
- updatedAt
- archivedAt

Rules:
- Name and address are required.
- Property records can be created and edited.
- Archiving is a soft operation.
- Archived properties can be restored.
- Permanent deletion is not supported through normal application workflows.
- Archiving must not delete or modify rental agreements, payments, receipts, or historical records.

## 3. Property Space model

A Property Space represents a physical area within a property.

Existing fields:
- id
- propertyId
- parentSpaceId
- name
- type
- rentable
- createdAt
- updatedAt
- archivedAt

Supported types currently include:
- BUILDING
- FLOOR
- APARTMENT
- STUDIO
- ROOM
- SHOP
- OFFICE
- WAREHOUSE
- OTHER

Rules:
- A property may contain multiple spaces.
- Spaces may contain child spaces.
- Arbitrary hierarchy depth is supported.
- A space must belong to exactly one existing property.
- A parent space must belong to the same property as its child.
- A space cannot be its own parent or create a hierarchy cycle.
- Active sibling names must be unique within their property and parent.
- Rentability is independent of space type.
- A non-rentable parent may contain rentable children.
- A space may only receive rental agreements when it is rentable and all relevant ancestors are active.

## 4. Rentability, occupancy and availability

### Ownership of business rules

Rental Agreement Management owns:
- Agreement lifecycle.
- Effective agreement dates.
- Current occupancy.
- Upcoming agreements.
- Agreement overlap and placement validation.

Property Management must not duplicate these business rules or store occupancy independently.

### Workspace status labels

The Property workspace will display the following initial labels for spaces:

**Occupied**
- A rental agreement is currently active for the space.

**Upcoming**
- A future rental agreement is scheduled and no current agreement takes precedence.

**Available**
- No current or upcoming agreement prevents a new rental.
- The space is active.
- All its ancestors are active.
- The space is rentable.

**Not rentable**
- The landlord has marked the space as non-rentable.

### Status precedence

For presentation purposes, use this precedence:

1. Not rentable.
2. Archived or suspended by an archived ancestor.
3. Occupied.
4. Upcoming.
5. Available.

Archived and suspended states should be visually distinguishable from the four standard occupancy labels.

An occupied space with a future agreement must remain Occupied until its current agreement ends. The future agreement must not incorrectly make it Available.

These indicators are read-only. They must not be stored as additional Property or Property Space fields.

### Property workspace overview

The workspace should:
- Display the space hierarchy.
- Show availability information beside relevant rentable spaces.
- Provide a useful property-level summary of rentable, occupied, upcoming, and available spaces.
- Exclude non-rentable spaces from rentable-space totals.
- Use locally stored agreement data so the overview works offline.

The implementation should retrieve agreement information efficiently rather than performing one query per space.

## 5. Parent and descendant archival behavior

Archiving a parent space does not automatically archive its descendants.

When a parent is archived:
- The parent becomes archived.
- Descendants retain their existing active or archived state.
- Active descendants become suspended from receiving new rental agreements.
- Existing agreements remain intact.
- Payments, receipts, and rental history remain unchanged.

Agreement validation must continue rejecting new agreements placed on a space beneath an archived ancestor.

When the parent is restored:
- Its archived state is cleared.
- Descendants that are still active become eligible for new agreements again, subject to normal rental validation.
- Descendants that were independently archived remain archived.

Archiving must not silently change descendant records.

## 6. Archive and restore confirmations

Add confirmation dialogs for:
- Property archival.
- Property restoration.
- Space archival.
- Space restoration.

For parent-space archival, the confirmation must explain that active descendants will remain in the records but will be suspended from new rental agreements until the parent is restored.

Confirmation dialogs must not replace or bypass application-level validation.

If an archive operation is rejected because of existing rental agreements, show a clear localized explanation.

## 7. Database integrity

Application-level validation and database-level constraints must both protect property-space relationships.

Required relationships:

- `property_spaces.property_id` references an existing `properties.id`.
- `property_spaces.parent_space_id` references an existing parent space.
- The parent and child must belong to the same property.

Prefer a composite foreign key for the parent relationship, referencing the parent's `(id, property_id)`, if supported cleanly by the existing SQLite and Drizzle setup.

Otherwise, evaluate a database trigger that enforces the same invariant.

Requirements:
- Enable SQLite foreign-key enforcement on every database connection.
- Use restrictive deletion behavior.
- Do not introduce cascade deletion.
- Preserve existing partial unique indexes.
- Validate existing data before migration.
- Test migration and rollback/recovery strategy using a database copy.
- Do not assume that adding foreign-key declarations alone enables enforcement.

Normal application workflows must never permanently delete properties or spaces. Archive and restore are their only lifecycle operations.

## 8. Historical integrity

Archiving or restoring a property or space must not:
- Delete rental agreements.
- Modify agreement dates or lifecycle.
- Delete rent payments or allocations.
- Delete reversals.
- Delete receipts or receipt snapshots.
- Delete historical records.

Existing agreements remain governed by Rental Agreement Management.

## 9. Offline behavior

Property and Space Management must remain usable offline.

Availability indicators must use locally available agreement data. No online API or House Search dependency is required.

This specification does not authorize cloud synchronization or changes to the separate House Search application.

## 10. Testing requirements

### Property and space hierarchy
- Create root spaces and nested spaces.
- Reject missing or invalid property references.
- Reject cross-property parent relationships.
- Reject self-parenting and hierarchy cycles.
- Preserve sibling-name uniqueness.
- Support arbitrary hierarchy depth.

### Archival
- Archive a parent with no blocking agreements.
- Preserve descendant records without cascading archival.
- Reject new agreements under archived ancestors.
- Restore a parent and allow still-active descendants to become eligible again.
- Preserve independently archived descendants.
- Reject archival when blocking agreements exist.
- Preserve all financial and agreement history.

### Availability projection
- Correctly display occupied spaces.
- Correctly display upcoming spaces.
- Correctly display available spaces.
- Correctly display non-rentable spaces.
- Correctly display archived and suspended spaces.
- Handle current and upcoming agreements without incorrect precedence.
- Verify that property workspace queries avoid N+1 behavior.
- Verify offline operation.

### Database integrity
- Reject nonexistent property references.
- Reject nonexistent parent references.
- Reject cross-property parent references.
- Restrict physical deletion of referenced records.
- Verify foreign-key enforcement on the actual SQLite connection.
- Verify migration against a copy of existing data.

### Presentation
- Confirm archive/restore dialogs appear.
- Verify cancel does not execute the operation.
- Verify confirmation executes the correct use case.
- Verify localized messages and error handling.

## 11. Explicit scope exclusions

This specification does not authorize:
- A redesign of unrelated modules.
- Changes to rent calculation or payment allocation.
- Changes to receipt generation.
- Changes to subscription rules.
- House Search integration.
- Online synchronization.
- New cloud dependencies.
- Permanent deletion or cascade deletion.
- Storing occupancy or availability as database fields.

## 12. Implementation principles

- Preserve existing working behavior.
- Follow the existing DDD module boundaries.
- Keep Rental Agreement as the owner of rental lifecycle rules.
- Make small, independently testable changes.
- Use migrations for schema changes.
- Never silently modify historical records.
- Run focused tests before broader regression tests.
- Report exact files changed, tests executed, and results.
- Do not stage or commit unrelated changes.