'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { KnowledgeDocument } from '@/types';

// ================================================================
// useKnowledge — Document upload & management
// ================================================================

export function useKnowledge(agentId: string) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/knowledge/${agentId}/documents`);
      setDocuments(data.data || []);
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
          content,
        });
        const doc = data.data;
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
