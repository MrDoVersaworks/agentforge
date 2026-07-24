import { eq, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { encrypt } from './crypto.service.js';
import { logger } from '../utils/logger.js';

interface UpdateSettingsInput {
  name?: string;
  gemini_model?: string;
  notification_email?: string;
}

function requireGeminiModel(model: string | null): string {
  if (model === null || model.trim().length === 0) {
    throw new Error('[ERR_GEMINI_MODEL_MISSING] User account has no configured Gemini model.');
  }

  return model;
}

export async function saveGeminiKey(
  userId: string,
  geminiKey: string
): Promise<void> {
  logger.info('SETTINGS', 'Encrypting and storing Gemini API Key for user: ' + userId);
  const encrypted = encrypt(geminiKey);

  const result = await db
    .update(users)
    .set({
      encrypted_gemini_key: encrypted.encryptedText,
      gemini_key_iv: encrypted.iv,
      gemini_key_tag: encrypted.tag,
      updated_at: sql.raw('CURRENT_TIMESTAMP'),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (result.length === 0) {
    throw new Error('[ERR_USER_NOT_FOUND] User not found.');
  }
}

export async function saveResendKey(
  userId: string,
  resendKey: string
): Promise<void> {
  logger.info('SETTINGS', 'Encrypting and storing Resend API Key for user: ' + userId);
  const encrypted = encrypt(resendKey);

  const result = await db
    .update(users)
    .set({
      encrypted_resend_key: encrypted.encryptedText,
      resend_key_iv: encrypted.iv,
      resend_key_tag: encrypted.tag,
      updated_at: sql.raw('CURRENT_TIMESTAMP'),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (result.length === 0) {
    throw new Error('[ERR_USER_NOT_FOUND] User not found.');
  }
}

export async function getSettings(userId: string) {
  logger.info('SETTINGS', 'Fetching account settings for user: ' + userId);
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
    throw new Error('[ERR_USER_NOT_FOUND] User not found.');
  }

  const user = result[0];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    geminiModel: requireGeminiModel(user.gemini_model),
    hasApiKey: user.encrypted_gemini_key !== null,
    hasResendKey: user.encrypted_resend_key !== null,
    notificationEmail: user.notification_email,
  };
}

export async function updateSettings(
  userId: string,
  input: UpdateSettingsInput
) {
  logger.info('SETTINGS', 'Updating settings for user: ' + userId);

  const result = await db
    .update(users)
    .set({
      ...input,
      updated_at: sql.raw('CURRENT_TIMESTAMP'),
    })
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
    throw new Error('[ERR_USER_NOT_FOUND] User not found.');
  }

  const user = result[0];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    geminiModel: requireGeminiModel(user.gemini_model),
    hasResendKey: user.encrypted_resend_key !== null,
    notificationEmail: user.notification_email,
  };
}

export async function deleteGeminiKey(userId: string): Promise<void> {
  logger.info('SETTINGS', 'Purging Gemini API Key for user: ' + userId);

  const result = await db
    .update(users)
    .set({
      encrypted_gemini_key: null,
      gemini_key_iv: null,
      gemini_key_tag: null,
      updated_at: sql.raw('CURRENT_TIMESTAMP'),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (result.length === 0) {
    throw new Error('[ERR_USER_NOT_FOUND] User not found.');
  }
}

export async function deleteResendKey(userId: string): Promise<void> {
  logger.info('SETTINGS', 'Purging Resend API Key for user: ' + userId);

  const result = await db
    .update(users)
    .set({
      encrypted_resend_key: null,
      resend_key_iv: null,
      resend_key_tag: null,
      updated_at: sql.raw('CURRENT_TIMESTAMP'),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (result.length === 0) {
    throw new Error('[ERR_USER_NOT_FOUND] User not found.');
  }
}