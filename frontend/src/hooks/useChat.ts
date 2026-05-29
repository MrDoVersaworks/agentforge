'use client';

import { useState, useCallback, useRef } from 'react';
import api, { getAccessToken } from '@/lib/api';
import type { Conversation, Message } from '@/types';

// ================================================================
// useChat — Conversation management + RAG streaming
// ================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003';

export function useChat(agentId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch all conversations for this agent ──
  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/chat/${agentId}/conversations`);
      setConversations(data.data || []);
    } catch {
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  // ── Load messages for a conversation ──
  const loadConversation = useCallback(
    async (conversationId: string) => {
      setIsLoading(true);
      try {
        const { data } = await api.get(
          `/chat/${agentId}/conversations/${conversationId}/messages`
        );
        setMessages(data.data || []);
        const conv = conversations.find((c) => c.id === conversationId) || null;
        setCurrentConversation(conv);
      } catch {
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    },
    [agentId, conversations]
  );

  // ── Send a message (streaming SSE) ──
  const sendMessage = useCallback(
    async (content: string, conversationId?: string) => {
      // Optimistic: add user message immediately
      const tempUserMsg: Message = {
        id: `temp-${Date.now()}`,
        conversationId: conversationId || '',
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      // Prepare streaming
      setIsStreaming(true);
      abortRef.current = new AbortController();

      // Add an empty model message to stream into
      const tempModelId = `stream-${Date.now()}`;
      const tempModelMsg: Message = {
        id: tempModelId,
        conversationId: conversationId || '',
        role: 'model',
        content: '',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempModelMsg]);

      try {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/chat/${agentId}/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({
            message: content,
            ...(conversationId ? { conversationId } : {}),
          }),
          signal: abortRef.current.signal,
        });

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
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payload = line.slice(6).trim();
              if (payload === '[DONE]') continue;

              try {
                const parsed = JSON.parse(payload);
                if (parsed.type === 'chunk') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === tempModelId
                        ? { ...m, content: m.content + parsed.content }
                        : m
                    )
                  );
                } else if (parsed.type === 'meta') {
                  // Meta event: contains conversationId for new conversations
                  if (parsed.conversationId && !conversationId) {
                    setCurrentConversation({
                      id: parsed.conversationId,
                      agentId,
                      title: parsed.title || content.slice(0, 50),
                      createdAt: new Date().toISOString(),
                    });
                    // Update temp message conversation IDs
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.conversationId === ''
                          ? { ...m, conversationId: parsed.conversationId }
                          : m
                      )
                    );
                  }
                }
              } catch {
                // Non-JSON line, skip
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // Replace the streaming message with an error
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

  // ── Stop streaming ──
  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  // ── Delete a conversation ──
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      await api.delete(`/chat/${agentId}/conversations/${conversationId}`);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    },
    [agentId, currentConversation]
  );

  // ── Start a new conversation (clear state) ──
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
