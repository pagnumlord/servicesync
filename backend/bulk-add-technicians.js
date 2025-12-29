const API_BASE = 'http://localhost:5000';

const technicians = [
  { firstName: 'Adam', lastName: 'Bentley', phone: '765-437-3781', crew: 'HVAC', vanNumber: '25' },
  { firstName: 'Aiden', lastName: 'Spoor', phone: '317-500-6665', crew: 'Apprentice', vanNumber: '3' },
  { firstName: 'Bailey', lastName: 'Brown', phone: '765-652-8255', crew: 'Refrigeration', vanNumber: '9' },
  { firstName: 'Blaine', lastName: 'Schultz', phone: '765-418-5642', crew: 'Project', vanNumber: '7' },
  { firstName: 'Bridget', lastName: 'Beres', phone: '765-714-0221', crew: 'Hot Side', vanNumber: '8' },
  { firstName: 'Chris', lastName: "O'Toole", phone: '765-491-4731', crew: 'PM', vanNumber: '21' },
  { firstName: 'David', lastName: 'Whipple', phone: '765-250-0466', crew: 'Refrigeration', vanNumber: '4' },
  { firstName: 'Dennis', lastName: 'Oland', phone: '765-479-3302', crew: 'Hot Side', vanNumber: '1' },
  { firstName: 'Gabe', lastName: 'MoraMora', phone: '765-242-4515', crew: 'Refrigeration', vanNumber: '22' },
  { firstName: 'Jaden', lastName: 'Hewitt', phone: '765-337-4071', crew: 'Hot Side', vanNumber: '16' },
  { firstName: 'Jeff', lastName: 'Delaney', phone: '765-337-4071', crew: 'Hot Side', vanNumber: '23' },
  { firstName: 'Jordon', lastName: 'Serrano', phone: '765-430-7924', crew: 'Ice Machines', vanNumber: '13' },
  { firstName: 'Michael', lastName: 'Lanham', phone: '765-761-7960', crew: 'Hot Side', vanNumber: '10' },
  { firstName: 'Tamaka', lastName: 'Bissari', phone: '317-370-8323', crew: 'PM', vanNumber: '11' },
  { firstName: 'Tim', lastName: 'Rushdan', phone: '708-378-0297', crew: 'PM', vanNumber: '' }
];

async function addTechnician(tech) {
  try {
    const response = await fetch(`${API_BASE}/api/technicians`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        first_name: tech.firstName,
        last_name: tech.lastName,
        phone: tech.phone,
        crew: tech.crew,
        van_number: tech.vanNumber || null
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Added: ${tech.firstName} ${tech.lastName} (${tech.crew} - Van ${tech.vanNumber})`);
      return { success: true, data };
    } else {
      const error = await response.json();
      console.error(`❌ Failed to add ${tech.firstName} ${tech.lastName}:`, error.error || error.message);
      return { success: false, error };
    }
  } catch (error) {
    console.error(`❌ Error adding ${tech.firstName} ${tech.lastName}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function bulkAddTechnicians() {
  console.log('🚀 Starting bulk technician import...\n');

  let successCount = 0;
  let failCount = 0;

  for (const tech of technicians) {
    const result = await addTechnician(tech);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Import Summary:');
  console.log(`✅ Successfully added: ${successCount} technicians`);
  console.log(`❌ Failed: ${failCount} technicians`);
  console.log(`📋 Total: ${technicians.length} technicians`);
}

// Run the bulk import
bulkAddTechnicians().catch(console.error);
