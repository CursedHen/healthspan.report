"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type {
  DBCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
  ActionResult,
} from "@/types/database";

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function getCategories(): Promise<ActionResult<DBCategory[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) {
      return { error: error.message };
    }

    return { data: data as DBCategory[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch categories" };
  }
}

export async function getCategoryBySlug(
  slug: string
): Promise<ActionResult<DBCategory>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as DBCategory };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch category" };
  }
}

export async function getCategoryById(
  id: string
): Promise<ActionResult<DBCategory>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as DBCategory };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch category" };
  }
}

// ============================================================================
// WRITE OPERATIONS (Admin only - enforced by RLS)
// ============================================================================

export async function createCategory(
  input: CreateCategoryInput
): Promise<ActionResult<DBCategory>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("categories")
      .insert(input)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/topics");
    revalidatePath("/articles");

    return { data: data as DBCategory };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create category" };
  }
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<ActionResult<DBCategory>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("categories")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/topics");
    revalidatePath("/articles");

    return { data: data as DBCategory };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update category" };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/topics");
    revalidatePath("/articles");

    return { data: undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete category" };
  }
}
