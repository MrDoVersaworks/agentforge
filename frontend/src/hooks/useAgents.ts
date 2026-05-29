'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { Agent, CreateAgentPayload, UpdateAgentPayload } from '@/types';

// ================================================================
// useAgents — Agent CRUD operations
// ================================================================

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/agents');
      setAgents(data.data?.agents || []);
    } catch {
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAgent = useCallback(async (payload: CreateAgentPayload): Promise<Agent> => {
    const { data } = await api.post('/agents', payload);
    const newAgent = data.data?.agent;
    setAgents((prev) => [newAgent, ...prev]);
    return newAgent;
  }, []);

  const updateAgent = useCallback(async (id: string, payload: UpdateAgentPayload): Promise<Agent> => {
    const { data } = await api.patch(`/agents/${id}`, payload);
    const updated = data.data?.agent;
    setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  }, []);

  const deleteAgent = useCallback(async (id: string) => {
    await api.delete(`/agents/${id}`);
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { agents, isLoading, fetchAgents, createAgent, updateAgent, deleteAgent };
}
