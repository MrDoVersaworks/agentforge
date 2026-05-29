import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { encrypt } from './crypto.service.js';
import { logger } from '../utils/logger.js';

export async function saveGeminiKey(userId: string, geminiKey: string): Promise<void> {
  logger.info('SETTINGS', `Encrypting and storing Gemini API Key for user: ${userId}`);
  const encrypted = encrypt(geminiKey);

  const result = await db
    .update(users)
    .set({
      encrypted_gemini_key: encrypted.encryptedText,
      gemini_key_iv: encrypted.iv,
      gemini_key_tag: encrypted.tag,
      updated_at: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (result.length === 0) {
    throw new Error('User not found.');
  }
}

export async function getSettings(userId: string) {
  logger.info('SETTINGS', `Fetching account settings for user: ${userId}`);
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      gemini_model: users.gemini_model,
      encrypted_gemini_key: users.encrypted_gemini_key,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (result.length === 0) {
    throw new Error('User not found.');
  }

  const user = result[0];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    geminiModel: user.gemini_model || 'gemini-2.5-flash',
    hasApiKey: !!user.encrypted_gemini_key,
  };
}

export async function updateSettings(
  userId: string,
  input: { name?: string; gemini_model?: 'gemini-2.5-flash' | 'gemini-2.5-pro' }
) {
  logger.info('SETTINGS', `Updating settings for user: ${userId}`);
  const updateData: any = {
    ...input,
    updated_at: new Date(),
  };

  const result = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      gemini_model: users.gemini_model,
    });

  if (result.length === 0) {
    throw new Error('User not found.');
  }

  return {
    id: result[0].id,
    name: result[0].name,
    email: result[0].email,
    geminiModel: result[0].gemini_model || 'gemini-2.5-flash',
  };
}

export async function deleteUserAccount(userId: string): Promise<void> {
  logger.info('SETTINGS', `Permanently deleting user account: ${userId} (Danger Zone: Account Vaporization!)`);

  const result = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (result.length === 0) {
    throw new Error('User account not found.');
  }

  logger.info('SETTINGS', `Successfully vaporized account data for user: ${userId}`);
}
