-- Chat conversations and messages for the AI assistant.
-- Anonymous users keep history client-side (localStorage); only signed-in users
-- get rows here, so RLS can simply scope to auth.uid().

create table if not exists chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  article_id uuid references rss_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_conversations_user_updated_idx
  on chat_conversations (user_id, updated_at desc);

create index if not exists chat_messages_conversation_created_idx
  on chat_messages (conversation_id, created_at);

alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;

drop policy if exists "own conversations" on chat_conversations;
create policy "own conversations" on chat_conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own messages" on chat_messages;
create policy "own messages" on chat_messages
  for all
  using (
    exists (
      select 1 from chat_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from chat_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create or replace function touch_chat_conversation_updated_at()
returns trigger
language plpgsql
as $$
begin
  update chat_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists chat_messages_touch_conversation on chat_messages;
create trigger chat_messages_touch_conversation
  after insert on chat_messages
  for each row
  execute function touch_chat_conversation_updated_at();
