"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type {
  DBVideo,
  DBVideoWithChannel,
  CreateVideoInput,
  UpdateVideoInput,
  ActionResult,
} from "@/types/database";

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function getVideos(options?: {
  channelId?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ActionResult<DBVideoWithChannel[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("videos")
      .select(
        `
        *,
        channel:channels(*)
      `
      )
      .order("published_at", { ascending: false, nullsFirst: false });

    if (options?.channelId) {
      query = query.eq("channel_id", options.channelId);
    }

    if (options?.featured !== undefined) {
      query = query.eq("is_featured", options.featured);
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

    return { data: data as DBVideoWithChannel[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch videos" };
  }
}

export async function getVideoBySlug(
  slug: string
): Promise<ActionResult<DBVideoWithChannel>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("videos")
      .select(
        `
        *,
        channel:channels(*)
      `
      )
      .eq("slug", slug)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as DBVideoWithChannel };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch video" };
  }
}

export async function getVideoById(
  id: string
): Promise<ActionResult<DBVideoWithChannel>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("videos")
      .select(
        `
        *,
        channel:channels(*)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as DBVideoWithChannel };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch video" };
  }
}

// ============================================================================
// WRITE OPERATIONS (Admin only - enforced by RLS)
// ============================================================================

export async function createVideo(
  input: CreateVideoInput
): Promise<ActionResult<DBVideo>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("videos")
      .insert(input)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/videos");
    revalidatePath("/");

    return { data: data as DBVideo };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create video" };
  }
}

export async function updateVideo(
  id: string,
  input: UpdateVideoInput
): Promise<ActionResult<DBVideo>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("videos")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/videos");
    revalidatePath(`/videos/${data.slug}`);
    revalidatePath("/");

    return { data: data as DBVideo };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update video" };
  }
}

export async function deleteVideo(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("videos").delete().eq("id", id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/videos");
    revalidatePath("/");

    return { data: undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete video" };
  }
}

export async function toggleVideoFeatured(
  id: string,
  featured: boolean
): Promise<ActionResult<DBVideo>> {
  return updateVideo(id, { is_featured: featured });
}
