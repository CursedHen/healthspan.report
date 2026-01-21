"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type {
  DBArticle,
  DBArticleWithRelations,
  CreateArticleInput,
  UpdateArticleInput,
  ActionResult,
} from "@/types/database";

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function getArticles(options?: {
  status?: "draft" | "published" | "archived";
  categorySlug?: string;
  limit?: number;
  offset?: number;
}): Promise<ActionResult<DBArticleWithRelations[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("articles")
      .select(
        `
        *,
        category:categories(*),
        author:users(id, username, first_name, last_name)
      `
      )
      .order("published_at", { ascending: false, nullsFirst: false });

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    if (options?.categorySlug) {
      query = query.eq("category.slug", options.categorySlug);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: data as DBArticleWithRelations[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch articles" };
  }
}

export async function getArticleBySlug(
  slug: string
): Promise<ActionResult<DBArticleWithRelations>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("articles")
      .select(
        `
        *,
        category:categories(*),
        author:users(id, username, first_name, last_name)
      `
      )
      .eq("slug", slug)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as DBArticleWithRelations };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch article" };
  }
}

export async function getArticleById(
  id: string
): Promise<ActionResult<DBArticleWithRelations>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("articles")
      .select(
        `
        *,
        category:categories(*),
        author:users(id, username, first_name, last_name)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as DBArticleWithRelations };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch article" };
  }
}

// ============================================================================
// WRITE OPERATIONS (Admin only - enforced by RLS)
// ============================================================================

export async function createArticle(
  input: CreateArticleInput
): Promise<ActionResult<DBArticle>> {
  try {
    const supabase = await createClient();

    // Get current user to set as author
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("articles")
      .insert({
        ...input,
        author_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/articles");
    revalidatePath("/");

    return { data: data as DBArticle };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create article" };
  }
}

export async function updateArticle(
  id: string,
  input: UpdateArticleInput
): Promise<ActionResult<DBArticle>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("articles")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/articles");
    revalidatePath(`/articles/${data.slug}`);
    revalidatePath("/");

    return { data: data as DBArticle };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update article" };
  }
}

export async function deleteArticle(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("articles").delete().eq("id", id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/articles");
    revalidatePath("/");

    return { data: undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete article" };
  }
}

export async function publishArticle(id: string): Promise<ActionResult<DBArticle>> {
  return updateArticle(id, { status: "published" });
}

export async function unpublishArticle(id: string): Promise<ActionResult<DBArticle>> {
  return updateArticle(id, { status: "draft" });
}

export async function archiveArticle(id: string): Promise<ActionResult<DBArticle>> {
  return updateArticle(id, { status: "archived" });
}
