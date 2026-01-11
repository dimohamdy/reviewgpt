-- ReviewGPT Database Initialization
-- Run this script on your Google Cloud SQL PostgreSQL instance

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create apps table
CREATE TABLE IF NOT EXISTS apps (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  app_id VARCHAR(255) NOT NULL,
  country VARCHAR(10) DEFAULT 'us',
  owned_by_me BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  total_reviews INT DEFAULT 0,
  average_rating DECIMAL(3,2),
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(platform, app_id, country)
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  app_id INT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  platform_review_id VARCHAR(255) NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  author VARCHAR(255),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  content TEXT,
  review_date TIMESTAMP,
  app_version VARCHAR(50),
  embedding vector(768), -- Default to Google embedding dimensions
  embedding_provider VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(platform_review_id, app_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_app_id ON reviews(app_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(review_date DESC);

-- Create pgvector index for similarity search (IVFFlat)
-- Note: This should be created AFTER you have some data (at least 100-1000 reviews)
-- For now, we'll use a simple index. Uncomment and adjust 'lists' parameter based on your data size:
-- CREATE INDEX IF NOT EXISTS idx_reviews_embedding ON reviews
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- For immediate use with small datasets, use a simpler index:
CREATE INDEX IF NOT EXISTS idx_reviews_embedding ON reviews
USING ivfflat (embedding vector_cosine_ops);

-- Verify installation
SELECT
  'pgvector extension installed: ' || CASE WHEN EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN 'YES ✓' ELSE 'NO ✗' END as status;

-- Show table structure
\d apps
\d reviews
