# ServiceSync Database Setup

## Prerequisites
- PostgreSQL 14 or higher installed
- Database created: `servicesync_dev`

## Quick Setup

### Option 1: Run Master Init Script (Recommended)
```bash
cd backend
psql -U postgres -d servicesync_dev -f init-all-schemas.sql
```

This will apply all schemas in the correct dependency order.

### Option 2: Apply Schemas Individually
If you need to apply schemas one at a time:

```bash
cd backend

# 1. Base schemas
psql -U postgres -d servicesync_dev -f zones-schema.sql
psql -U postgres -d servicesync_dev -f auth-schema.sql

# 2. Schema additions
psql -U postgres -d servicesync_dev -f schema-additions.sql

# 3. Work order enhancements
psql -U postgres -d servicesync_dev -f work-order-status-schema.sql
psql -U postgres -d servicesync_dev -f queue-system-schema.sql

# 4. Vendor and purchasing
psql -U postgres -d servicesync_dev -f purchase-order-schema.sql

# 5. File management
psql -U postgres -d servicesync_dev -f file-attachments-schema.sql

# 6. Equipment tracking
psql -U postgres -d servicesync_dev -f equipment-schema.sql
```

## What Gets Created

### Tables
- `users` - User accounts and authentication
- `customers` - Customer information
- `work_orders` - Service work orders
- `work_order_line_items` - Register/invoice items
- `zones` - Service zones
- `work_order_queues` - Queue management
- `work_order_queue_assignments` - Queue assignments
- `vendors` - Vendor management
- `purchase_orders` - Purchase orders
- `purchase_order_items` - PO line items
- `consignment_stock` - Consignment inventory
- `file_attachments` - File uploads
- `equipment` - Equipment/unit tracking
- `equipment_service_history` - Service history

### Views
- `queue_summary` - Queue stats
- `purchase_order_summary` - PO summaries
- `file_attachments_detail` - File details with user info
- `equipment_detail` - Equipment with customer info
- `equipment_needs_service` - Units needing service

### Functions
- `route_work_order_on_checkout()` - Auto-route to queues
- `move_work_order_to_queue()` - Queue movement
- `receive_purchase_order()` - Auto-add PO to register
- `generate_po_number()` - PO number generation
- `get_work_order_file_stats()` - File statistics
- `get_equipment_service_history()` - Service history

## Troubleshooting

### Error: "relation already exists"
This is normal if schemas were partially applied. The scripts use `IF NOT EXISTS` to handle this safely.

### Error: "column does not exist"
Make sure all schemas are applied in order. Use the master init script.

### Error: "permission denied"
Ensure your PostgreSQL user has CREATE privileges:
```sql
GRANT CREATE ON DATABASE servicesync_dev TO your_user;
```

## Default Data

### Default User
- Employee Number: `22`
- Password: `22`
- **⚠️ CHANGE THIS IMMEDIATELY!**

### Default Vendors
- Duncan Supply (Consignment)
- Grainger (Net 30)
- Ferguson (Net 30)
- Menards (Credit Card)

## Next Steps

After database setup:
1. Start the backend: `cd backend && npm start`
2. Start the frontend: `cd frontend/servicesync-frontend && npm start`
3. Login with employee number `22` / password `22`
4. Change the default password!
