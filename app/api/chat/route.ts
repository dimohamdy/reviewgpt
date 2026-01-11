/**
 * Chat API with RAG and Streaming
 * POST /api/chat - Generate AI response with review context
 */

import { generateRAGChatStream } from "@/lib/ai/chat";
import { z } from "zod";

// Schema for chat request
const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  appId: z.number().optional(),
  platform: z.enum(["ios", "android"]).optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = ChatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Validation failed",
          details: validationResult.error.issues,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = validationResult.data;

    // Generate RAG chat response with streaming
    const result = await generateRAGChatStream(data.message, {
      appId: data.appId,
      platform: data.platform,
      conversationHistory: data.conversationHistory,
    });

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata first
          const metadata = {
            type: "metadata",
            data: {
              reviewCount: result.context.reviewCount,
              avgSimilarity: result.context.avgSimilarity,
              model: result.context.model,
              sentiment: result.metadata.sentiment,
              themes: result.metadata.themes,
              reviews: result.context.reviews.map((review: any) => ({
                id: review.id,
                author: review.author,
                rating: review.rating,
                title: review.title,
                content: review.content,
                similarity: review.similarity,
              })),
            },
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`)
          );

          // Stream the text response
          for await (const chunk of result.textStream) {
            const data = {
              type: "text",
              data: chunk,
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }

          // Send completion signal
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done" })}\n\n`
            )
          );
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: "Streaming failed" })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Chat API error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to generate response",
        message: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
