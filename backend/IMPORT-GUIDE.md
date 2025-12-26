# Vision to ServiceSync Import Guide

## Customer Import

### Prerequisites

1. Export customer list from Vision as Excel (.xlsx)
2. Place the file in `backend/importstuff/` folder
3. Install dependencies: `npm install` (includes xlsx package)

### Running the Import

From the `backend` folder:

```bash
# Import from default location (importstuff/CustomersList.xlsx)
node import-customers.js

# Or specify a custom file path
node import-customers.js ./importstuff/YourCustomerFile.xlsx
```

### What Gets Imported

The script maps Vision columns to ServiceSync fields:

| Vision Column      | ServiceSync Field        | Notes                           |
|--------------------|--------------------------|----------------------------------|
| Full Name          | name                     | Primary business name            |
| Customer #         | customer_number          | Unique customer identifier       |
| Address            | service_address_line1    | Service location address         |
| City               | service_city             | Service location city            |
| State              | service_state            | Service location state           |
| Contact            | primary_contact_name     | Main contact person              |
| Phone #            | phone                    | Formatted as (XXX) XXX-XXXX      |
| Customer Balance   | balance_due              | Outstanding balance              |
| Location           | zone                     | Service zone/area                |
| Opened             | created_at               | Customer creation date           |

### Import Behavior

- **Duplicates**: Skipped if customer_number or name already exists
- **Phone formatting**: Automatically formats 10-digit numbers
- **Billing address**: Set to "same as service" by default
- **Status**: All imported customers set as active

### Output

The script provides real-time feedback:
- ✅ Successfully imported customers
- ⏭️  Skipped duplicates
- ❌ Errors with details
- 📊 Final summary

### Example Output

```
🚀 Starting customer import from Vision...

📄 Reading file: ./importstuff/CustomersList.xlsx
📊 Found 45 customers to import

✅ Imported: 1st Class Fundraisers (2)
✅ Imported: 6th Street Dive (3)
⏭️  Skipping "Acacia" (already exists)
...

============================================================
📊 Import Summary:
============================================================
✅ Successfully imported: 42
⏭️  Skipped (duplicates):  3
❌ Errors:                0
📋 Total processed:       45
============================================================

✨ Import complete!
```

### Troubleshooting

**Problem: "Cannot find module 'xlsx'"**
- Solution: Run `npm install` in the backend folder

**Problem: File not found**
- Solution: Check the file path and ensure it's in the importstuff folder

**Problem: Database connection error**
- Solution: Verify .env file has correct database credentials

**Problem: Duplicate customers**
- Solution: The script safely skips duplicates - this is normal if reimporting

---

## Work Order Import

### Prerequisites

1. **Import customers FIRST** - Work orders link to existing customers
2. Export work order list from Vision as Excel (.xlsx)
3. Place the file in `backend/importstuff/` folder
4. Ensure xlsx package is installed: `npm install`

### Running the Import

From the `backend` folder:

```bash
# Import work orders
node import-work-orders.js importstuff/WorkOrdersList.xlsx
```

### What Gets Imported

The script maps Vision work order data to ServiceSync fields:

| Vision Column      | ServiceSync Field        | Notes                           |
|--------------------|--------------------------|----------------------------------|
| WO #               | wo_number                | Unique work order identifier     |
| Customer           | customer_name            | Links to existing customer       |
| Date               | scheduled_date           | Service/completion date          |
| Type               | call_type                | Service Call, PM, Install, etc.  |
| Type               | equipment_type           | Extracted from type (e.g., "Refrigeration") |
| Status             | status                   | Active, Completed, Suspended     |
| Description/Notes  | problem_description      | Problem details and notes        |
| Amount             | internal_notes           | Stored for reference             |
| Hours              | internal_notes           | Stored for reference             |

### Call Type Mapping

Vision types are automatically mapped:
- `.Service - [Equipment]` → **Service Call**
- `Preventive Maintenance` / `PM` → **Preventive Maintenance**
- `Install` → **Install**
- `Estimate` → **Estimate**

### Status Mapping

Vision statuses are converted:
- `Completed` / `Complete` → **Completed**
- `Open` / `Active` → **Active**
- `Suspended` → **Suspended**
- `Cancelled` / `Deleted` → **Deleted**

### Import Behavior

- **Customer Matching**: Automatically links to existing customers by name
- **Duplicates**: Skipped if WO# already exists
- **Equipment Type**: Extracted from call type (e.g., "Refrigeration", "Cooking")
- **Completion Dates**: Auto-set for completed work orders
- **Vision Amounts**: Stored in internal_notes for reference

### Output

Real-time feedback during import:
- ✅ Successfully imported work orders
- 🔵 Active work orders
- ⏸️ Suspended work orders
- ⏭️ Skipped duplicates
- ⚠️ Customer not found warnings
- ❌ Errors with details
- 📊 Final summary

### Example Output

```
🔧 Vision Work Order Import Starting...

📂 Reading file: importstuff/WorkOrdersList.xlsx

📊 Found 127 work orders in file

────────────────────────────────────────────────────────────────────────────────
✅ Imported: WO 30293 - 1st Class Fundraisers (Service Call)
✅ Imported: WO 28003 - Alpha Xi Delta (Service Call)
🔵 Imported: WO 30304 - Bauer Head Start (Preventive Maintenance)
⏭️  Skipping WO 27182 (already exists)
⚠️  WO 30305: Customer "XYZ Corp" not found in database
────────────────────────────────────────────────────────────────────────────────

📈 Import Summary:
   ✅ Imported: 124 work orders
   ⏭️  Skipped:  2 work orders (duplicates or missing data)
   ❌ Errors:   1 work orders

✨ Vision work order import complete!
```

### Troubleshooting

**Problem: "Customer not found in database"**
- Solution: Import customers FIRST using `import-customers.js`
- Work orders will still import but won't be linked to a customer

**Problem: Duplicate work orders**
- Solution: Script safely skips duplicates - normal if reimporting

**Problem: Missing work order numbers**
- Solution: Rows without WO# are automatically skipped

**Problem: Dates not parsing correctly**
- Solution: Ensure Vision export has dates in M/D/YYYY format or Excel date format

### After Import

1. Review imported work orders in ServiceSync UI
2. Verify customer linkages (check for unmatched customers)
3. Assign technicians to open work orders
4. Review and update equipment types if needed
5. Add any missing notes or details

---

## Next Steps

After importing customers and work orders:
1. Review imported data in ServiceSync UI
2. Verify customer-work order linkages
3. Update missing information (technicians, equipment details)
4. Import inventory/parts data (if needed)
5. Start using ServiceSync for new work orders!
