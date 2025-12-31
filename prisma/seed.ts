import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('- Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bookpub.com' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Admin User',
      email: 'admin@bookpub.com',
      role: 'admin',
      apiKey: 'admin-api-key-12345',
      password: adminPassword,
    },
  });
  console.log('- Admin user ready:', admin.email);

  // Create reviewer user
  const reviewerPassword = await bcrypt.hash('reviewer123', 10);
  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@bookpub.com' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Reviewer User',
      email: 'reviewer@bookpub.com',
      role: 'reviewer',
      apiKey: 'reviewer-api-key-67890',
      password: reviewerPassword,
    },
  });
  console.log('- Reviewer user ready:', reviewer.email);

  // Check if books already exist
  const existingBooksCount = await prisma.book.count();

  if (existingBooksCount > 0) {
    console.log(`- Books already exist (${existingBooksCount} found), skipping book creation...`);
  } else {
    // Create sample books only if none exist
    const books = [
      {
        id: uuidv4(),
        title: 'Why This Code Works',
        authors: 'Ankit Verma',
        publishedBy: 'Penguin',
        createdById: admin.id,
      },
      {
        id: uuidv4(),
        title: 'Fixing Bugs by Adding More Bugs',
        authors: 'Sharma Ji',
        publishedBy: 'Panic Mode Publishing',
        createdById: admin.id,
      },
      {
        id: uuidv4(),
        title: 'How to Eat Almonds and Remember Syntax',
        authors: 'Varun Kumar',
        publishedBy: 'Penguin',
        createdById: reviewer.id,
      },
    ];

    for (const book of books) {
      const created = await prisma.book.create({
        data: book,
      });
      console.log('- Created book:', created.title);
    }
  }

  console.log('\n- Seed completed successfully!');
  console.log('\n- Test Credentials:');
  console.log('   Admin:');
  console.log('     Email: admin@bookpub.com');
  console.log('     Password: admin123');
  console.log('     API Key: admin-api-key-12345');
  console.log('   Reviewer:');
  console.log('     Email: reviewer@bookpub.com');
  console.log('     Password: reviewer123');
  console.log('     API Key: reviewer-api-key-67890');
}

main()
  .catch((e) => {
    console.error('- Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });