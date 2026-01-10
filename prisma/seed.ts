import { seedDatabase } from '../src/utils/seed';

async function main() {
  console.log('- Seeding database...');
  
  const result = await seedDatabase();
  
  if (result.alreadySeeded) {
    console.log('- ' + result.message);
  } else {
    console.log('- ' + result.message);
    console.log('   Users:', result.data?.users.join(', '));
    console.log('   Books:', result.data?.booksCreated);
  }

  console.log('\n- Test Credentials:');
  console.log('   Admin:    admin@bookpub.com / admin123');
  console.log('   Reviewer: reviewer@bookpub.com / reviewer123');
}

main()
  .catch((e) => {
    console.error('- Seed failed:', e);
    process.exit(1);
  });