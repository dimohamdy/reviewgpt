import {
  pgTable,
  serial,
  varchar,
  boolean,
  integer,
  decimal,
  timestamp,
  text,
  unique,
  check,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const apps = pgTable(
  "apps",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    platform: varchar("platform", { length: 10 }).notNull(),
    appId: varchar("app_id", { length: 255 }).notNull(),
    country: varchar("country", { length: 10 }).default("us"),
    ownedByMe: boolean("owned_by_me").default(false),
    status: varchar("status", { length: 20 }).default("active"),
    totalReviews: integer("total_reviews").default(0),
    averageRating: decimal("average_rating", { precision: 3, scale: 2 }),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    platformAppIdCountryUnique: unique().on(
      table.platform,
      table.appId,
      table.country
    ),
    platformCheck: check("platform_check", sql`${table.platform} IN ('ios', 'android')`),
  })
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    platformReviewId: varchar("platform_review_id", { length: 255 }).notNull(),
    platform: varchar("platform", { length: 10 }).notNull(),
    author: varchar("author", { length: 255 }),
    rating: integer("rating").notNull(),
    title: text("title"),
    content: text("content"),
    reviewDate: timestamp("review_date"),
    appVersion: varchar("app_version", { length: 50 }),
    // Note: Drizzle doesn't have native pgvector support yet, so we'll use a custom type
    // We'll need to handle this manually in queries
    // embedding: vector("embedding", { dimensions: 768 }),
    embeddingProvider: varchar("embedding_provider", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    platformReviewIdAppIdUnique: unique().on(
      table.platformReviewId,
      table.appId
    ),
    appIdIdx: index("idx_reviews_app_id").on(table.appId),
    ratingIdx: index("idx_reviews_rating").on(table.rating),
    reviewDateIdx: index("idx_reviews_date").on(table.reviewDate),
    platformCheck: check("reviews_platform_check", sql`${table.platform} IN ('ios', 'android')`),
    ratingCheck: check("reviews_rating_check", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
  })
);
