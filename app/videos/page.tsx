"use client";

import { useState, useEffect } from "react";
import { Header, Footer } from "@/components/layout";
import { VideoThumbnail } from "@/components/ui";
import {
  formatRelativeDate,
  extractYouTubeVideoId,
} from "@/lib/rss/rssFetcher";
import type { Video } from "@/types";
import type { RSSAPIResponse, RSSSource } from "@/types/rss";
import styles from "./page.module.css";

function mapRSSToVideos(sources: RSSSource[]): Video[] {
  const videos: Video[] = [];

  for (const source of sources) {
    for (const item of source.articles) {
      const videoId = extractYouTubeVideoId(item.link);
      // Priority: item thumbnail > generated YouTube thumbnail > source image > placeholder
      const thumbnail =
        item.thumbnail ||
        (videoId
          ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
          : source.source.image || "/images/placeholders/video.svg");

      videos.push({
        id: item.link,
        title: item.title,
        thumbnailUrl: thumbnail,
        channelName: source.source.title,
        views: "",
        publishedAt: formatRelativeDate(item.pubDate),
        duration: "",
        videoUrl: item.link,
      });
    }
  }

  // Sort by date
  return videos.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch("/api/rss?type=video");
        if (!response.ok) throw new Error("Failed to fetch videos");

        const data: RSSAPIResponse = await response.json();
        const mappedVideos = mapRSSToVideos(data.sources);
        setVideos(mappedVideos);
      } catch (err) {
        console.error("Failed to fetch RSS videos:", err);
        setError("Failed to load videos. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchVideos();
  }, []);

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Videos</h1>
            <p className={styles.subtitle}>
              Curated videos from the best longevity researchers and health
              experts.
            </p>
          </div>

          {isLoading ? (
            <div className={styles.grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeleton}>
                  <div className={styles.skeletonImage} />
                  <div className={styles.skeletonContent}>
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonMeta} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          ) : videos.length === 0 ? (
            <div className={styles.empty}>
              <p>No videos available at the moment.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {videos.map((video) => (
                <VideoThumbnail key={video.id} video={video} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
