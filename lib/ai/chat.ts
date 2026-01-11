/**
 * Chat Service with Streaming Support
 * Integrates RAG pipeline with Vercel AI SDK for streaming responses
 */

import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";
import { executeRAGPipeline, type RAGContext } from "./rag";
import { getRemoteConfig } from "../firebase/remote-config";
import type { RAGOptions } from "./rag";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatOptions extends RAGOptions {
  conversationHistory?: ChatMessage[];
  stream?: boolean;
}

/**
 * Get the appropriate AI model based on Remote Config
 */
async function getAIModel(modelName?: string) {
  const config = await getRemoteConfig();
  const model = modelName || config.preferred_model;

  // Map model names to AI SDK providers
  if (model.startsWith("gemini")) {
    return google(model);
  } else if (model.startsWith("gpt")) {
    return openai(model);
  } else {
    // Default to gemini-1.5-pro
    return google("gemini-1.5-pro");
  }
}

/**
 * Generate a chat response with RAG context (streaming)
 */
export async function generateRAGChatStream(
  query: string,
  options: ChatOptions = {}
) {
  // Execute RAG pipeline to get context
  const ragResult = await executeRAGPipeline(query, options);

  // Get AI model
  const model = await getAIModel(ragResult.context.model);

  // Build messages array
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: ragResult.prompts.systemPrompt,
    },
  ];

  // Add conversation history if provided
  if (options.conversationHistory) {
    messages.push(...options.conversationHistory);
  }

  // Add current user query with context
  messages.push({
    role: "user",
    content: ragResult.prompts.userPrompt,
  });

  // Stream the response
  const result = await streamText({
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: 0.7,
  });

  return {
    textStream: result.textStream,
    fullStream: result.fullStream,
    context: ragResult.context,
    metadata: ragResult.metadata,
  };
}

/**
 * Generate a chat response with RAG context (non-streaming)
 */
export async function generateRAGChatResponse(
  query: string,
  options: ChatOptions = {}
): Promise<{
  response: string;
  context: RAGContext;
  metadata: any;
}> {
  // Execute RAG pipeline to get context
  const ragResult = await executeRAGPipeline(query, options);

  // Get AI model
  const model = await getAIModel(ragResult.context.model);

  // Build messages array
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: ragResult.prompts.systemPrompt,
    },
  ];

  // Add conversation history if provided
  if (options.conversationHistory) {
    messages.push(...options.conversationHistory);
  }

  // Add current user query with context
  messages.push({
    role: "user",
    content: ragResult.prompts.userPrompt,
  });

  // Generate the response
  const result = await generateText({
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: 0.7,
  });

  return {
    response: result.text,
    context: ragResult.context,
    metadata: ragResult.metadata,
  };
}

/**
 * Simple chat without RAG (direct LLM query)
 * Useful for general questions not requiring review context
 */
export async function generateSimpleChat(
  query: string,
  options: {
    conversationHistory?: ChatMessage[];
    model?: string;
    stream?: boolean;
  } = {}
) {
  const model = await getAIModel(options.model);

  const messages: ChatMessage[] = [];

  // Add conversation history if provided
  if (options.conversationHistory) {
    messages.push(...options.conversationHistory);
  }

  // Add current user query
  messages.push({
    role: "user",
    content: query,
  });

  if (options.stream) {
    const result = await streamText({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
    });

    return {
      textStream: result.textStream,
      fullStream: result.fullStream,
    };
  } else {
    const result = await generateText({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
    });

    return {
      response: result.text,
    };
  }
}

/**
 * Test chat functionality
 */
export async function testChat(): Promise<boolean> {
  try {
    console.log("Testing chat service...");

    // Test simple chat (no RAG)
    console.log("\n1. Testing simple chat...");
    const simpleResult = await generateSimpleChat(
      "What is ReviewGPT?",
      { stream: false }
    );
    console.log("✓ Simple chat response:", simpleResult.response?.substring(0, 100) + "...");

    // Test RAG chat (requires reviews in database)
    console.log("\n2. Testing RAG chat...");
    try {
      const ragResult = await generateRAGChatResponse(
        "What are the main issues users are experiencing?",
        {
          maxReviews: 5,
          similarityThreshold: 0.3,
        }
      );

      console.log(`✓ RAG response generated with ${ragResult.context.reviewCount} reviews`);
      console.log(`  Average similarity: ${(ragResult.context.avgSimilarity * 100).toFixed(1)}%`);
      console.log(`  Response preview: ${ragResult.response.substring(0, 100)}...`);
    } catch (error: any) {
      if (error.message?.includes("No reviews")) {
        console.log("⚠️  No reviews found for RAG test (expected if DB is empty)");
      } else {
        throw error;
      }
    }

    return true;
  } catch (error) {
    console.error("✗ Chat test failed:", error);
    return false;
  }
}
