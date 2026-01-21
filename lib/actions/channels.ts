"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type {
  DBChannel,
  CreateChannelInput,
  UpdateChannelInput,
  ActionResult,
} from "@/types/database";

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function getChannels(options?: {
  featured?: boolean;
  limit?: number;
}): Promise<ActionResult<DBChannel[]>> {
  try {
    const supabase = await createClient();

    let query = supabase.from("channels").select("*").order("name");

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

    return { data: data as DBChannel[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch channels" };
  }
}

export async function getChannelBySlug(
  slug: string
): Promise<ActionResult<DBChannel>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as DBChannel };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch channel" };
  }
}

export async function getChannelById(
  id: string
): Promise<ActionResult<DBChannel>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as DBChannel };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch channel" };
  }
}

// ============================================================================
// WRITE OPERATIONS (Admin only - enforced by RLS)
// ============================================================================

export async function createChannel(
  input: CreateChannelInput
): Promise<ActionResult<DBChannel>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("channels")
      .insert(input)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/videos");
    revalidatePath("/");

    return { data: data as DBChannel };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create channel" };
  }
}

export async function updateChannel(
  id: string,
  input: UpdateChannelInput
): Promise<ActionResult<DBChannel>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("channels")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/videos");
    revalidatePath("/");

    return { data: data as DBChannel };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update channel" };
  }
}

export async function deleteChannel(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("channels").delete().eq("id", id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/videos");
    revalidatePath("/");

    return { data: undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete channel" };
  }
}

export async function toggleChannelFeatured(
  id: string,
  featured: boolean
): Promise<ActionResult<DBChannel>> {
  return updateChannel(id, { is_featured: featured });
}
