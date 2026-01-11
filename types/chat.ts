import { Review } from "./review";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  contextReviews?: Review[];
}

export interface ChatRequest {
  messages: {
    role: "user" | "assistant";
    content: string;
  }[];
  appId?: number;
}

export interface RAGContext {
  query: string;
  reviews: Review[];
  systemInstructions: string;
  model: string;
}
