# Security Specification for The Street Co Firestore Rules

## 1. Data Invariants
- Default deny: all collections and documents closed to unauthenticated or unauthorized writes/reads by default.
- Orders: Customer orders are stored with validated orderCode, status, and grandTotalInr. Server operations (creation and update) validate data integrity.
- Newsletter Subscribers: Email strings must be valid and limited in length.
- Support Tickets: Ticket records must have valid ticketId, name, email, and message.
- Admin access: Only designated store admins can inspect all orders and tickets.

## 2. The Dirty Dozen Payloads (Targeting Vulnerabilities)
1. Injecting 2MB string into orderId or ticketId path variables.
2. Writing an order with negative grandTotalInr.
3. Updating order with ghost fields (shadow update).
4. Updating order to change immutable createdAt timestamp.
5. Deleting orders without admin authorization.
6. Reading orders across the entire collection without ownership or admin role.
7. Injecting non-string / malicious payload into newsletter email.
8. Writing support ticket without message or valid name.
9. Modifying support ticket status to invalid terminal state.
10. Unauthenticated write to admin configuration paths.
11. Bypassing size limits with 50KB strings in names or emails.
12. Creating order with missing required fields (orderCode, status).
