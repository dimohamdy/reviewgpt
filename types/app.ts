export interface App {
  id: number;
  name: string;
  platform: "ios" | "android";
  appId: string;
  country: string | null;
  ownedByMe: boolean | null;
  status: string | null;
  totalReviews: number | null;
  averageRating: string | null; // decimal type from PostgreSQL
  lastSyncedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateAppInput {
  name: string;
  platform: "ios" | "android";
  appId: string;
  country?: string;
  ownedByMe?: boolean;
}

export interface UpdateAppInput {
  name?: string;
  status?: "active" | "paused";
  country?: string;
}

export interface AppStats {
  totalApps: number;
  totalReviews: number;
  averageRating: number;
  lastSyncedAt: Date | null;
}
