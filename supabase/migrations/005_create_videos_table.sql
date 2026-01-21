-- Create videos table for external video content
-- Videos are linked to channels and display curated content

CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  thumbnail_url VARCHAR(500),
  video_url VARCHAR(500) NOT NULL,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  views VARCHAR(50), -- Display string like "1.2M views"
  duration VARCHAR(20), -- Display string like "58:24"
  description TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS videos_slug_idx ON public.videos(slug);
CREATE INDEX IF NOT EXISTS videos_channel_id_idx ON public.videos(channel_id);
CREATE INDEX IF NOT EXISTS videos_is_featured_idx ON public.videos(is_featured);
CREATE INDEX IF NOT EXISTS videos_published_at_idx ON public.videos(published_at DESC);

-- Enable Row Level Security
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read videos
CREATE POLICY "Videos are viewable by everyone"
  ON public.videos
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert videos
CREATE POLICY "Admins can insert videos"
  ON public.videos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can update videos
CREATE POLICY "Admins can update videos"
  ON public.videos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can delete videos
CREATE POLICY "Admins can delete videos"
  ON public.videos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to update updated_at on video update
DROP TRIGGER IF EXISTS update_videos_updated_at ON public.videos;
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
