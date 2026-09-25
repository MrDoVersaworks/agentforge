'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { Agent, CreateAgentPayload, UpdateAgentPayload } from '@/types';

interface AgentApiRecord {
  id: string;
  user_id: string;
  name: string;
  system_prompt: string;
  temperature: number;
  document_count?: number;
  chunk_count?: number;
  created_at: string;
  updated_at: string;
}

function mapAgent(record: AgentApiRecord): Agent {
  return {
    id: record.id,
    userId: record.user_id,
    name: record.name,
    systemPrompt: record.system_prompt,
    temperature: record.temperature,
    documentCount: record.document_count ?? 0,
    chunkCount: record.chunk_count ?? 0,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/agents');
      setAgents((data.data?.agents ?? []).map(mapAgent));
    } catch {
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAgent = useCallback(async (payload: CreateAgentPayload): Promise<Agent> => {
    const { data } = await api.post('/agents', {
      name: payload.name,
      system_prompt: payload.systemPrompt,
      temperature: payload.temperature ?? 0.7,
    });
    const newAgent = mapAgent(data.data.agent);
    setAgents((prev) => [newAgent, ...prev]);
    return newAgent;
  }, []);

  const updateAgent = useCallback(async (id: string, payload: UpdateAgentPayload): Promise<Agent> => {
    const { data } = await api.patch(`/agents/${id}`, {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.systemPrompt !== undefined ? { system_prompt: payload.systemPrompt } : {}),
      ...(payload.temperature !== undefined ? { temperature: payload.temperature } : {}),
    });
    const updated = mapAgent(data.data.agent);
    setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  }, []);

  const deleteAgent = useCallback(async (id: string) => {
    await api.delete(`/agents/${id}`);
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { agents, isLoading, fetchAgents, createAgent, updateAgent, deleteAgent };
}
