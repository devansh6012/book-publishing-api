import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface SeedResult {
  success: boolean;
  message: string;
  alreadySeeded?: boolean;
  data?: {
    users: string[];
    booksCreated: number;
  };
}

export async function seedDatabase(): Promise<SeedResult> {
  // Check if already seeded
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@bookpub.com' }
  });

  if (existingAdmin) {
    return {
      success: true,
      message: 'Database already seeded!',
      alreadySeeded: true
    };
  }

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      id: uuidv4(),
      name: 'Admin User',
      email: 'admin@bookpub.com',
      role: 'admin',
      apiKey: 'admin-api-key',
      password: adminPassword,
    },
  });

  // Create reviewer user
  const reviewerPassword = await bcrypt.hash('reviewer123', 10);
  const reviewer = await prisma.user.create({
    data: {
      id: uuidv4(),
      name: 'Reviewer User',
      email: 'reviewer@bookpub.com',
      role: 'reviewer',
      apiKey: 'reviewer-api-key',
      password: reviewerPassword,
    },
  });

  // Create sample books
  await prisma.book.createMany({
    data: [
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
    ],
  });

  return {
    success: true,
    message: 'Database seeded successfully!',
    alreadySeeded: false,
    data: {
      users: ['admin@bookpub.com', 'reviewer@bookpub.com'],
      booksCreated: 3
    }
  };
}