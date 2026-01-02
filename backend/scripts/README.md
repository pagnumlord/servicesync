# ServiceSync Backend Scripts

This directory contains utility scripts for managing the ServiceSync database.

## Queue Management

### populate-queues.js

Populates the database with all required work queues.

**Usage:**

```bash
cd backend
npm run setup:queues
```

Or run directly:

```bash
node scripts/populate-queues.js
```

**What it does:**

- Inserts 21 work queues into the `work_order_queues` table
- Uses `ON CONFLICT` to update existing queues without creating duplicates
- Assigns appropriate colors to each queue for visual differentiation
- Sets display order for consistent queue ordering
- Verifies all queues were inserted successfully

**Queues Created:**

1. Blaine Quoting
2. Call Backs
3. Invoice Review
4. Jen M Quoting
5. Jen M Sent/Sold
6. Jen W Review/Hold
7. Jerry Follow-Up
8. Josh Quoting/Working
9. Josh Review
10. Josh Service Estimates
11. Mikes Follow-up
12. Needs Parts
13. Needs Return Trip
14. Pending Projects
15. PM
16. PM Quoting
17. PM Scheduling
18. Rational
19. RFS Mistake
20. Warranty Review
21. WFU - Jen M

**Requirements:**

- PostgreSQL database must be running
- `.env` file must be configured with database credentials
- `work_order_queues` table must exist (run queue-system-schema.sql first)

**Safe to Re-run:**

Yes! The script uses `ON CONFLICT` handling, so it will update existing queues rather than creating duplicates. You can safely re-run this script to update queue colors or display order.
