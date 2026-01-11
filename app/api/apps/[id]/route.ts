/**
 * Individual App API
 * GET    /api/apps/[id] - Get app details
 * PATCH  /api/apps/[id] - Update app
 * DELETE /api/apps/[id] - Delete app
 */

import { NextResponse } from "next/server";
import { getAppById, updateApp, deleteApp } from "@/lib/db/queries";
import { z } from "zod";

// Schema for updating an app
const UpdateAppSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["active", "paused"]).optional(),
  country: z.string().length(2).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid app ID",
        },
        { status: 400 }
      );
    }

    const app = await getAppById(id);

    if (!app) {
      return NextResponse.json(
        {
          success: false,
          error: "App not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: app,
    });
  } catch (error: any) {
    console.error("Failed to fetch app:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch app",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid app ID",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = UpdateAppSchema.safeParse(body);

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

    // Check if app exists
    const existingApp = await getAppById(id);

    if (!existingApp) {
      return NextResponse.json(
        {
          success: false,
          error: "App not found",
        },
        { status: 404 }
      );
    }

    // Update app
    const updatedApp = await updateApp(id, data);

    return NextResponse.json({
      success: true,
      data: updatedApp,
      message: "App updated successfully",
    });
  } catch (error: any) {
    console.error("Failed to update app:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update app",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid app ID",
        },
        { status: 400 }
      );
    }

    // Check if app exists
    const existingApp = await getAppById(id);

    if (!existingApp) {
      return NextResponse.json(
        {
          success: false,
          error: "App not found",
        },
        { status: 404 }
      );
    }

    // Delete app (will cascade delete reviews)
    await deleteApp(id);

    return NextResponse.json({
      success: true,
      message: "App deleted successfully",
    });
  } catch (error: any) {
    console.error("Failed to delete app:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete app",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
