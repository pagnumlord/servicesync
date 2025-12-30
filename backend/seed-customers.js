const API_BASE = 'http://localhost:5000';

const customers = [
  {
    name: "McDonald's - Main Street",
    phone: '765-555-0101',
    email: 'manager@mcdonalds-main.com',
    serviceAddress: '123 Main St',
    serviceCity: 'Indianapolis',
    serviceState: 'IN',
    serviceZip: '46204',
    zone: 'Zone 1',
    customerType: 'Commercial'
  },
  {
    name: "McDonald's - West Side",
    phone: '765-555-0102',
    email: 'manager@mcdonalds-west.com',
    serviceAddress: '456 West Ave',
    serviceCity: 'Indianapolis',
    serviceState: 'IN',
    serviceZip: '46221',
    zone: 'Zone 2',
    customerType: 'Commercial'
  },
  {
    name: "Wendy's - Downtown",
    phone: '765-555-0201',
    email: 'manager@wendys-downtown.com',
    serviceAddress: '789 Center Blvd',
    serviceCity: 'Indianapolis',
    serviceState: 'IN',
    serviceZip: '46202',
    zone: 'Zone 1',
    customerType: 'Commercial'
  },
  {
    name: "Burger King - Eastside",
    phone: '765-555-0301',
    email: 'manager@bk-east.com',
    serviceAddress: '321 East Drive',
    serviceCity: 'Indianapolis',
    serviceState: 'IN',
    serviceZip: '46219',
    zone: 'Zone 3',
    customerType: 'Commercial'
  },
  {
    name: "Subway - Northside",
    phone: '765-555-0401',
    email: 'manager@subway-north.com',
    serviceAddress: '654 North Street',
    serviceCity: 'Carmel',
    serviceState: 'IN',
    serviceZip: '46032',
    zone: 'Zone 4',
    customerType: 'Commercial'
  },
  {
    name: "Chick-fil-A - Keystone",
    phone: '317-555-0501',
    email: 'manager@cfa-keystone.com',
    serviceAddress: '999 Keystone Ave',
    serviceCity: 'Indianapolis',
    serviceState: 'IN',
    serviceZip: '46240',
    zone: 'Zone 2',
    customerType: 'Commercial'
  },
  {
    name: "Starbucks - Circle Centre",
    phone: '317-555-0601',
    email: 'manager@sbux-circle.com',
    serviceAddress: '49 W Maryland St',
    serviceCity: 'Indianapolis',
    serviceState: 'IN',
    serviceZip: '46204',
    zone: 'Zone 1',
    customerType: 'Commercial'
  },
  {
    name: "Panera Bread - Castleton",
    phone: '317-555-0701',
    email: 'manager@panera-castleton.com',
    serviceAddress: '6020 E 82nd St',
    serviceCity: 'Indianapolis',
    serviceState: 'IN',
    serviceZip: '46250',
    zone: 'Zone 3',
    customerType: 'Commercial'
  }
];

async function addCustomer(customer) {
  try {
    const response = await fetch(`${API_BASE}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        service_address: customer.serviceAddress,
        service_city: customer.serviceCity,
        service_state: customer.serviceState,
        service_zip: customer.serviceZip,
        zone: customer.zone,
        customer_type: customer.customerType,
        is_active: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Added: ${customer.name} (${customer.zone})`);
      return { success: true, data };
    } else {
      const error = await response.json();
      console.error(`❌ Failed to add ${customer.name}:`, error.error || error.message);
      return { success: false, error };
    }
  } catch (error) {
    console.error(`❌ Error adding ${customer.name}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function seedCustomers() {
  console.log('🏪 Starting customer seeding...\n');

  let successCount = 0;
  let failCount = 0;

  for (const customer of customers) {
    const result = await addCustomer(customer);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`✅ Successfully added: ${successCount} customers`);
  console.log(`❌ Failed: ${failCount} customers`);
  console.log(`📋 Total: ${customers.length} customers`);
  console.log('\n💡 You can now search for customers like "McDonald", "Wendy", "Starbucks", etc.');
}

seedCustomers().catch(console.error);
