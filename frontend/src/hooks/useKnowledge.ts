'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { KnowledgeDocument } from '@/types';

interface KnowledgeDocumentApiRecord {
  id: string;
  agent_id: string;
  filename: string;
  chunk_count?: number;
  created_at: string;
}

function mapDocument(record: KnowledgeDocumentApiRecord): KnowledgeDocument {
  return {
    id: record.id,
    agentId: record.agent_id,
    filename: record.filename,
    chunkCount: record.chunk_count ?? 0,
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
      setDocuments((data.data?.documents ?? []).map(mapDocument));
    } catch {
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
