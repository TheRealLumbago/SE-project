const db = require('./config/database');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  // Default admin credentials - CHANGE THESE!
  const username = 'admin';
  const email = 'admin@cyberescaperoom.com';
  const password = 'admin123'; // CHANGE THIS PASSWORD!
  
  try {
    // Check if admin already exists
    const existingUser = await db.getAsync(
      'SELECT * FROM user WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUser) {
      // Update existing user to admin
      const passwordHash = await bcrypt.hash(password, 10);
      await db.runAsync(
        'UPDATE user SET role = ?, password_hash = ? WHERE username = ?',
        ['admin', passwordHash, username]
      );
      console.log('✓ Existing user updated to admin!');
    } else {
      // Create new admin user
      const passwordHash = await bcrypt.hash(password, 10);
      const result = await db.runAsync(
        'INSERT INTO user (username, email, password_hash, role, current_level, daily_streak) VALUES (?, ?, ?, ?, ?, ?)',
        [username, email, passwordHash, 'admin', 1, 0]
      );
      console.log('✓ Admin account created successfully!');
    }
    
    console.log('\n═══════════════════════════════════════');
    console.log('  ADMIN ACCOUNT CREDENTIALS');
    console.log('═══════════════════════════════════════');
    console.log('  Username: ' + username);
    console.log('  Email:    ' + email);
    console.log('  Password: ' + password);
    console.log('═══════════════════════════════════════');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('⚠️  You can modify this script to use different credentials.\n');
    
  } catch (error) {
    console.error('✗ Error creating admin:', error.message);
    console.error(error.stack);
  }
  
  // Close database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    }
    process.exit(0);
  });
}

// Run the function
createAdmin();

