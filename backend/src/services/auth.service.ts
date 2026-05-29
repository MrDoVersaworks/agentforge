import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users, refreshTokens } from '../db/schema.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { UserPayload } from '../types/index.js';
import {
  BCRYPT_SALT_ROUNDS,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY_DAYS,
  DEFAULT_GEMINI_MODEL,
} from '../constants/index.js';

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  has_api_key: boolean;
  gemini_model: string;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    throw new Error('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

  const inserted = await db
    .insert(users)
    .values({
      email: input.email,
      password_hash: passwordHash,
      name: input.name,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      gemini_model: users.gemini_model,
    });

  if (inserted.length === 0) {
    throw new Error('Failed to create user account.');
  }

  const newUser = inserted[0];

  // Generate tokens immediately so the user is logged in after registration
  const accessPayload: UserPayload = {
    id: newUser.id,
    email: newUser.email,
  };
  const accessToken = jwt.sign(accessPayload, config.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const refreshTokenHash = await bcrypt.hash(rawRefreshToken, BCRYPT_SALT_ROUNDS);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const insertedTokens = await db
    .insert(refreshTokens)
    .values({
      user_id: newUser.id,
      token_hash: refreshTokenHash,
      expires_at: expiresAt,
    })
    .returning({ id: refreshTokens.id });

  if (insertedTokens.length === 0) {
    throw new Error('Failed to generate refresh token.');
  }

  const refreshToken = `${insertedTokens[0].id}.${rawRefreshToken}`;

  return {
    accessToken,
    refreshToken,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      has_api_key: false,
      gemini_model: newUser.gemini_model || DEFAULT_GEMINI_MODEL,
    },
  };
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      password_hash: users.password_hash,
      encrypted_gemini_key: users.encrypted_gemini_key,
      gemini_model: users.gemini_model,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (userRows.length === 0) {
    throw new Error('Invalid email or password.');
  }

  const user = userRows[0];
  const passwordValid = await bcrypt.compare(password, user.password_hash);

  if (!passwordValid) {
    throw new Error('Invalid email or password.');
  }

  const accessPayload: UserPayload = {
    id: user.id,
    email: user.email,
  };
  const accessToken = jwt.sign(accessPayload, config.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const refreshTokenHash = await bcrypt.hash(rawRefreshToken, BCRYPT_SALT_ROUNDS);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const insertedTokens = await db
    .insert(refreshTokens)
    .values({
      user_id: user.id,
      token_hash: refreshTokenHash,
      expires_at: expiresAt,
    })
    .returning({ id: refreshTokens.id });

  if (insertedTokens.length === 0) {
    throw new Error('Failed to generate refresh token.');
  }

  const refreshToken = `${insertedTokens[0].id}.${rawRefreshToken}`;

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      has_api_key: !!user.encrypted_gemini_key,
      gemini_model: user.gemini_model || DEFAULT_GEMINI_MODEL,
    },
  };
}

export async function refreshAccessToken(refreshTokenValue: string): Promise<string> {
  const dotIndex = refreshTokenValue.indexOf('.');
  if (dotIndex === -1) {
    throw new Error('Invalid refresh token.');
  }

  const tokenId = refreshTokenValue.substring(0, dotIndex);
  const rawToken = refreshTokenValue.substring(dotIndex + 1);

  const tokenRows = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.id, tokenId))
    .limit(1);

  if (tokenRows.length === 0) {
    throw new Error('Refresh token expired or invalid.');
  }

  const storedToken = tokenRows[0];

  if (new Date() > storedToken.expires_at) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenId));
    throw new Error('Refresh token has expired.');
  }

  const isValid = await bcrypt.compare(rawToken, storedToken.token_hash);
  if (!isValid) {
    throw new Error('Invalid refresh token.');
  }

  const userRows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, storedToken.user_id))
    .limit(1);

  if (userRows.length === 0) {
    throw new Error('User account not found.');
  }

  const user = userRows[0];
  const accessPayload: UserPayload = {
    id: user.id,
    email: user.email,
  };

  return jwt.sign(accessPayload, config.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export async function logoutUser(refreshTokenValue: string): Promise<void> {
  const dotIndex = refreshTokenValue.indexOf('.');
  if (dotIndex === -1) {
    return;
  }

  const tokenId = refreshTokenValue.substring(0, dotIndex);
  await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenId));
  logger.info('AUTH', `Successfully invalidated session refresh token ID: ${tokenId}`);
}
