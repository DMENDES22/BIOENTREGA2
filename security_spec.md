# Security Specification for BioEntregas (Firestore ABAC and Zero-Trust validation)

This specification defines the strict constraints, roles, data invariants, and access levels enforced on BioEntregas collections `/deliveries/{deliveryId}` and `/users/{userId}`.

## 1. Data Invariants

1. **Identity & Authentication**: No anonymous operations. Users must be fully authenticated with Google Firebase Auth.
2. **Role Boundaries (ABAC)**:
   - `ADMIN` profiles (identified in the system, or having administrative emails, or alocated in `/users/{userId}`) can create new delivery documents, modify all fields, delete or view histories.
   - `DRIVER` profiles can read the deliveries assigned to them, and can ONLY update the `status`, `notes`, `receiverName`, `photo`, `gpsLocation`, and `occurrences` array. They are strictly forbidden from modifying core payload fields like `invoiceNumber`, `volumes`, `clientName`, or `address`.
3. **Temporal Integrity**: Time fields like `createdAt` and `updatedAt` must sync with the secure Firestore transaction time (`request.time`).
4. **Validation Blueprints**:
   - Deliveries must contain positive volumes `>= 1`.
   - When marking `status` as `ENTREGUE`, `receiverName` and optionally `gpsLocation` must be supplied.
   - Values of `status` must strictly map to `['PENDENTE', 'EM_ROTA', 'ENTREGUE', 'PROBLEMA']`.
5. **No Blind Updates**: Drivers can only affect a finite list of keys during specific status transitions.
6. **No Self-Assigned Privileges**: Users cannot change their own roles in `/users/{userId}` to turn themselves into administrators.

---

## 2. The "Dirty Dozen" Payloads (Malicious Operations)

Here are the 12 attack vectors designed to fail authorization checks under the fortress security rules.

### Delivery Collection Attacks (`/deliveries/{deliveryId}`)

1. **Anonymously Create Delivery**: Unauthenticated actor tries to write a delivery.
2. **Driver Self-Registers High Volumes**: A driver creates a delivery assigning themselves as the operator.
3. **Admin Invoice Modification by Driver**: Carlos (Driver) attempts to edit the `invoiceNumber` (NF) of a dispatched cargo.
4. **Volume Over-inflation**: Carlos (Driver) updates `volumes` to `999` on his route.
5. **Atypical Client Name Injection**: A compromised account tries to inject massive script scripts or 1MB string inside the `clientName`.
6. **Terminal Status Bypass**: Carlos tries to change `status` from `ENTREGUE` back to `PENDENTE` to erase a logged receipt.
7. **Bypass Temporal Controls**: A write payload trying to override `createdAt` to a historical time.
8. **Malicious ID Injection**: A path variable of 1.5KB junk characters like `match /deliveries/../../malicious` used to poison routes.
9. **Receiver Deletion**: A driver tries to update a delivery file, clearing the `receiverName` string to `""` or `null` while stating `ENTREGUE`.

### User Profile Attacks (`/users/{userId}`)

10. **Self-Promotion to ADMIN**: Driver Carlos tries to edit `/users/carlos-uid` to set his `"role"` to `"ADMIN"`.
11. **Hijack Profile Data**: Carlos tries to modify Marcos's profile settings at `/users/marcos-uid`.
12. **PII Collection Leak**: An unauthenticated user requests to list all profiles in `/users` or query other driver schedules.

---

## 3. The Test Runner Structure (`firestore.rules.test.ts` Draft)

Since we are testing this iteratively, our test runner outline validates that all 12 dirty payloads result in `PERMISSION_DENIED`:

```typescript
// Test suites for verification
describe("BioEntregas Fortress Rules", () => {
  it("rejects anonymous writes to /deliveries", () => {
    assertDenies(anonymousUser.collection('deliveries').add(payload1));
  });
  it("blocks driver self-promoting to admin role", () => {
    assertDenies(driverCarlosUser.doc('users/carlos-uid').update({ role: 'ADMIN' }));
  });
  it("blocks driver updating core fields (invoiceNumber)", () => {
    assertDenies(driverCarlosUser.doc('deliveries/del-1').update({ invoiceNumber: '999999' }));
  });
});
```
