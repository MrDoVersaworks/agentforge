'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { KnowledgeDocument } from '@/types';

interface KnowledgeDocumentApiRecord {
  id: string;
  agent_id: string;
  filename: string;
  chunk_count: number;
  created_at: string;
}

function mapDocument(record: KnowledgeDocumentApiRecord): KnowledgeDocument {
  return {
    id: record.id,
    agentId: record.agent_id,
    filename: record.filename,
    chunkCount: record.chunk_count,
    createdAt: record.created_at,
  };
}

export function useKnowledge(agentId: string) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/knowledge/${agentId}/documents`);
      const records = data.data?.documents ?? [];
      console.info('[AgentForge][TRACE] knowledge:documents-response', { agentId, documentCount: records.length, chunkCount: records.reduce((sum: number, record: KnowledgeDocumentApiRecord) => sum + record.chunk_count, 0) });
      setDocuments(records.map(mapDocument));
    } catch (error) {
      console.error('[AgentForge][TRACE] knowledge:documents-fetch-failed', { agentId, error });
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  const uploadDocument = useCallback(
    async (filename: string, content: string): Promise<KnowledgeDocument> => {
      setIsUploading(true);
      try {
        const { data } = await api.post(`/knowledge/${agentId}/documents`, {
          filename,
          content_text: content,
        });
        const doc = mapDocument(data.data.document);
        console.info('[AgentForge][TRACE] knowledge:upload-response', { agentId, documentId: doc.id, filename: doc.filename, chunkCount: doc.chunkCount });
        setDocuments((prev) => [doc, ...prev]);
        return doc;
      } finally {
        setIsUploading(false);
      }
    },
    [agentId]
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      await api.delete(`/knowledge/${agentId}/documents/${documentId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    },
    [agentId]
  );

  return { documents, isLoading, isUploading, fetchDocuments, uploadDocument, deleteDocument };
}
