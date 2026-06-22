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

export async function saveResendKey(userId: string, resendKey: string): Promise<void> {
  logger.info('SETTINGS', `Encrypting and storing Resend API Key for user: ${userId}`);
  const encrypted = encrypt(resendKey);

  const result = await db
    .update(users)
    .set({
      encrypted_resend_key: encrypted.encryptedText,
      resend_key_iv: encrypted.iv,
      resend_key_tag: encrypted.tag,
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
      encrypted_resend_key: users.encrypted_resend_key,
      notification_email: users.notification_email,
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
    geminiModel: user.gemini_model ? user.gemini_model : 'gemini-2.5-flash',
    hasApiKey: !!user.encrypted_gemini_key,
    hasResendKey: !!user.encrypted_resend_key,
    notificationEmail: user.notification_email,
  };
}

interface UpdateSettingsInput {
  name?: string;
  gemini_model?: string;
  notification_email?: string;
}

export async function updateSettings(userId: string, input: UpdateSettingsInput) {
  logger.info('SETTINGS', `Updating settings for user: ${userId}`);

  const updateData: UpdateSettingsInput & { updated_at: Date } = {
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
      encrypted_resend_key: users.encrypted_resend_key,
      notification_email: users.notification_email,
    });

  if (result.length === 0) {
    throw new Error('User not found.');
  }

  return {
    id: result[0].id,
    name: result[0].name,
    email: result[0].email,
    geminiModel: result[0].gemini_model ? result[0].gemini_model : 'gemini-2.5-flash',
    hasResendKey: !!result[0].encrypted_resend_key,
    notificationEmail: result[0].notification_email,
  };
}

export async function deleteGeminiKey(userId: string): Promise<void> {
  logger.info('SETTINGS', `Purging Gemini API Key for user: ${userId}`);

  const result = await db
    .update(users)
    .set({
      encrypted_gemini_key: null,
      gemini_key_iv: null,
      gemini_key_tag: null,
      updated_at: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (result.length === 0) {
    throw new Error('User not found.');
  }
}

export async function deleteResendKey(userId: string): Promise<void> {
  logger.info('SETTINGS', `Purging Resend API Key for user: ${userId}`);

  const result = await db
    .update(users)
    .set({
      encrypted_resend_key: null,
      resend_key_iv: null,
      resend_key_tag: null,
      updated_at: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (result.length === 0) {
    throw new Error('User not found.');
  }
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
