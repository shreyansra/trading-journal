-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Create trades table
CREATE TABLE trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  quantity NUMERIC NOT NULL,
  entry_date TIMESTAMPTZ NOT NULL,
  exit_date TIMESTAMPTZ,
  pnl NUMERIC,
  fees NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  strategy_tags TEXT[] DEFAULT '{}',
  screenshot_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tags table
CREATE TABLE tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6'
);

-- Disable RLS (personal use, no auth needed)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Allow all operations without auth
CREATE POLICY "Allow all on trades" ON trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tags" ON tags FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('trade-screenshots', 'trade-screenshots', true);

-- Allow public access to screenshot storage
CREATE POLICY "Allow public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'trade-screenshots');
CREATE POLICY "Allow public read" ON storage.objects FOR SELECT USING (bucket_id = 'trade-screenshots');
CREATE POLICY "Allow public delete" ON storage.objects FOR DELETE USING (bucket_id = 'trade-screenshots');
