-- Create categories table for organizing content
-- Categories are shared across articles and topics

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS categories_slug_idx ON public.categories(slug);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read categories
CREATE POLICY "Categories are viewable by everyone"
  ON public.categories
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert categories
CREATE POLICY "Admins can insert categories"
  ON public.categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can update categories
CREATE POLICY "Admins can update categories"
  ON public.categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can delete categories
CREATE POLICY "Admins can delete categories"
  ON public.categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to update updated_at on category update
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories based on mock data
INSERT INTO public.categories (name, slug, description) VALUES
  ('Cellular Health', 'cellular-health', 'Research and insights on cellular aging, senescence, and regeneration'),
  ('Supplements', 'supplements', 'Evidence-based supplement reviews and comparisons'),
  ('Research', 'research', 'Latest scientific studies and clinical trials on longevity'),
  ('Protocols', 'protocols', 'Health and longevity protocols from experts'),
  ('Fitness', 'fitness', 'Exercise science and optimal training for healthspan'),
  ('Nutrition', 'nutrition', 'Diet strategies and nutritional science for longevity'),
  ('Sleep', 'sleep', 'Sleep optimization and its impact on healthspan'),
  ('Mental Health', 'mental-health', 'Cognitive health, stress management, and brain longevity')
ON CONFLICT (slug) DO NOTHING;
