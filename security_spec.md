# Security Specification — Administrasi Guru Cloud Sync

## 1. Data Invariants
1. Every workspace document (`/teachers/{teacherId}`) and all subcollection records (`students`, `schedules`, `attendance`, `notes`, `grades`, `holidays`) belong strictly to a single verified Google-authenticated user (`request.auth.uid == teacherId` and `request.auth.token.email_verified == true`).
2. `ownerId` and `createdAt` are immutable after document creation.
3. All `createdAt` and `updatedAt` timestamps must equal `request.time` (server timestamp).
4. Subcollection records cannot exist without their parent `/teachers/{teacherId}` document (`exists(...)` on `create`), and single-document reads/updates/deletes verify parent ownership via `get()`.
5. Every `allow list` rule enforces `isOwner(teacherId) && resource.data.ownerId == request.auth.uid` without issuing `get()` or `exists()` reads.
6. All string fields enforce explicit `.size()` boundaries matching `firebase-blueprint.json`.

## 2. Adversarial Payloads ("Dirty Dozen")
1. **Unauthenticated read**: Unauthenticated client attempts `get(/teachers/uid1)` -> DENIED.
2. **Unverified email write**: Auth token with `email_verified: false` attempts `create(/teachers/uid1)` -> DENIED.
3. **Cross-tenant read/write**: User `uid2` attempts to read or write `/teachers/uid1/students/std-1` -> DENIED.
4. **Identity spoofing**: User `uid1` sets `ownerId: "uid2"` inside `/teachers/uid1/students/std-1` -> DENIED.
5. **Shadow field injection**: User `uid1` includes extra field `isAdmin: true` in `StudentDoc` -> DENIED (`keys().hasOnly(...)`).
6. **Immutable `createdAt` tampering**: User `uid1` updates `createdAt` on an existing `NoteDoc` -> DENIED.
7. **Forged client timestamp**: User `uid1` submits client `Date` instead of `request.time` for `updatedAt` -> DENIED.
8. **ID poisoning**: User `uid1` uses a 500-character document ID or invalid characters (`../bad`) -> DENIED (`isValidId`).
9. **Oversized payload (Denial of Wallet)**: User `uid1` submits a 20,000-character `materi` field -> DENIED.
10. **Invalid enum value**: User `uid1` writes `status: "Bolos"` to `AttendanceDoc` -> DENIED.
11. **Array boundary violation**: User `uid1` writes `tugas: [90, 80]` (length 2 instead of 11) to `GradeDoc` -> DENIED.
12. **Orphaned subcollection write**: User `uid1` creates `/teachers/uid1/students/std-1` before `/teachers/uid1` exists -> DENIED.
