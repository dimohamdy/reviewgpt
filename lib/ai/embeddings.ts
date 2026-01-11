/**
 * Embedding Generation Service
 * Supports both Google (text-embedding-004) and OpenAI (text-embedding-3-small)
 * Provider selection via Firebase Remote Config
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { getConfigValue } from "../firebase/remote-config";

export type EmbeddingProvider = "google" | "openai";

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  provider: EmbeddingProvider;
}

/**
 * Google AI (Gemini) embedding client
 */
class GoogleEmbeddingClient {
  private client: GoogleGenerativeAI;
  private model = "text-embedding-004";

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: this.model });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const model = this.client.getGenerativeModel({ model: this.model });

    const results = await Promise.all(
      texts.map((text) => model.embedContent(text))
    );

    return results.map((result) => result.embedding.values);
  }

  getDimensions(): number {
    return 768; // text-embedding-004 dimensions
  }
}

/**
 * OpenAI embedding client
 */
class OpenAIEmbeddingClient {
  private client: OpenAI;
  private model = "text-embedding-3-small";

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
      encoding_format: "float",
    });

    return response.data.map((item) => item.embedding);
  }

  getDimensions(): number {
    return 1536; // text-embedding-3-small dimensions
  }
}

/**
 * Embedding service singleton
 */
class EmbeddingService {
  private googleClient: GoogleEmbeddingClient | null = null;
  private openaiClient: OpenAIEmbeddingClient | null = null;

  private getGoogleClient(): GoogleEmbeddingClient {
    if (!this.googleClient) {
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "GOOGLE_AI_API_KEY environment variable is not set"
        );
      }
      this.googleClient = new GoogleEmbeddingClient(apiKey);
    }
    return this.googleClient;
  }

  private getOpenAIClient(): OpenAIEmbeddingClient {
    if (!this.openaiClient) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is not set");
      }
      this.openaiClient = new OpenAIEmbeddingClient(apiKey);
    }
    return this.openaiClient;
  }

  async generateEmbedding(
    text: string,
    provider?: EmbeddingProvider
  ): Promise<EmbeddingResult> {
    // Get provider from Remote Config if not specified
    if (!provider) {
      provider = await getConfigValue("embedding_provider");
    }

    let embedding: number[];
    let dimensions: number;

    if (provider === "google") {
      const client = this.getGoogleClient();
      embedding = await client.generateEmbedding(text);
      dimensions = client.getDimensions();
    } else if (provider === "openai") {
      const client = this.getOpenAIClient();
      embedding = await client.generateEmbedding(text);
      dimensions = client.getDimensions();
    } else {
      throw new Error(`Unknown embedding provider: ${provider}`);
    }

    return {
      embedding,
      dimensions,
      provider,
    };
  }

  async generateEmbeddingsBatch(
    texts: string[],
    provider?: EmbeddingProvider
  ): Promise<EmbeddingResult[]> {
    // Get provider from Remote Config if not specified
    if (!provider) {
      provider = await getConfigValue("embedding_provider");
    }

    let embeddings: number[][];
    let dimensions: number;

    if (provider === "google") {
      const client = this.getGoogleClient();
      embeddings = await client.generateEmbeddingsBatch(texts);
      dimensions = client.getDimensions();
    } else if (provider === "openai") {
      const client = this.getOpenAIClient();
      embeddings = await client.generateEmbeddingsBatch(texts);
      dimensions = client.getDimensions();
    } else {
      throw new Error(`Unknown embedding provider: ${provider}`);
    }

    return embeddings.map((embedding) => ({
      embedding,
      dimensions,
      provider,
    }));
  }

  /**
   * Generate embedding for a review (combines title + content)
   */
  async generateReviewEmbedding(
    title: string,
    content: string,
    provider?: EmbeddingProvider
  ): Promise<EmbeddingResult> {
    const text = `${title}\n\n${content}`.trim();
    return this.generateEmbedding(text, provider);
  }

  /**
   * Batch generate embeddings for multiple reviews
   */
  async generateReviewEmbeddingsBatch(
    reviews: Array<{ title: string; content: string }>,
    provider?: EmbeddingProvider
  ): Promise<EmbeddingResult[]> {
    const texts = reviews.map(
      (review) => `${review.title}\n\n${review.content}`.trim()
    );
    return this.generateEmbeddingsBatch(texts, provider);
  }

  /**
   * Test embedding generation with both providers
   */
  async testEmbeddings(): Promise<{
    google: boolean;
    openai: boolean;
  }> {
    const testText = "This is a test review for embedding generation.";
    const results = {
      google: false,
      openai: false,
    };

    // Test Google
    try {
      const result = await this.generateEmbedding(testText, "google");
      console.log(
        `✓ Google embeddings: ${result.dimensions} dimensions`
      );
      results.google = true;
    } catch (error) {
      console.error("✗ Google embeddings failed:", error);
    }

    // Test OpenAI
    try {
      const result = await this.generateEmbedding(testText, "openai");
      console.log(
        `✓ OpenAI embeddings: ${result.dimensions} dimensions`
      );
      results.openai = true;
    } catch (error) {
      console.error("✗ OpenAI embeddings failed:", error);
    }

    return results;
  }
}

// Export singleton instance
const embeddingService = new EmbeddingService();

export {
  embeddingService,
  EmbeddingService,
  GoogleEmbeddingClient,
  OpenAIEmbeddingClient,
};

// Export convenience functions
export const generateEmbedding = (text: string, provider?: EmbeddingProvider) =>
  embeddingService.generateEmbedding(text, provider);

export const generateEmbeddingsBatch = (
  texts: string[],
  provider?: EmbeddingProvider
) => embeddingService.generateEmbeddingsBatch(texts, provider);

export const generateReviewEmbedding = (
  title: string,
  content: string,
  provider?: EmbeddingProvider
) => embeddingService.generateReviewEmbedding(title, content, provider);

export const generateReviewEmbeddingsBatch = (
  reviews: Array<{ title: string; content: string }>,
  provider?: EmbeddingProvider
) => embeddingService.generateReviewEmbeddingsBatch(reviews, provider);
