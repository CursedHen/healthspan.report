"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type {
  DBTopic,
  DBTopicWithCategory,
  CreateTopicInput,
  UpdateTopicInput,
  ActionResult,
} from "@/types/database";

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function getTopics(options?: {
  categorySlug?: string;
  featured?: boolean;
  limit?: number;
}): Promise<ActionResult<DBTopicWithCategory[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("topics")
      .select(
        `
        *,
        category:categories(*)
      `
      )
      .order("display_order")
      .order("created_at", { ascending: false });

    if (options?.categorySlug) {
      query = query.eq("category.slug", options.categorySlug);
    }

    if (options?.featured !== undefined) {
      query = query.eq("is_featured", options.featured);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: data as DBTopicWithCategory[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch topics" };
  }
}

export async function getTopicBySlug(
  slug: string
): Promise<ActionResult<DBTopicWithCategory>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("topics")
      .select(
        `
        *,
        category:categories(*)
      `
      )
      .eq("slug", slug)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as DBTopicWithCategory };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch topic" };
  }
}

export async function getTopicById(
  id: string
): Promise<ActionResult<DBTopicWithCategory>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("topics")
      .select(
        `
        *,
        category:categories(*)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as DBTopicWithCategory };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch topic" };
  }
}

// ============================================================================
// WRITE OPERATIONS (Admin only - enforced by RLS)
// ============================================================================

export async function createTopic(
  input: CreateTopicInput
): Promise<ActionResult<DBTopic>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("topics")
      .insert(input)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/topics");
    revalidatePath("/");

    return { data: data as DBTopic };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create topic" };
  }
}

export async function updateTopic(
  id: string,
  input: UpdateTopicInput
): Promise<ActionResult<DBTopic>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("topics")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/topics");
    revalidatePath(`/topics/${data.slug}`);
    revalidatePath("/");

    return { data: data as DBTopic };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update topic" };
  }
}

export async function deleteTopic(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("topics").delete().eq("id", id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/topics");
    revalidatePath("/");

    return { data: undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete topic" };
  }
}

export async function toggleTopicFeatured(
  id: string,
  featured: boolean
): Promise<ActionResult<DBTopic>> {
  return updateTopic(id, { is_featured: featured });
}

export async function reorderTopics(
  orderedIds: string[]
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Update each topic's display_order based on position in array
    const updates = orderedIds.map((id, index) =>
      supabase.from("topics").update({ display_order: index }).eq("id", id)
    );

    const results = await Promise.all(updates);
    const error = results.find((r) => r.error)?.error;

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/topics");
    revalidatePath("/");

    return { data: undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to reorder topics" };
  }
}
