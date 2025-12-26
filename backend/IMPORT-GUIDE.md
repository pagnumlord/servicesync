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

## Next Steps

After importing customers:
1. Review imported data in ServiceSync UI (Customers tab)
2. Add missing information (emails, additional contacts, zones)
3. Update billing addresses if different from service locations
4. Import work orders (separate script coming next)
