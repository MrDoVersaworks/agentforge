'use client';

import { useState, useCallback, useRef } from 'react';
import api, { getAccessToken, getApiBaseUrl } from '@/lib/api';
import type { Conversation, Message } from '@/types';

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('[WARN] NEXT_PUBLIC_API_URL is not defined in the environment.');
}
const API_BASE_URL = getApiBaseUrl();

interface ConversationApiRecord {
  id: string;
  agent_id: string;
  title: string;
  created_at: string;
}

interface MessageApiRecord {
  id: string;
  conversation_id: string;
  role: 'user' | 'model';
  content: string;
  created_at: string;
}

const mapConversation = (record: ConversationApiRecord): Conversation => ({
  id: record.id,
  agentId: record.agent_id,
  title: record.title,
  createdAt: record.created_at,
});

const mapMessage = (record: MessageApiRecord): Message => ({
  id: record.id,
  conversationId: record.conversation_id,
  role: record.role,
  content: record.content,
  createdAt: record.created_at,
});

export function useChat(agentId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/chat/conversations/${agentId}`);
      setConversations((data.data?.conversations ?? []).map(mapConversation));
    } catch {
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  const loadConversation = useCallback(
    async (conversationId: string) => {
      setIsLoading(true);
      try {
        const { data } = await api.get(
          `/chat/conversations/${conversationId}/messages`
        );
        setMessages((data.data?.messages ?? []).map(mapMessage));
        const found = conversations.find((c) => c.id === conversationId);
        setCurrentConversation(found ? found : null);
      } catch {
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversations]
  );

  const sendMessage = useCallback(
    async (content: string, conversationId?: string) => {
      let activeConversationId = conversationId;

      if (!activeConversationId) {
        const { data } = await api.post('/chat/conversations', {
          agent_id: agentId,
          title: content.slice(0, 50) || 'New Chat',
        });
        const createdConversation = mapConversation(data.data.conversation);
        activeConversationId = createdConversation.id;
        setConversations((prev) => [createdConversation, ...prev]);
        setCurrentConversation(createdConversation);
      }

      const tempUserMsg: Message = {
        id: `temp-${Date.now()}`,
        conversationId: activeConversationId,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      setIsStreaming(true);
      abortRef.current = new AbortController();

      const tempModelId = `stream-${Date.now()}`;
      const tempModelMsg: Message = {
        id: tempModelId,
        conversationId: activeConversationId,
        role: 'model',
        content: '',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempModelMsg]);

      try {
        const token = getAccessToken();
        const response = await fetch(
          `${API_BASE_URL}/chat/conversations/${activeConversationId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({
              content,
              stream: true,
            }),
            signal: abortRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Stream failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No readable stream');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          const incompleteLine = lines.pop();
          buffer = incompleteLine ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            const payload = line.slice(6).trim();
            if (payload === '[DONE]') continue;

            try {
              const parsed = JSON.parse(payload);
              if (parsed.type === 'chunk' && typeof parsed.content === 'string') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempModelId
                      ? { ...m, content: m.content + parsed.content }
                      : m
                  )
                );
              }
            } catch {
              // Non-JSON line, skip.
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempModelId
                ? { ...m, content: '⚠️ Failed to get a response. Please try again.' }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [agentId]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      await api.delete(`/chat/conversations/${conversationId}`);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    },
    [currentConversation]
  );

  const newConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
  }, []);

  return {
    conversations,
    messages,
    currentConversation,
    isLoading,
    isStreaming,
    fetchConversations,
    loadConversation,
    sendMessage,
    stopStreaming,
    deleteConversation,
    newConversation,
  };
}
