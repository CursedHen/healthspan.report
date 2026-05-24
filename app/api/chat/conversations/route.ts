import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("chat_conversations")
    .select("id, title, article_id, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: data ?? [] });
}

interface CreateConversationBody {
  title?: string;
  articleId?: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CreateConversationBody = {};
  try {
    const raw = await req.text();
    if (raw) body = JSON.parse(raw) as CreateConversationBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({
      user_id: user.id,
      title: body.title?.slice(0, 200) ?? null,
      article_id: body.articleId ?? null,
    })
    .select("id, title, article_id, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "create_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ conversation: data });
}
