# PostgreSQL Authentication Fix Guide

## Problem
The backend is getting "password authentication failed for user 'postgres'" errors even though:
- The `.env` file has the correct password (`postgres`)
- pgAdmin can connect successfully with the same password
- The database exists and is running

## Root Cause
PostgreSQL on Windows uses a configuration file called `pg_hba.conf` that controls **how** clients authenticate. pgAdmin might be using a different authentication method than the Node.js `pg` library.

## Quick Fix

### Option 1: Run the automated helper (Recommended)
1. Open Command Prompt or PowerShell **as Administrator**
2. Navigate to the backend folder:
   ```
   cd C:\Users\karsten\ServiceSync\backend
   ```
3. Run the fix helper:
   ```
   fix-postgres-auth.bat
   ```
4. Follow the on-screen instructions

### Option 2: Manual fix
1. **Locate pg_hba.conf**
   - Path: `C:\Program Files\PostgreSQL\17\data\pg_hba.conf`

2. **Open as Administrator**
   - Right-click Notepad → "Run as administrator"
   - Open the file: `C:\Program Files\PostgreSQL\17\data\pg_hba.conf`

3. **Find the authentication lines**
   Look for lines near the bottom that look like:
   ```
   # TYPE  DATABASE        USER            ADDRESS                 METHOD
   host    all             all             127.0.0.1/32            scram-sha-256
   host    all             all             ::1/128                 scram-sha-256
   ```

4. **Change the METHOD to md5**
   ```
   # TYPE  DATABASE        USER            ADDRESS                 METHOD
   host    all             all             127.0.0.1/32            md5
   host    all             all             ::1/128                 md5
   ```

5. **Save the file**

6. **Restart PostgreSQL**
   - Press `Windows + R`
   - Type: `services.msc`
   - Find "postgresql-x64-17" in the list
   - Right-click → "Restart"

7. **Test the connection**
   ```
   cd C:\Users\karsten\ServiceSync\backend
   node test-db-connection.js
   ```

## Why This Works

- **scram-sha-256**: More secure but requires specific client support
- **md5**: Older but widely supported password authentication
- **trust**: No password (NOT recommended for production)

The Node.js `pg` library works better with `md5` authentication on Windows installations.

## After Fixing

Once the connection works:
1. Restart your backend server
2. The authentication system should work properly
3. You'll be able to log in with Employee #22, password "22"

## Testing the Fix

Run the diagnostic tool to verify:
```bash
cd backend
node test-db-connection.js
```

You should see:
```
✅ Connection successful (no SSL)!
✅ All tests passed! Database connection is working.
```

## Still Having Issues?

If the above doesn't work:

1. **Check if PostgreSQL is running**
   - Open Services (services.msc)
   - Find "postgresql-x64-17"
   - Status should be "Running"

2. **Verify database exists**
   - Open pgAdmin
   - Check that "servicesync_dev" database exists

3. **Check .env file**
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=servicesync_dev
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```

4. **Try temporary trust method** (testing only!)
   - Change `md5` to `trust` in pg_hba.conf
   - Restart PostgreSQL
   - If this works, the issue is definitely with password authentication
   - Change back to `md5` after testing!
