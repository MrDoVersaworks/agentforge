import { pgTable, uuid, varchar, text, timestamp, real, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customType } from 'drizzle-orm/pg-core';

// ============================================================
// pgvector Custom Type (768 Dimensions for text-embedding-004)
// ============================================================
export const pgVector768 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .replace(/[\[\]]/g, '')
      .split(',')
      .map((v) => parseFloat(v));
  },
});

// ============================================================
// TABLE: users
// ============================================================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  encrypted_gemini_key: text('encrypted_gemini_key'),
  gemini_key_iv: varchar('gemini_key_iv', { length: 64 }),
  gemini_key_tag: varchar('gemini_key_tag', { length: 64 }),
  gemini_model: varchar('gemini_model', { length: 100 }).default('gemini-2.5-flash'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// TABLE: refresh_tokens
// ============================================================
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token_hash: varchar('token_hash', { length: 255 }).notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// TABLE: agents
// ============================================================
export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  system_prompt: text('system_prompt').notNull(),
  temperature: real('temperature').notNull().default(0.7),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// TABLE: knowledge_documents
// ============================================================
export const knowledgeDocuments = pgTable('knowledge_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  agent_id: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  content_text: text('content_text').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// TABLE: knowledge_chunks
// ============================================================
export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  document_id: uuid('document_id').notNull().references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
  agent_id: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  chunk_text: text('chunk_text').notNull(),
  embedding: pgVector768('embedding').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  agentIdx: index('kc_agent_id_idx').on(table.agent_id),
  documentIdx: index('kc_document_id_idx').on(table.document_id),
}));

// ============================================================
// TABLE: conversations
// ============================================================
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  agent_id: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// TABLE: messages
// ============================================================
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversation_id: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(), // 'user' | 'model'
  content: text('content').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// RELATIONS
// ============================================================
export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  agents: many(agents),
  conversations: many(conversations),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.user_id], references: [users.id] }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  user: one(users, { fields: [agents.user_id], references: [users.id] }),
  documents: many(knowledgeDocuments),
  chunks: many(knowledgeChunks),
  conversations: many(conversations),
}));

export const knowledgeDocumentsRelations = relations(knowledgeDocuments, ({ one, many }) => ({
  agent: one(agents, { fields: [knowledgeDocuments.agent_id], references: [agents.id] }),
  chunks: many(knowledgeChunks),
}));

export const knowledgeChunksRelations = relations(knowledgeChunks, ({ one }) => ({
  document: one(knowledgeDocuments, { fields: [knowledgeChunks.document_id], references: [knowledgeDocuments.id] }),
  agent: one(agents, { fields: [knowledgeChunks.agent_id], references: [agents.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  agent: one(agents, { fields: [conversations.agent_id], references: [agents.id] }),
  user: one(users, { fields: [conversations.user_id], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversation_id], references: [conversations.id] }),
}));
