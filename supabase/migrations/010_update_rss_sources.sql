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

-- Update source images to use valid URLs
-- Huberman Lab
UPDATE public.rss_sources
SET 
  name = 'Huberman Lab',
  image_url = 'https://yt3.googleusercontent.com/5ONImZvpa9_wXBnVIA2LKd1xbM4sZ9f0PO3XjVk1dMKmkd4L-zHfPU-KSxRSfvvPmxDDLKsn=s176-c-k-c0x00ffffff-no-rj',
  updated_at = NOW()
WHERE feed_url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC2D2CMWXMOVWx7giW1n3LIg';

-- Dave Pascoe
UPDATE public.rss_sources
SET 
  name = 'Dave Pascoe',
  image_url = 'https://yt3.googleusercontent.com/ytc/AIdro_lK_5GQ3VXLiQ_VrpW8oYKFm3gq1D2JBw8pUV5D1A=s176-c-k-c0x00ffffff-no-rj',
  updated_at = NOW()
WHERE feed_url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC8kGsMa0LygSX9nkBcBH1Sg';

-- FoundMyFitness
UPDATE public.rss_sources
SET 
  image_url = 'https://yt3.googleusercontent.com/ytc/AIdro_nVl-GmqxNr1pHnAJxZY0WE7MFLaLfXSFSxWPTq=s176-c-k-c0x00ffffff-no-rj',
  updated_at = NOW()
WHERE feed_url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCWF8SqJVNlx-ctXbLswcTcA';

-- Lifespan.io
UPDATE public.rss_sources
SET 
  name = 'Lifespan.io',
  image_url = 'https://lifespan.io/wp-content/uploads/2023/07/cropped-lifespan-io-logo-180x180.png',
  updated_at = NOW()
WHERE feed_url LIKE '%lifespan.io/feed%';

-- Fight Aging!
UPDATE public.rss_sources
SET 
  image_url = 'https://www.fightaging.org/wp-content/uploads/2022/05/cropped-fa-favicon-192x192.png',
  updated_at = NOW()
WHERE feed_url LIKE '%fightaging.org/feed%';

-- Peter Attia MD
UPDATE public.rss_sources
SET 
  image_url = 'https://peterattiamd.com/wp-content/uploads/2021/04/cropped-PA-Logo-270x270.png',
  updated_at = NOW()
WHERE feed_url LIKE '%peterattiamd.com/feed%';

-- Longevity.Technology
UPDATE public.rss_sources
SET 
  image_url = 'https://longevity.technology/wp-content/uploads/2023/01/cropped-lt-favicon-192x192.png',
  updated_at = NOW()
WHERE feed_url LIKE '%longevity.technology/feed%';

-- NOVOS Labs
UPDATE public.rss_sources
SET 
  image_url = 'https://novoslabs.com/wp-content/uploads/2021/12/cropped-NOVOS-Favicon-192x192.png',
  updated_at = NOW()
WHERE feed_url LIKE '%novoslabs.com%';

-- Add comment for documentation
COMMENT ON TABLE public.rss_sources IS 'RSS feed sources for content ingestion. Updated 2026-01-27 for longevity content strategy with YouTube (Huberman Lab, Dave Pascoe, FoundMyFitness) and article feeds (Lifespan.io, Fight Aging!, Peter Attia MD, Longevity.Technology, NOVOS Labs)';
