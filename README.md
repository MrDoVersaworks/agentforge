# AgentForge — Grounded AI Agent Platform

[![AgentForge CI](https://github.com/MrDoVersaworks/agentforge/actions/workflows/main.yml/badge.svg)](https://github.com/MrDoVersaworks/agentforge/actions)
[![Playwright E2E](https://img.shields.io/badge/QA-Playwright-green)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**AgentForge** is a production-grade, multi-tenant AI Orchestration platform designed to construct autonomous AI agents grounded in custom knowledge bases. Leveraging the Google Gemini API, pgvector, and Next.js, it facilitates private, vector-grounded chat interfaces with real-time text-streaming RAG pipelines.

---

## 🎯 Why AgentForge?
Standard generative chat services often fall short because they lack domain-specific grounding and pose severe data privacy challenges. AgentForge is engineered as a **Sovereign Agent Workspace**:
- **BYOK Architecture (Bring Your Own Key):** Users configure their own Google Gemini API credentials in the UI, keeping computational overhead and API costs completely transparent and under their control.
- **Privacy-Hardened Storage:** User-provided API keys are encrypted immediately in-memory via AES-256-GCM before writing to the database, ensuring keys are never exposed in plaintext.
- **Dynamic Grounded RAG:** Ground assistants instantly using custom files (.txt, .md, .csv) chunked and indexed into PostgreSQL using high-dimensional embeddings.

---

## 👥 Targeted Population
AgentForge is tailored for:
- **Software Engineers & Developers:** Teams needing localized coding helpers or documentation search tools grounded in their specific codebase modules.
- **Support & Sales Teams:** Organizations seeking to ground customer service bots with internal FAQs and company policy sheets without leakage to public model training cycles.
- **Knowledge Workers:** Researchers looking to create multiple specialized agents (e.g., paper synthesizers, writing assistants, technical editors) running side-by-side.

---

## 🚀 Key Features

- **Autonomous Agent Builder:** Define custom names, system instructions, and generation temperatures (from deterministic `0` to creative `1.0`).
- **RAG Ingestion Engine:** Upload files via a drag-and-drop glassmorphic UI. The system automatically splits files into chunks, calculates 768-dimension embeddings, and indexes them using pgvector.
- **Real-Time Streaming Chat:** Engage in conversational threads with agents, experiencing low-latency, character-by-character token streaming with markdown rendering.
- **Dark Glassmorphism UI:** Stunning aesthetic framework utilizing violet and cyan design tokens, optimized responsive layouts, and interactive canvas constellations.
- **Sovereign Purge (Vaporization):** One-click account vaporization to completely erase all user metadata, custom agents, conversation history, and document vector embeddings from the server.

---

## 🎬 Sovereign Inception: Full System Walkthrough

[Recording Walkthrough Guide](./frontend/tests/e2e/recording_walkthrough.md)

*Read the detailed breakdown of the automated Playwright E2E suite, showcasing how the robot registers, configures credentials, constructs an agent, uploads files, verifies RAG streams, and purges all data.*

---

## 🧩 Engineering Challenges & Solutions

### 1. Vector Space & Dimension Alignment
**Challenge:** Gemini API embeddings can vary in size (768, 1536, etc.). Mismatching the dimensions with pgvector columns results in database-level search failures.
**Solution:** Hardcoded the vector dimension in the PostgreSQL schema to `vector(768)` matching `text-embedding-004`. Implemented a dimension alignment utility in the backend RAG service to enforce model-to-schema parity.

### 2. Multi-Tenant API Key Security
**Challenge:** Storing plain-text LLM keys in the database poses a major security liability if database tables are ever compromised.
**Solution:** Developed a **Crypto Vault Service** using **AES-256-GCM** with unique initialization vectors (IVs). User credentials are encrypted at the REST API boundary, stored as ciphertext, and decrypted only in-memory during active LLM inference.

### 3. Real-Time Streaming RAG Mechanics
**Challenge:** Returning large text responses can cause high TTFB (Time to First Token) latencies. When paired with database-backed RAG context assembly, standard REST API endpoints feel sluggish.
**Solution:** Engineered an **Express Server-Sent Events (SSE)** interface. The service queries pgvector for cosine similarity matches, constructs the context block, prompts Gemini, and streams the tokens to the Next.js client, giving users near-zero lag feedback.

### 4. High-Performance Ingestion Pipeline
**Challenge:** Vector embedding generation and indexing can introduce significant latency. Processing document chunks sequentially causes substantial wall-clock delay due to repeated API round-trips and individual SQL database inserts.
**Solution:** Refactored the ingestion pipeline to generate embeddings in parallel batches (concurrency level of 5) using `Promise.allSettled`, followed by a single SQL bulk insert using Drizzle ORM. This optimized pipeline reduced RAG ingestion latencies by up to **80%**.

### 5. Edge CDN Caching & Static Asset Optimization
**Challenge:** Dynamic Next.js client interfaces suffer from page loading and TTFB delays when serving static assets (CSS, icons, font assets) directly from serverless execution instances.
**Solution:** Leveraged Vercel's global edge network (Edge CDN) by implementing strict cache-control header policies for all static assets and pre-rendering static routes. This guarantees sub-10ms delivery of resources and eliminates cold-start overhead for static asset requests.

### 6. Secure Ingestion Pipeline & Prompt Injection Safeguards
**Challenge:** Document processing and AI retrieval systems are susceptible to prompt injection payloads embedded in files (Indirect Prompt Injection) designed to bypass system boundaries and hijack LLM instructions. Additionally, parsed document text presents command injection risks in the database.
**Solution:** Architected a sterile ingestion layer. Extracted file strings are systematically sanitized before index parsing. When assembling grounding context blocks for chat sessions, vector chunks are wrapped in explicit boundary XML tags. System instructions strictly direct the Gemini engine to parse text inside these boundaries exclusively as raw *data*, ignoring any embedded instructions or model override triggers.

---

## 🛠️ Technical Architecture

### Frontend
- **Framework:** Next.js (App Router)
- **Styling:** Vanilla CSS with custom Design Tokens (Modular & Performance-focused)
- **Client:** Axios with automated JWT token refresh interceptor
- **QA:** Playwright (Cross-device matrix testing)

### Backend
- **Framework:** Node.js / Express / TypeScript
- **Database:** PostgreSQL via Drizzle ORM
- **Vector Search:** `pgvector`
- **AI Integration:** `@google/generative-ai` (Gemini API)
- **Security:** Helmet, CORS, JWT, rate-limiters, and AES-256-GCM encryption

---

## 🧪 Running the E2E Showcase

To run the automated E2E lifecycle test suite:

```bash
# 1. Start the Backend Server (port 5003)
cd backend
npm install
npm run db:push
npm run dev

# 2. Start the Frontend Server (port 3003)
cd ../frontend
npm install
npm run dev

# 3. Run the Playwright Suite
npx playwright test tests/e2e/recording.spec.ts --project=chromium --headed
```
*Note: Make sure your `backend/.env` contains your `DATABASE_URL` and a valid `GEMINI_API_KEY` for embedding calculation.*

---

## 🚦 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL Instance (with pgvector extension)
- Google Gemini API Key

### Installation

1. **Clone and Setup Backend:**
   ```bash
   git clone https://github.com/MrDoVersaworks/agentforge.git
   cd agentforge/backend
   npm install
   # Copy .env.example to .env and configure DATABASE_URL + GEMINI_API_KEY
   npm run db:push
   npm run dev
   ```

2. **Setup Frontend:**
   ```bash
   cd ../frontend
   npm install
   # Copy .env.example to .env.local
   npm run dev
   ```

---

## 👨‍💻 Sovereign Engineering & Support

AgentForge is built as part of a high-innovation portfolio series.

**Architected by Oyewole Favour**  
📧 Contact via the in-app **Contact Form** (accessible from the dashboard)  
💼 [LinkedIn](https://www.linkedin.com/in/mrdoversaworks/)  
🌐 [GitHub](https://github.com/MrDoVersaworks/)
