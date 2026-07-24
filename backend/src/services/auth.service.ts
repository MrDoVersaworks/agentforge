import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { and, eq, gt, sql } from 'drizzle-orm';
import { REFRESH_TOKEN_BYTES } from '../config/constants.js';
import { config } from '../config/index.js';
import {
  ACCESS_TOKEN_EXPIRY,
  BCRYPT_SALT_ROUNDS,
  DEFAULT_GEMINI_MODEL,
  REFRESH_TOKEN_EXPIRY_DAYS,
} from '../constants/index.js';
import { db } from '../db/connection.js';
import { refreshTokens, users } from '../db/schema.js';
import type { UserPayload } from '../types/index.js';
import { logger } from '../utils/logger.js';

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

interface AuthUserRecord {
  id: string;
  email: string;
  name: string;
  gemini_model: string | null;
}

interface RefreshTokenMaterial {
  rawToken: string;
  tokenHash: string;
}

function requireGeminiModel(model: string | null): string {
  if (model === null || model.trim().length === 0) {
    throw new Error('[ERR_GEMINI_MODEL_MISSING] User account has no configured Gemini model.');
  }

  return model;
}

function createAccessToken(user: Pick<AuthUserRecord, 'id' | 'email'>): string {
  const accessPayload: UserPayload = {
    id: user.id,
    email: user.email,
  };

  return jwt.sign(accessPayload, config.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

async function createRefreshTokenMaterial(): Promise<RefreshTokenMaterial> {
  const rawToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
  const tokenHash = await bcrypt.hash(rawToken, BCRYPT_SALT_ROUNDS);
  return { rawToken, tokenHash };
}

function refreshExpirySql() {
  return sql.raw(
    "CURRENT_TIMESTAMP + INTERVAL '" + REFRESH_TOKEN_EXPIRY_DAYS + " days'"
  );
}

function formatRefreshToken(tokenId: string, rawToken: string): string {
  return tokenId + '.' + rawToken;
}

function buildAuthResult(
  user: AuthUserRecord,
  refreshToken: string,
  hasApiKey: boolean
): AuthResult {
  return {
    accessToken: createAccessToken(user),
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      has_api_key: hasApiKey,
      gemini_model: requireGeminiModel(user.gemini_model),
    },
  };
}

async function assertEmailAvailable(email: string): Promise<void> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new Error('[ERR_USER_EXISTS] An account with this email already exists.');
  }
}

async function persistRegistration(
  input: RegisterInput,
  passwordHash: string,
  tokenMaterial: RefreshTokenMaterial
): Promise<{ user: AuthUserRecord; refreshToken: string }> {
  return db.transaction(async (transaction) => {
    const insertedUsers = await transaction
      .insert(users)
      .values({
        email: input.email,
        password_hash: passwordHash,
        name: input.name,
        gemini_model: DEFAULT_GEMINI_MODEL,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        gemini_model: users.gemini_model,
      });

    if (insertedUsers.length === 0) {
      throw new Error('[ERR_USER_CREATE_FAILED] Failed to create user account.');
    }

    const user = insertedUsers[0];
    const insertedTokens = await transaction
      .insert(refreshTokens)
      .values({
        user_id: user.id,
        token_hash: tokenMaterial.tokenHash,
        expires_at: refreshExpirySql(),
      })
      .returning({ id: refreshTokens.id });

    if (insertedTokens.length === 0) {
      throw new Error('[ERR_REFRESH_TOKEN_CREATE_FAILED] Failed to create refresh token.');
    }

    return {
      user,
      refreshToken: formatRefreshToken(insertedTokens[0].id, tokenMaterial.rawToken),
    };
  });
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  await assertEmailAvailable(input.email);
  const [passwordHash, tokenMaterial] = await Promise.all([
    bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS),
    createRefreshTokenMaterial(),
  ]);
  const registration = await persistRegistration(input, passwordHash, tokenMaterial);

  return buildAuthResult(registration.user, registration.refreshToken, false);
}

async function loadLoginUser(email: string) {
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
    throw new Error('[ERR_INVALID_CREDENTIALS] Invalid email or password.');
  }

  return userRows[0];
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const user = await loadLoginUser(email);
  const passwordValid = await bcrypt.compare(password, user.password_hash);

  if (!passwordValid) {
    throw new Error('[ERR_INVALID_CREDENTIALS] Invalid email or password.');
  }

  const tokenMaterial = await createRefreshTokenMaterial();
  const insertedTokens = await db
    .insert(refreshTokens)
    .values({
      user_id: user.id,
      token_hash: tokenMaterial.tokenHash,
      expires_at: refreshExpirySql(),
    })
    .returning({ id: refreshTokens.id });

  if (insertedTokens.length === 0) {
    throw new Error('[ERR_REFRESH_TOKEN_CREATE_FAILED] Failed to create refresh token.');
  }

  const refreshToken = formatRefreshToken(insertedTokens[0].id, tokenMaterial.rawToken);
  return buildAuthResult(user, refreshToken, user.encrypted_gemini_key !== null);
}

function parseRefreshToken(refreshTokenValue: string): {
  tokenId: string;
  rawToken: string;
} {
  const tokenParts = refreshTokenValue.split('.');
  if (
    tokenParts.length !== 2 ||
    tokenParts[0].length === 0 ||
    tokenParts[1].length === 0
  ) {
    throw new Error('[ERR_REFRESH_TOKEN_INVALID] Invalid refresh token.');
  }

  return {
    tokenId: tokenParts[0],
    rawToken: tokenParts[1],
  };
}

export async function refreshAccessToken(refreshTokenValue: string): Promise<string> {
  const { tokenId, rawToken } = parseRefreshToken(refreshTokenValue);
  const tokenRows = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.id, tokenId),
        gt(refreshTokens.expires_at, sql.raw('CURRENT_TIMESTAMP'))
      )
    )
    .limit(1);

  if (tokenRows.length === 0) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenId));
    throw new Error('[ERR_REFRESH_TOKEN_EXPIRED] Refresh token expired or invalid.');
  }

  const storedToken = tokenRows[0];
  const isValid = await bcrypt.compare(rawToken, storedToken.token_hash);
  if (!isValid) {
    throw new Error('[ERR_REFRESH_TOKEN_INVALID] Invalid refresh token.');
  }

  const userRows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, storedToken.user_id))
    .limit(1);

  if (userRows.length === 0) {
    throw new Error('[ERR_USER_NOT_FOUND] User account not found.');
  }

  return createAccessToken(userRows[0]);
}

export async function logoutUser(refreshTokenValue: string): Promise<void> {
  const { tokenId } = parseRefreshToken(refreshTokenValue);
  await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenId));
  logger.info('AUTH', 'Successfully invalidated session refresh token ID: ' + tokenId);
}

export async function deleteUserAccount(
  userId: string,
  password: string
): Promise<void> {
  const userRows = await db
    .select({ id: users.id, password_hash: users.password_hash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userRows.length === 0) {
    throw new Error('[ERR_USER_NOT_FOUND] User account not found.');
  }

  const passwordValid = await bcrypt.compare(password, userRows[0].password_hash);
  if (!passwordValid) {
    throw new Error('[ERR_INVALID_PASSWORD] Invalid password. Account deletion aborted.');
  }

  const deletedUsers = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (deletedUsers.length === 0) {
    throw new Error('[ERR_ACCOUNT_DELETE_FAILED] User account deletion did not complete.');
  }

  logger.info('AUTH', 'Account deleted for user: ' + userId + '.');
}