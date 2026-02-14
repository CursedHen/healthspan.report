-- Migration: Update RSS sources for longevity content sourcing strategy
-- 
-- This migration:
-- 1. Deactivates old YouTube RSS feeds that are being replaced
-- 2. Updates existing feeds with corrected URLs/metadata
-- 3. Prepares for new feed sources to be added via seed

-- Deactivate old YouTube feeds that are being removed
-- Peter Attia's old YouTube channel
UPDATE public.rss_sources
SET is_active = false, updated_at = NOW()
WHERE feed_url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCIaH-gZIVC432YRjNVvnyCA';

-- Old FoundMyFitness YouTube channel (different channel ID)
UPDATE public.rss_sources
SET is_active = false, updated_at = NOW()
WHERE feed_url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCNI0qOojpkhsUtaQ4_2NUhQ';

-- Deactivate feeds that are no longer in our config
UPDATE public.rss_sources
SET is_active = false, updated_at = NOW()
WHERE feed_url = 'https://www.foundmyfitness.com/feed';

UPDATE public.rss_sources
SET is_active = false, updated_at = NOW()
WHERE feed_url = 'https://examine.com/feed/';

-- Ensure lifespan.io stays as 'topic' content type for Trending Topics section
-- Also handle URL variation (with or without www)
UPDATE public.rss_sources
SET content_type = 'topic', updated_at = NOW()
WHERE feed_url LIKE '%lifespan.io/feed%';

-- Ensure fightaging.org stays as 'topic' content type for Trending Topics section
UPDATE public.rss_sources
SET content_type = 'topic', updated_at = NOW()
WHERE feed_url LIKE '%fightaging.org/feed%';

-- Add comment for documentation
COMMENT ON TABLE public.rss_sources IS 'RSS feed sources for content ingestion. Updated 2026-01-27 for longevity content strategy with YouTube (Huberman Lab, Dave Pascoe, FoundMyFitness) and article feeds (Lifespan.io, Fight Aging!, Peter Attia MD, Longevity.Technology, NOVOS Labs)';
