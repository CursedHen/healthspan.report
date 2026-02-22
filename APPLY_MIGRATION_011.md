# Apply migration 011 (hidden_by_admin)

Run this SQL in your Supabase project so the Edit article modal works.

**Option A – Supabase Dashboard**  
1. Open your project at https://supabase.com/dashboard  
2. Go to **SQL Editor**  
3. Paste the contents of `supabase/migrations/011_rss_items_hidden_and_admin_update.sql`  
4. Click **Run**

**Option B – Supabase CLI**  
From the project root:
```bash
supabase db push
```
(Only applies if your remote is linked and migrations are in sync.)

After the migration runs, the "Edit article" modal will work and the error will go away.
