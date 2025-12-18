// Test if the bcrypt hash is correct
const bcrypt = require('bcrypt');

const storedHash = '$2b$10$rKqF.8l8yL5f3OvQH0FGweN1d5.LqE4Tc3xNX5R1ZqQxJ0yZqGEHK';
const testPassword = '22';

console.log('🔍 Testing bcrypt hash...\n');
console.log('Password to test:', testPassword);
console.log('Stored hash:', storedHash);
console.log('');

bcrypt.compare(testPassword, storedHash).then(result => {
  if (result) {
    console.log('✅ Password matches! The hash is correct.');
  } else {
    console.log('❌ Password does NOT match! The hash is incorrect.');
    console.log('\nGenerating correct hash for password "22"...');
    bcrypt.hash(testPassword, 10).then(newHash => {
      console.log('New hash:', newHash);
      console.log('\nUpdate auth-schema.sql with this hash.');
    });
  }
});
