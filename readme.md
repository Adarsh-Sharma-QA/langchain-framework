## 🚀 Setup & Running the Examples

### Prerequisites

Each script picks up API credentials from environment variables via `dotenv/config`, but no `.env.example` is included, so here's what you actually need in a local `.env` file (already covered by `.gitignore`):

- `ANTHROPIC_API_KEY` — required by every `agent*.ts` file and `rag/ragagentServer.ts`, since they all call `initChatModel("claude-sonnet-4-5-20250929", ...)`.
- `OPENAI_API_KEY` — required by `agent5.ts` (uses `ChatOpenAI({ model: "gpt-4o-mini" })` as the cheap fallback model) and by every `rag/ragagent*.ts` file (uses `OpenAIEmbeddings({ model: "text-embedding-3-large" })` to embed document chunks).

### Running an agent script

There's no `dev`/`start` script defined in `package.json` yet, so run any file directly with `tsx` (already a dependency):

```bash
npx tsx agent1.ts
npx tsx rag/ragagent1.ts
```

### Running the LangGraph RAG server

`langgraph.json` registers `rag/ragagentServer.ts` as the `rag_agent` graph, so it's meant to run via the LangGraph CLI (`@langchain/langgraph-cli`) rather than directly with `tsx`:

```bash
npx @langchain/langgraph-cli dev
```

⚠️ **Gotcha:** `rag/ragagentServer.ts` currently hardcodes local absolute file paths for the PDFs it ingests (`/users/rahulshetty/downloads/ProjectDocs/...`). Update the `pdfPaths` array at the top of that file to point at PDFs that exist on your own machine before running it — otherwise `PDFLoader` will fail on the first path it can't find.

// Original request object might look like:
request = {
  messages: [...],
  tools: [...],
  systemPrompt: "...",
  model: basicModel,
  // ... other properties
}

// This creates a NEW object:
{
  ...request,  // Copy ALL properties from request
  model: messageCount > 3 ? advancedModel : basicModel,  // Override the model property
}

// Result:
{
  messages: [...],      // Copied from request
  tools: [...],         // Copied from request
  systemPrompt: "...",  // Copied from request
  model: advancedModel, // OVERRIDDEN - new value
  // ... all other properties copied
}

*************************************************************
Guardrails PII
SSN or ID -

Implement safety checks and content filtering for your agents

Guardrails help you build safe, compliant AI applications by validating and filtering content at key points in your agent’s execution. They can detect sensitive information, enforce content policies, validate outputs, and prevent unsafe behaviors before they cause problems.



PDF's -> vector embeddings
"Nike was incorporated" → [0.234, -0.891, 0.456, ..., 0.123] Vector Store-> 3documents-1 paragraph




When Nike was incorporated?- [0.234, -0.891, 0.456] - Semantic  -> Top 2 relevant documents



" when Nike was incorporated"? + Top 2 relevant documents

Nike was incorporated in 1982.



->





## 📚 Retrieval Guide

This guide focuses on retrieval of text data. We will cover the following concepts:

### 📄 Documents and Document Loaders
Load documents from various sources (PDFs, word docs, etc.)
```bash
npm i @langchain/community pdf-parse
```

### ✂️ Text Splitters
Split large documents into manageable chunks
```bash
npm i @langchain/textsplitters
```

### 🧮 Embeddings
Convert text into vector representations for semantic search
```bash
npm i @langchain/openai
```

### 🗄️ Vector Stores and Retrievers
Store and retrieve documents based on semantic similarity
```bash
npm i @langchain/classic
```
​
