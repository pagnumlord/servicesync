# Fix Database Errors - ServiceSync

This guide will help you fix the current database errors showing in your console.

## Current Errors

1. **Purchase Orders Failing**: `relation "purchase_order_summary" does not exist`
2. **Queue Endpoints Failing**: Queue work orders not loading
3. **JWT Token Expired**: Users with expired tokens getting 500 errors (NOW FIXED in code)

## Root Cause

The database was rebuilt but the schemas haven't been reapplied yet. All the tables and views need to be created.

## Quick Fix (Windows)

### Option 1: Run the Batch Script

1. Open File Explorer and navigate to:
   ```
   C:\Users\karsten\ServiceSync\backend
   ```

2. Double-click on `apply-schemas.bat`

3. Wait for the script to complete

4. Restart your backend server

### Option 2: Manual Command

1. Open PowerShell as Administrator

2. Navigate to the backend directory:
   ```powershell
   cd C:\Users\karsten\ServiceSync\backend
   ```

3. Set the password environment variable:
   ```powershell
   $env:PGPASSWORD="SevenSins58!&"
   ```

4. Run psql to apply schemas:
   ```powershell
   & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d servicesync_dev -f init-all-schemas.sql
   ```

5. Restart your backend:
   ```powershell
   npm start
   ```

## What This Will Fix

After running the schemas, these endpoints will work:

✅ Purchase Orders (`/api/purchase-orders`)
✅ Vendors (`/api/vendors`)
✅ Queue Management (`/api/queues/*`)
✅ File Attachments (`/api/work-orders/:id/attachments`)
✅ Multi-day Scheduling
✅ **NEW: Invoicing** (`/api/invoices`)

## Schemas Being Applied

The `init-all-schemas.sql` file applies schemas in this order:

1. **base-schema.sql** - Core tables (customers, work_orders, technicians)
2. **zones-schema.sql** - Service zones
3. **auth-schema.sql** - User authentication
4. **schema-additions.sql** - Additional fields
5. **work-order-status-schema.sql** - Status tracking
6. **queue-system-schema.sql** - Work order queues
7. **purchase-order-schema.sql** - Purchase orders and vendors
8. **file-attachments-schema.sql** - File management
9. **equipment-schema.sql** - Equipment tracking
10. **multi-day-scheduling-schema.sql** - Multi-day projects
11. **invoicing-schema.sql** - **NEW: Invoicing with QuickBooks integration**

## Verification

After applying schemas, you should see in the terminal output:

```
✅ Zones schema initialized successfully
✅ Work order status schema initialized successfully
✅ Authentication schema initialized successfully
Schema initialization complete!
```

## Still Having Issues?

If you still get errors after running the schemas:

1. Check for error messages in the PowerShell output
2. Make sure PostgreSQL is running (check Services or Task Manager)
3. Verify the password in `.env` matches your PostgreSQL password
4. Try stopping the backend server before applying schemas

## After Schemas Are Applied

Once the schemas are applied successfully:

1. **Restart the backend server** - Stop (Ctrl+C) and run `npm start` again
2. **Refresh your browser** - The frontend should now load without errors
3. **Test the features**:
   - Purchase Orders should load
   - File uploads should work
   - Queues should populate
   - **NEW: Invoices page** should be accessible

## Code Fixes Already Applied

These fixes have been made to the codebase:

✅ **Frontend**: JWT token expiration now handled gracefully - expired tokens will auto-logout
✅ **Backend**: Returns proper 401 status code for expired tokens instead of 500
✅ **Work Order UI**: Improved with card-based layouts for better readability
✅ **Invoicing System**: Complete foundation ready for QuickBooks integration

## Questions?

If you encounter any issues, check:
- The terminal output for specific error messages
- PostgreSQL logs: `C:\Program Files\PostgreSQL\17\data\log\`
- Backend console for connection errors
