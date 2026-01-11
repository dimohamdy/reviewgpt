/**
 * App Management API
 * GET  /api/apps - List all apps
 * POST /api/apps - Create a new app
 */

import { NextResponse } from "next/server";
import { getAllApps, createApp } from "@/lib/db/queries";
import { z } from "zod";

// Schema for creating an app
const CreateAppSchema = z.object({
  name: z.string().min(1, "App name is required"),
  platform: z.enum(["ios", "android"], {
    message: "Platform must be 'ios' or 'android'",
  }),
  appId: z.string().min(1, "App ID is required"),
  country: z.string().length(2).optional().default("us"),
  ownedByMe: z.boolean().optional().default(false),
  appStoreConnectId: z.string().optional(), // For owned iOS apps
});

export async function GET() {
  try {
    const apps = await getAllApps();

    return NextResponse.json({
      success: true,
      data: apps,
      count: apps.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch apps:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch apps",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = CreateAppSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Create app
    const app = await createApp({
      name: data.name,
      platform: data.platform,
      appId: data.appId,
      country: data.country,
      ownedByMe: data.ownedByMe,
    });

    return NextResponse.json(
      {
        success: true,
        data: app,
        message: "App created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to create app:", error);

    // Handle unique constraint violations
    if (error.code === "23505" || error.message?.includes("duplicate")) {
      return NextResponse.json(
        {
          success: false,
          error: "App already exists",
          message: "An app with this platform, app ID, and country already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create app",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
