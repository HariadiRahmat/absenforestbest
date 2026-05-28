# Security Specification: ForestBest Scout (Zero-Trust QR Attendance)

## 1. Data Invariants
- **Core Identity Protection**: Standard members cannot declare themselves or other users as `admin`.
- **Relational Integrity**: Attendance submissions can only be verified if an active QR Code document matching today's date exists with a matching token.
- **Location & Timestamp Audit**: All logs must carry a current server-side timestamp. Client-provided timestamps must be rejected.
- **Dynamic Token Defense**: The dynamic QR token is strictly classified. Members are forbidden from reading the `qr_codes` collection directly; validation must occur transitively in the security rules during attendance creation.

## 2. The "Dirty Dozen" Penetration Attack Payloads
The following payloads model adversarial writes targeting system identity, integrity, and states:

1. **Privilege Escalation Create**: Authenticated scout registers a user profile declaring their `role` as `"admin"`.
2. **Privilege Escalation Update**: Authenticated scout updates their existing user profile changing `role` from `"anggota"` to `"admin"`.
3. **PII Data Collection Harvesting**: Authenticated scout attempts to list user profiles of all other scouts to harvest emails.
4. **Identity Spoofing Attendance**: Scout `user_A` drafts an attendance log under the UID of `user_B` to check them in.
5. **Backdated Attendance Check-in**: Scout attempts to submit an attendance record with a modified `timestamp` from yesterday.
6. **Token Leak Harvest**: Scout attempts to read daily QR documents under `/qr_codes/{date}` to steal the active QR token manually.
7. **Bypass Token Signature Verification**: Scout attempts to write an attendance log with a garbage `qrToken` (not matching Firestore's daily active token).
8. **Double Attendance Check-in**: Scout attempts to submit a secondary attendance record for an already verified check-in.
9. **Update Locked Attendance Logs**: Scout attempts to update a historic attendance record to change GPS coordinates.
10. **Deactivate QR Code**: Scout attempts to update `/qr_codes/{date}` to set `active = false` and deny check-ins for others.
11. **Inject Shadow Payload Field**: Scout attempts to create a user profile containing a malicious shadow field (`isWhitelisted: true`) to bypass other guards.
12. **Poison Document ID**: Scout tries to register with a 1MB junk alphanumeric character sequence as their `userId` document identifier.

## 3. Recommended Firestore Rules Structure
The rules will be evaluated in the following order:
1. Request Authentication checks.
2. Static schema and boundary constraints.
3. Relational validations using `get` and `exists` checks.
