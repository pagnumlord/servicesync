const API_BASE = 'http://localhost:5000';

// Create a few test work orders with equipment types based on the screenshots
const testWorkOrders = [
  {
    customerId: 1, // McDonald's - Main Street
    problemDescription: 'Steamer not heating properly, needs inspection',
    equipmentType: 'Steamer',
    callType: 'Time and Material',
    callUrgency: 'Default',
    callRate: 'RT',
    scheduledDate: '2025-12-30'
  },
  {
    customerId: 3, // Wendy's - Downtown
    problemDescription: 'Ice machine making loud noises and ice production is slow',
    equipmentType: 'Ice Machine',
    callType: 'Time and Material',
    callUrgency: 'Urgent',
    callRate: 'RT',
    scheduledDate: '2025-12-30'
  },
  {
    customerId: 2, // McDonald's - West Side
    problemDescription: 'Walk-in cooler temperature fluctuating',
    equipmentType: 'Walk-in Cooler',
    callType: 'Time and Material',
    callUrgency: 'Default',
    callRate: 'RT',
    scheduledDate: '2025-12-30'
  },
  {
    customerId: 4, // Burger King - Eastside
    problemDescription: 'Fryer not maintaining temperature, keeps shutting off',
    equipmentType: 'Fryer',
    callType: 'Time and Material',
    callUrgency: 'Emergency',
    callRate: 'RT',
    scheduledDate: '2025-12-30'
  },
  {
    customerId: 6, // Chick-fil-A - Keystone
    problemDescription: 'Oven door seal needs replacement',
    equipmentType: 'Oven',
    callType: 'Time and Material',
    callUrgency: 'Default',
    callRate: 'RT',
    scheduledDate: '2025-12-30'
  },
  {
    customerId: 5, // Subway - Northside
    problemDescription: 'Reach-in cooler compressor running constantly',
    equipmentType: 'Reach-in Cooler',
    callType: 'Time and Material',
    callUrgency: 'Default',
    callRate: 'RT',
    scheduledDate: '2025-12-30'
  }
];

async function createWorkOrder(wo) {
  try {
    const response = await fetch(`${API_BASE}/api/work-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wo)
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Created WO #${data.wo_number || data.id}: ${wo.equipmentType} at customer ${wo.customerId}`);
      return { success: true, data };
    } else {
      const error = await response.json();
      console.error(`❌ Failed to create work order:`, error.error || error.message);
      return { success: false, error };
    }
  } catch (error) {
    console.error(`❌ Error creating work order:`, error.message);
    return { success: false, error: error.message };
  }
}

async function seedTestWorkOrders() {
  console.log('🔧 Creating test work orders with equipment types...\n');

  let successCount = 0;
  let failCount = 0;

  for (const wo of testWorkOrders) {
    const result = await createWorkOrder(wo);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n📊 Work Order Creation Summary:');
  console.log(`✅ Successfully created: ${successCount} work orders`);
  console.log(`❌ Failed: ${failCount} work orders`);
  console.log(`📋 Total: ${testWorkOrders.length} work orders`);
  console.log('\n💡 These work orders will appear in the Unassigned column.');
  console.log('   Hover over them to see tech recommendations based on equipment type!');
}

seedTestWorkOrders().catch(console.error);
