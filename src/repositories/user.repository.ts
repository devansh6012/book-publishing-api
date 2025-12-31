import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { User } from '../types';

const prisma = new PrismaClient();

/**
 * User Repository
 */

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      apiKey: true,
      createdAt: true,
    },
  });
  return user as User | null;
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      apiKey: true,
      createdAt: true,
    },
  });
  return user as User | null;
}

/**
 * Find user by API key
 */
export async function findUserByApiKey(apiKey: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { apiKey },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      apiKey: true,
      createdAt: true,
    },
  });
  return user as User | null;
}

/**
 * Validate user credentials
 */
export async function validateCredentials(
  email: string,
  password: string
): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as 'admin' | 'reviewer',
    apiKey: user.apiKey,
    createdAt: user.createdAt,
  };
}

/**
 * Get all users (admin only)
 */
export async function findAllUsers(): Promise<User[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      apiKey: true,
      createdAt: true,
    },
  });
  return users as User[];
}
