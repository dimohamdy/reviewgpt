/**
 * Test script for Chat API with RAG
 * Tests the complete chat workflow including streaming
 */

import "dotenv/config";

interface StreamData {
  type: "metadata" | "text" | "done" | "error";
  data?: any;
  error?: string;
}

async function testChatAPI() {
  console.log("🧪 Testing Chat API with RAG\n");

  const testMessage = "What are the main complaints from users?";

  console.log(`📝 Sending message: "${testMessage}"\n`);

  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: testMessage,
        conversationHistory: [],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error || response.statusText}`);
    }

    console.log("✅ Connection established, streaming response...\n");

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    let fullResponse = "";
    let metadata: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data: StreamData = JSON.parse(line.slice(6));

            if (data.type === "metadata") {
              metadata = data.data;
              console.log("📊 Metadata received:");
              console.log(`  - Reviews used: ${metadata.reviewCount}`);
              console.log(`  - Avg similarity: ${(metadata.avgSimilarity * 100).toFixed(1)}%`);
              console.log(`  - AI Model: ${metadata.model}`);

              if (metadata.sentiment) {
                console.log(`  - Sentiment breakdown:`);
                console.log(`    • Positive: ${metadata.sentiment.positive}`);
                console.log(`    • Neutral: ${metadata.sentiment.neutral}`);
                console.log(`    • Negative: ${metadata.sentiment.negative}`);
              }

              if (metadata.themes && metadata.themes.length > 0) {
                console.log(`  - Key themes: ${metadata.themes.join(", ")}`);
              }

              if (metadata.reviews && metadata.reviews.length > 0) {
                console.log(`  - Sample reviews retrieved: ${metadata.reviews.length}`);
                console.log(`\n📝 Top 3 most relevant reviews:`);
                metadata.reviews.slice(0, 3).forEach((review: any, idx: number) => {
                  console.log(`\n  ${idx + 1}. ${review.author} - ${review.rating}⭐ (${(review.similarity * 100).toFixed(0)}% match)`);
                  console.log(`     "${review.title}"`);
                  console.log(`     ${review.content.substring(0, 100)}...`);
                });
              }

              console.log("\n💬 AI Response:\n");
            } else if (data.type === "text") {
              fullResponse += data.data;
              process.stdout.write(data.data);
            } else if (data.type === "done") {
              console.log("\n\n✅ Stream completed successfully");
            } else if (data.type === "error") {
              throw new Error(`Stream error: ${data.error}`);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }

    console.log("\n\n📈 Summary:");
    console.log(`  - Message: "${testMessage}"`);
    console.log(`  - Response length: ${fullResponse.length} characters`);
    console.log(`  - Reviews analyzed: ${metadata?.reviewCount || 0}`);
    console.log(`  - Model used: ${metadata?.model || "unknown"}`);

    console.log("\n✅ Chat API test completed successfully!");

  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the test
console.log("════════════════════════════════════════════════════════");
console.log("  ReviewGPT - Chat API Test");
console.log("════════════════════════════════════════════════════════\n");

testChatAPI();
