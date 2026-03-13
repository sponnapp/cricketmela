// D1 Local Testing Script
// This script tests D1 database queries locally using wrangler
// Run with: npm run test:d1

const { execSync } = require('child_process');

console.log('🧪 D1 Local Testing Script\n');
console.log('Testing D1 database queries...\n');

function runQuery(description, sql) {
  console.log(`📊 ${description}`);
  try {
    const command = `npx wrangler d1 execute cricketmela-db --command="${sql.replace(/"/g, '\\"')}"`;
    const result = execSync(command, { encoding: 'utf-8' });
    console.log(result);
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  }
  console.log('');
}

// Test queries
runQuery('List all users', 'SELECT id, username, role, display_name FROM users;');
runQuery('List all seasons', 'SELECT * FROM seasons;');
runQuery('Count matches', 'SELECT COUNT(*) as match_count FROM matches;');
runQuery('List all user-season assignments', 'SELECT us.user_id, u.username, s.name as season, us.balance FROM user_seasons us JOIN users u ON u.id = us.user_id JOIN seasons s ON s.id = us.season_id;');

console.log('✅ D1 testing complete!');
console.log('\n📝 To run custom queries:');
console.log('npx wrangler d1 execute cricketmela-db --command="YOUR SQL HERE"');
console.log('\n🌐 To test with HTTP API (Pages Functions):');
console.log('npm run dev (in frontend directory)');
console.log('Then visit: http://localhost:8788/api/login');
