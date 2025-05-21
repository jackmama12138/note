/*
  # Create notes schema

  1. New Tables
    - `notes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text)
      - `content` (text)
      - `type` (text) - can be 'text', 'file', 'image', or 'link'
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `notes` table
    - Add policies for CRUD operations
*/

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  type text CHECK (type IN ('text', 'file', 'image', 'link')) DEFAULT 'text',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own notes"
  ON notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own notes"
  ON notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster searches
-- CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
-- CREATE INDEX IF NOT EXISTS notes_title_idx ON notes USING gin(to_tsvector('chinese', title));
-- CREATE INDEX IF NOT EXISTS notes_content_idx ON notes USING gin(to_tsvector('chinese', content));

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS notes_title_idx;
DROP INDEX IF EXISTS notes_content_idx;

-- Create new indexes with English text search configuration
CREATE INDEX IF NOT EXISTS notes_title_idx ON notes USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS notes_content_idx ON notes USING gin(to_tsvector('english', content));

-- Add trigram indexes for better partial text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS notes_title_trgm_idx ON notes USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS notes_content_trgm_idx ON notes USING gin (content gin_trgm_ops);