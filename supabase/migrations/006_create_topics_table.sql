-- Create topics table for trending/featured content sections
-- Topics are curated content highlights shown on the homepage

CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  excerpt TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url VARCHAR(500),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS topics_slug_idx ON public.topics(slug);
CREATE INDEX IF NOT EXISTS topics_category_id_idx ON public.topics(category_id);
CREATE INDEX IF NOT EXISTS topics_is_featured_idx ON public.topics(is_featured);
CREATE INDEX IF NOT EXISTS topics_display_order_idx ON public.topics(display_order);

-- Enable Row Level Security
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read topics
CREATE POLICY "Topics are viewable by everyone"
  ON public.topics
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert topics
CREATE POLICY "Admins can insert topics"
  ON public.topics
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can update topics
CREATE POLICY "Admins can update topics"
  ON public.topics
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can delete topics
CREATE POLICY "Admins can delete topics"
  ON public.topics
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to update updated_at on topic update
DROP TRIGGER IF EXISTS update_topics_updated_at ON public.topics;
CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
