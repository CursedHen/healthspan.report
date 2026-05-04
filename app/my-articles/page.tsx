"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Header, Footer } from "@/components/layout";
import styles from "./page.module.css";

type SavedArticle = {
  id: string;
  title: string;
  url: string;
  source: string | null;
  summary: string | null;
  saved_at: string;
  tags: string[];
};

export default function MyArticlesPage() {
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data, error } = await supabase
        .from("saved_articles")
        .select("*")
        .order("saved_at", { ascending: false });

      if (!error && data) setArticles(data);
      setLoading(false);
    }
    void load();
  }, []);

  async function handleUnsave(id: string) {
    await supabase.from("saved_articles").delete().eq("id", id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.heading}>My Saved Articles</h1>
          {loading && <p>Loading…</p>}
          {!loading && articles.length === 0 && (
            <p className={styles.empty}>
              You haven't saved any articles yet.{" "}
              <Link href="/">Browse the library</Link>
            </p>
          )}
          <div className={styles.list}>
            {articles.map((article) => (
              <div key={article.id} className={styles.item}>
                <div className={styles.itemContent}>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className={styles.itemTitle}>
                    {article.title}
                  </a>
                  {article.source && <p className={styles.itemSource}>{article.source}</p>}
                  {article.summary && <p className={styles.itemSummary}>{article.summary}</p>}
                  <p className={styles.itemDate}>
                    Saved {new Date(article.saved_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.unsaveButton}
                  onClick={() => handleUnsave(article.id)}
                  aria-label="Remove article"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}