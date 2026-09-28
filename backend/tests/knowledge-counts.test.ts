import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

test('knowledge count queries do not use correlated selected sql fields', () => {
  const agentService = readFileSync(resolve(process.cwd(), 'src/services/agent.service.ts'), 'utf8');
  const knowledgeService = readFileSync(resolve(process.cwd(), 'src/services/knowledge.service.ts'), 'utf8');
  const countService = readFileSync(resolve(process.cwd(), 'src/services/knowledge-counts.service.ts'), 'utf8');

  assert.doesNotMatch(agentService, /sql<number>[^\\n]*knowledge_documents[^\\n]*\\$\\{agents\\.id\\}/);
  assert.doesNotMatch(agentService, /sql<number>[^\\n]*knowledge_chunks[^\\n]*\\$\\{agents\\.id\\}/);
  assert.doesNotMatch(knowledgeService, /sql<number>[^\\n]*knowledge_chunks[^\\n]*\\$\\{knowledgeDocuments\\.id\\}/);

  assert.match(countService, /groupBy\\(knowledgeDocuments\\.agent_id\\)/);
  assert.match(countService, /groupBy\\(knowledgeChunks\\.agent_id\\)/);
  assert.match(countService, /groupBy\\(knowledgeChunks\\.document_id\\)/);
  assert.match(countService, /inArray\\(knowledgeDocuments\\.agent_id, agentIds\\)/);
  assert.match(countService, /inArray\\(knowledgeChunks\\.agent_id, agentIds\\)/);
});
