-- Create channels table for external content creators
-- Channels represent YouTube channels or other content sources

CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  subscriber_count VARCHAR(50), -- Display string like "2.1M"
  avatar_url VARCHAR(500),
  channel_url VARCHAR(500),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS channels_slug_idx ON public.channels(slug);
CREATE INDEX IF NOT EXISTS channels_is_featured_idx ON public.channels(is_featured);

-- Enable Row Level Security
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read channels
CREATE POLICY "Channels are viewable by everyone"
  ON public.channels
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert channels
CREATE POLICY "Admins can insert channels"
  ON public.channels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can update channels
CREATE POLICY "Admins can update channels"
  ON public.channels
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can delete channels
CREATE POLICY "Admins can delete channels"
  ON public.channels
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to update updated_at on channel update
DROP TRIGGER IF EXISTS update_channels_updated_at ON public.channels;
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
