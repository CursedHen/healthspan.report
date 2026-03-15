"use client";

import { useEffect, useMemo, useState } from "react";
import { Header, Footer } from "@/components/layout";
import { EditorialPageIntro, VideoThumbnail } from "@/components/ui";
import { extractYouTubeVideoId } from "@/lib/rss/rssFetcher";
import type { Video } from "@/types";
import type { RSSAPIResponse, RSSSource } from "@/types/rss";
import styles from "./page.module.css";

function mapRSSToVideos(sources: RSSSource[]): Video[] {
  const videos: Video[] = [];

  for (const source of sources) {
    for (const item of source.articles) {
      const videoId = extractYouTubeVideoId(item.link);
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
        publishedAt: item.pubDate,
        duration: "",
        videoUrl: item.link,
      });
    }
  }

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
        setVideos(mapRSSToVideos(data.sources));
      } catch (err) {
        console.error("Failed to fetch RSS videos:", err);
        setError("Failed to load videos. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchVideos();
  }, []);

  const featuredVideo = videos[0];
  const remainingVideos = useMemo(() => videos.slice(1), [videos]);

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <EditorialPageIntro
            badge="Video Feed"
            title="Videos"
            description="Latest healthspan videos from channels and experts tracked across your source list."
          />

          {isLoading ? (
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeleton} />
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
            <>
              {featuredVideo && (
                <section className={styles.featuredSection}>
                  <h2 className={styles.sectionTitle}>Featured Video</h2>
                  <div className={styles.featuredWrap}>
                    <VideoThumbnail video={featuredVideo} variant="large" />
                  </div>
                </section>
              )}

              <section>
                <h2 className={styles.sectionTitle}>More Videos</h2>
                <div className={styles.grid}>
                  {remainingVideos.map((video) => (
                    <VideoThumbnail key={video.id} video={video} />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
