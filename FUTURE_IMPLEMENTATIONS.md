# Future Implementations & Architecture Roadmap

This document serves as a ledger for advanced architectural patterns, features, and optimizations that are planned for future integration into WANDR.AI, but are intentionally deferred to avoid over-engineering the MVP.

## 1. LLM / Model Routing (Mixture of Experts)
**Concept:**
Instead of relying on a single Large Language Model (LLM) for all tasks, the backend will utilize an orchestration layer (e.g., Vercel AI SDK or LangGraph) that acts as a "Router". 

**How it works:**
1. The user inputs a request (e.g., "Parse this Instagram reel and plan a 5-day trip").
2. The **Router Agent** analyzes the intent and splits the tasks.
3. **Task A (Vision/Parsing):** The router sends the Instagram Reel to a highly capable multimodal model (e.g., Gemini 1.5 Pro) to extract visual data and locations.
4. **Task B (Logistical Reasoning):** The router sends the extracted locations to a highly capable reasoning model (e.g., Claude 3.5 Sonnet) to compute optimal travel times, logistics, and sequencing.
5. The orchestration layer compiles the results from both models and streams the final UI back to the client.

**Why Deferred:**
Adds significant latency, API costs, and backend complexity. Modern top-tier models (Claude/Gemini) are currently generalized enough to handle both tasks competently for the V1 MVP. We will implement routing only when specific quality bottlenecks are identified in production.
