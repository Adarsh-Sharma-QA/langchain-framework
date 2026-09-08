## 🗂️ What Each File Demonstrates

The scripts are numbered in teaching order — each one adds a single new LangChain concept on top of the previous file, so read them in sequence rather than picking one at random.

**Agent basics (repo root)**

| File | New concept introduced |
| --- | --- |
| `agent1.ts` | The minimum agent: `tool()` + `createAgent()` with two mock tools (`get_weather`, `get_time`) and a bare model-name string. |
| `agent2.ts` | `systemPrompt` to control tool-call ordering, and `config.context` — per-invocation data (`user_id`) that tools read but the model never sees. |
| `agent3.ts` | `initChatModel()` for a configured model instance (temperature/timeout/max_tokens) and `responseFormat` to force a Zod-shaped `structuredResponse`. |
| `agent4.ts` | Multi-turn memory via a `MemorySaver` checkpointer keyed by `config.configurable.thread_id`; also shows two threads staying isolated. |
| `agent5.ts` | Custom middleware with `createMiddleware()` — swaps a cheap model for a stronger one once the conversation grows past a message threshold. |
| `agent6.ts` | Prebuilt middleware stack: `modelFallbackMiddleware`, `summarizationMiddleware`, `llmToolSelectorMiddleware`. |
| `agent7.ts` | `piiRedactionMiddleware` with custom regex rules for credit card, SSN, and phone numbers. |

**RAG (`rag/`)**

| File | New concept introduced |
| --- | --- |
| `ragagent1.ts` | The raw retrieval pipeline only: `PDFLoader` → `RecursiveCharacterTextSplitter` → `OpenAIEmbeddings` → `MemoryVectorStore.similaritySearch()`. No agent yet. |
| `ragagent2.ts` | Wires retrieval into an agent using `dynamicSystemPromptMiddleware` — top-2 chunks are injected into the system prompt on every turn. |
| `ragagent3.ts` | Same pattern over **multiple** PDFs loaded into one shared vector store. |
| `ragagent4.ts` | Swaps `PDFLoader` for `DocxLoader` (backed by the `mammoth` dependency) to ingest a `.docx` instead. |
| `ragagent5.ts` | Agentic RAG: retrieval is exposed as a `retrieve` **tool**, so the model decides *whether* and *what* to search instead of always being fed context. |
| `ragagent6.ts` | Combines the `retrieve` tool with external MCP server tools via `MultiServerMCPClient`. |
| `ragagentServer.ts` | The `ragagent5.ts` agent exported as a `graph` for the LangGraph CLI (registered as `rag_agent` in `langgraph.json`). |

> ⚠️ `ragagent6.ts` also points `MultiServerMCPClient` at a hardcoded local MCP server path (`/Users/rahulshetty/Documents/playground/mcp-ecommerce-crud/dist/mcp/server.js`). Change it to your own server build, or that agent will fail to start.

## 🚀 Setup & Running the Examples

### Prerequisites

Each script picks up API credentials from environment variables via `dotenv/config`, but no `.env.example` is included, so here's what you actually need in a local `.env` file (already covered by `.gitignore`):

- `ANTHROPIC_API_KEY` — required by every `agent*.ts` file and `rag/ragagentServer.ts`, since they all call `initChatModel("claude-sonnet-4-5-20250929", ...)`.
- `OPENAI_API_KEY` — required by `agent5.ts` (uses `ChatOpenAI({ model: "gpt-4o-mini" })` as the cheap fallback model) and by every `rag/ragagent*.ts` file (uses `OpenAIEmbeddings({ model: "text-embedding-3-large" })` to embed document chunks).

> ⚠️ **Missing dependency:** every file in `rag/` imports `MemoryVectorStore` from `@langchain/classic`, but that package is **not** listed in `package.json`. Install it before running any RAG script:
>
> ```bash
> npm i @langchain/classic
> ```

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

## 🐛 Known bug: `emailTool` silently returns `undefined` (agent6.ts, agent7.ts)

In both `agent6.ts` and `agent7.ts`, `emailTool`'s handler is missing a `return`:

```ts
const emailTool = tool(({recipient,subject}) => {
    `Email sent to ${recipient} with subject ${subject}`   // <-- template literal is never returned
}, { ... })
```

Because the arrow function body is wrapped in `{ }` without an explicit `return`, the template
literal is evaluated and discarded, and the tool call resolves to `undefined` instead of a
confirmation string. Run `agent6.ts` as-is (it prompts the model to email
`rahulshetty@gmail.com`) and the tool message in the printed `response` will show `undefined`
as the result of the `send_email` call, even though the tool "ran" successfully — there's no
error, just silently wrong output. `agent1.ts`–`agent5.ts` don't define `emailTool` and aren't
affected.

**Fix:** add `return` before the template literal, e.g.:

```ts
const emailTool = tool(({recipient,subject}) => {
    return `Email sent to ${recipient} with subject ${subject}`
}, { ... })
```

This is a good one to know about before copying `emailTool` into your own agent — the same
missing-`return` pattern will silently swallow any tool's output if the arrow function uses a
`{ }` block body.
