// Seed some initial technician skills for testing the recommendation system
const API_BASE = 'http://localhost:5000';

// Define equipment expertise based on crews
const techSkills = [
  // Dennis Oland - Hot Side expert, especially steamers
  { techId: 8, equipmentType: 'Steamer', proficiency: 5, certified: true },
  { techId: 8, equipmentType: 'Oven', proficiency: 5, certified: true },
  { techId: 8, equipmentType: 'Fryer', proficiency: 4, certified: false },
  { techId: 8, equipmentType: 'Griddle', proficiency: 4, certified: false },

  // David Whipple - Refrigeration expert
  { techId: 7, equipmentType: 'Walk-in Cooler', proficiency: 5, certified: true },
  { techId: 7, equipmentType: 'Reach-in Cooler', proficiency: 5, certified: true },
  { techId: 7, equipmentType: 'Ice Machine', proficiency: 4, certified: true },
  { techId: 7, equipmentType: 'Freezer', proficiency: 5, certified: true },

  // Bailey Brown - Refrigeration
  { techId: 3, equipmentType: 'Walk-in Cooler', proficiency: 4, certified: true },
  { techId: 3, equipmentType: 'Reach-in Cooler', proficiency: 4, certified: false },
  { techId: 3, equipmentType: 'Ice Machine', proficiency: 3, certified: false },

  // Gabe MoraMora - Refrigeration
  { techId: 9, equipmentType: 'Walk-in Cooler', proficiency: 4, certified: true },
  { techId: 9, equipmentType: 'Freezer', proficiency: 4, certified: true },
  { techId: 9, equipmentType: 'Ice Machine', proficiency: 4, certified: false },

  // Michael Lanham - Hot Side
  { techId: 13, equipmentType: 'Fryer', proficiency: 5, certified: true },
  { techId: 13, equipmentType: 'Griddle', proficiency: 4, certified: false },
  { techId: 13, equipmentType: 'Oven', proficiency: 4, certified: false },

  // Jaden Hewitt - Hot Side
  { techId: 10, equipmentType: 'Steamer', proficiency: 3, certified: false },
  { techId: 10, equipmentType: 'Oven', proficiency: 4, certified: false },
  { techId: 10, equipmentType: 'Griddle', proficiency: 3, certified: false },

  // Jeff Delaney - Hot Side
  { techId: 11, equipmentType: 'Fryer', proficiency: 4, certified: true },
  { techId: 11, equipmentType: 'Griddle', proficiency: 4, certified: false },

  // Bridget Beres - Hot Side
  { techId: 5, equipmentType: 'Steamer', proficiency: 4, certified: true },
  { techId: 5, equipmentType: 'Oven', proficiency: 3, certified: false },

  // Jordon Serrano - Ice Machines specialist
  { techId: 12, equipmentType: 'Ice Machine', proficiency: 5, certified: true },
  { techId: 12, equipmentType: 'Reach-in Cooler', proficiency: 3, certified: false },

  // Chris O'Toole - PM generalist
  { techId: 6, equipmentType: 'Walk-in Cooler', proficiency: 3, certified: false },
  { techId: 6, equipmentType: 'Oven', proficiency: 3, certified: false },
  { techId: 6, equipmentType: 'Fryer', proficiency: 3, certified: false },

  // Tamaka Bissari - PM generalist
  { techId: 14, equipmentType: 'Walk-in Cooler', proficiency: 3, certified: false },
  { techId: 14, equipmentType: 'Ice Machine', proficiency: 3, certified: false },

  // Tim Rushdan - PM generalist
  { techId: 15, equipmentType: 'Fryer', proficiency: 3, certified: false },
  { techId: 15, equipmentType: 'Griddle', proficiency: 3, certified: false },

  // Adam Bentley - HVAC specialist
  { techId: 1, equipmentType: 'HVAC Unit', proficiency: 5, certified: true },
  { techId: 1, equipmentType: 'Walk-in Cooler', proficiency: 4, certified: true },

  // Blaine Schultz - Project specialist
  { techId: 4, equipmentType: 'Walk-in Cooler', proficiency: 4, certified: true },
  { techId: 4, equipmentType: 'HVAC Unit', proficiency: 3, certified: false },
];

async function addSkill(skill) {
  try {
    const response = await fetch(`${API_BASE}/api/technicians/${skill.techId}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skillCategory: 'equipment_type',
        skillName: skill.equipmentType,
        proficiencyLevel: skill.proficiency,
        certified: skill.certified,
        certificationDate: skill.certified ? '2024-01-01' : null,
        notes: `Initial skill data - ${skill.certified ? 'Certified' : 'Not certified'}`
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Added skill: Tech ${skill.techId} - ${skill.equipmentType} (${skill.proficiency}⭐)`);
      return { success: true };
    } else {
      const error = await response.json();
      console.error(`❌ Failed to add skill for Tech ${skill.techId}:`, error.error);
      return { success: false };
    }
  } catch (error) {
    console.error(`❌ Error adding skill for Tech ${skill.techId}:`, error.message);
    return { success: false };
  }
}

async function seedSkills() {
  console.log('🌱 Starting technician skills seeding...\n');

  let successCount = 0;
  let failCount = 0;

  for (const skill of techSkills) {
    const result = await addSkill(skill);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`✅ Successfully added: ${successCount} skills`);
  console.log(`❌ Failed: ${failCount} skills`);
  console.log(`📋 Total: ${techSkills.length} skills`);
  console.log('\n💡 Now you can test recommendations:');
  console.log('   GET /api/technicians/recommendations?equipmentType=Steamer');
  console.log('   GET /api/technicians/recommendations?equipmentType=Ice Machine');
}

seedSkills().catch(console.error);
