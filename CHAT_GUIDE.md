# Chat Interface Guide

## Overview

The Chat Interface is ReviewGPT's core AI-powered feature that enables natural language conversations about your app reviews using RAG (Retrieval-Augmented Generation).

## Features

### 🔍 Semantic Search
- Queries are converted to vector embeddings
- Reviews are retrieved based on semantic similarity, not just keywords
- Top relevant reviews are used as context for AI responses

### 💬 Streaming Responses
- Real-time streaming of AI responses for better UX
- Server-Sent Events (SSE) for efficient data transfer
- Progressive rendering of markdown responses

### 📊 Context Transparency
- View all reviews used to generate the response
- See relevance scores (similarity percentages)
- Sentiment breakdown and key themes
- Model information (Gemini 1.5 Pro or GPT-4o)

### 🎯 Dynamic Configuration
- AI model selection via Firebase Remote Config
- System prompt customization without redeployment
- Embedding provider choice (Google or OpenAI)

## Architecture

### Components

```
components/chat/
├── chat-interface.tsx     # Main container with state management
├── chat-message.tsx       # Message bubbles with markdown
├── chat-input.tsx         # Auto-resizing textarea
└── chat-sidebar.tsx       # Context panel with retrieved reviews
```

### Data Flow

1. **User sends message** → `ChatInterface.handleSubmit()`
2. **POST /api/chat** with message and conversation history
3. **RAG Pipeline** (`lib/ai/rag.ts`):
   - Generate query embedding
   - Search similar reviews (pgvector)
   - Build context with top-k reviews
   - Generate system prompt
4. **Stream Response**:
   - Metadata chunk (reviews, sentiment, themes)
   - Text chunks (AI response)
   - Done signal
5. **Update UI** with streaming text and context

### API Request

```typescript
POST /api/chat

{
  "message": "What are the main complaints?",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "appId": 123,        // Optional: filter by app
  "platform": "ios"    // Optional: filter by platform
}
```

### API Response (SSE)

```
data: {"type":"metadata","data":{...}}

data: {"type":"text","data":"Based on"}

data: {"type":"text","data":" the reviews"}

data: {"type":"done"}
```

## Usage

### Basic Query

```typescript
// User asks: "What features do users want?"

// Backend:
// 1. Generate embedding for query
// 2. Search reviews: "SELECT * FROM reviews ORDER BY embedding <=> query LIMIT 10"
// 3. Build context with top 10 reviews
// 4. Prompt: "Based on these reviews: [context]... Answer: What features do users want?"
// 5. Stream response

// Response includes:
// - AI summary of requested features
// - List of specific reviews mentioning features
// - Sentiment and themes
```

### Conversation History

The chat maintains context across multiple turns:

```typescript
conversationHistory: [
  { role: "user", content: "What are common bugs?" },
  { role: "assistant", content: "Based on 45 reviews..." },
  { role: "user", content: "Which ones are most critical?" }, // Uses previous context
]
```

## Sample Queries

### Product Insights
- "What features do users request most?"
- "What makes users give 5-star reviews?"
- "What are the top 3 pain points?"

### Bug Analysis
- "What bugs have been reported?"
- "Are there any critical issues?"
- "What crashes are users experiencing?"

### Competitive Analysis
- "How does our app compare to competitors?"
- "What do users say about [competitor]?"

### Sentiment Analysis
- "Summarize the positive feedback"
- "What are users complaining about?"
- "Has sentiment improved this month?"

### Feature Requests
- "What new features are being requested?"
- "Do users want dark mode?"
- "What integrations do users need?"

## Configuration (Firebase Remote Config)

### AI Model Selection

```json
{
  "ai_model": "gemini-1.5-pro",  // or "gpt-4o"
  "embedding_provider": "google", // or "openai"
}
```

### RAG Parameters

```json
{
  "rag_top_k": 10,               // Number of reviews to retrieve
  "rag_min_similarity": 0.7,     // Minimum similarity threshold
  "rag_system_prompt": "You are..."  // Custom system prompt
}
```

## Testing

### Manual Test via UI
1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3000/chat
3. Type a question and press Enter
4. Watch streaming response
5. Click "View Context" to see retrieved reviews

### API Test Script
```bash
# Start server in one terminal
npm run dev

# Run test script in another
npm run test:chat
```

### Expected Output
```
🧪 Testing Chat API with RAG

📝 Sending message: "What are the main complaints from users?"

✅ Connection established, streaming response...

📊 Metadata received:
  - Reviews used: 10
  - Avg similarity: 82.3%
  - AI Model: gemini-1.5-pro
  - Sentiment breakdown:
    • Positive: 2
    • Neutral: 3
    • Negative: 5
  - Key themes: bugs, performance, crashes

📝 Top 3 most relevant reviews:
  1. John Doe - 2⭐ (95% match)
     "App keeps crashing"
     The app crashes every time I try to upload...

💬 AI Response:

Based on 10 reviews, the main complaints are:
1. **Crashes and Stability** (5 reviews)...
```

## Performance

- **Latency**: ~500ms to first token (embedding + search)
- **Throughput**: ~50 tokens/second (streaming)
- **Vector Search**: <100ms for 10k reviews (pgvector with HNSW index)
- **Context Size**: ~3000 tokens (10 reviews × 300 tokens avg)

## Troubleshooting

### No Reviews Retrieved
- Check if reviews have embeddings: `SELECT COUNT(*) FROM reviews WHERE embedding IS NOT NULL`
- Verify pgvector extension: `SELECT * FROM pg_extension WHERE extname = 'vector'`
- Check similarity threshold (try lowering `rag_min_similarity`)

### Slow Responses
- Add index: `CREATE INDEX ON reviews USING hnsw (embedding vector_cosine_ops)`
- Reduce `rag_top_k` value
- Use smaller embedding model

### Empty Streaming Response
- Check AI API keys (GOOGLE_AI_API_KEY or OPENAI_API_KEY)
- Verify Firebase Remote Config connection
- Check browser console for SSE errors

## Future Enhancements

- [ ] Conversation persistence (save chat history to database)
- [ ] Multi-app queries ("Compare sentiment across all my apps")
- [ ] Time-based filtering ("Show reviews from last week")
- [ ] Export chat transcripts
- [ ] Voice input/output
- [ ] Suggested follow-up questions
- [ ] Citation links to source reviews
- [ ] Real-time notifications when new insights are available
