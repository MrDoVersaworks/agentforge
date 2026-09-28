import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

test('knowledge count queries use grouped counts instead of correlated selected sql', () => {
  const agentService = readFileSync(resolve(process.cwd(), 'src/services/agent.service.ts'), 'utf8');
  const knowledgeService = readFileSync(resolve(process.cwd(), 'src/services/knowledge.service.ts'), 'utf8');
  const countService = readFileSync(resolve(process.cwd(), 'src/services/knowledge-counts.service.ts'), 'utf8');

  assert.equal(agentService.includes('knowledge_documents kd WHERE kd.agent_id = ${agents.id}'), false);
  assert.equal(agentService.includes('knowledge_chunks kc WHERE kc.agent_id = ${agents.id}'), false);
  assert.equal(knowledgeService.includes('knowledge_chunks kc WHERE kc.document_id = ${knowledgeDocuments.id}'), false);

  assert.equal(countService.includes('groupBy(knowledgeDocuments.agent_id)'), true);
  assert.equal(countService.includes('groupBy(knowledgeChunks.agent_id)'), true);
  assert.equal(countService.includes('groupBy(knowledgeChunks.document_id)'), true);
  assert.equal(countService.includes('inArray(knowledgeDocuments.agent_id, agentIds)'), true);
  assert.equal(countService.includes('inArray(knowledgeChunks.agent_id, agentIds)'), true);
});
