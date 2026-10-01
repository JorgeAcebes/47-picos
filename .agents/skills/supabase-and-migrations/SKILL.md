---
name: supabase-and-migrations
description: >-
  Use this skill whenever creating, modifying, or reviewing Supabase database tables, SQL migrations, Row Level Security (RLS) policies, or PostgreSQL stored procedures in the 47 Picos project.
---

# Supabase and Migrations Management

This skill covers the database architecture, migration conventions, security policies, and maintenance procedures for the Supabase backend in **47 Picos y 196 Países**.

---

## 1. Migration File Conventions

All migrations live in `supabase/migrations/` and follow a strict, contiguous naming pattern:

```text
supabase/migrations/
├── 001_initial_schema.sql
├── 002_add_wishlist.sql
...
├── 021_fix_experiences_rls.sql
└── 022_<descriptive_name>.sql  <-- Next migration must be 022
```

### Critical Rules:
1. **Contiguous 3-Digit Prefix**: Never skip numbers. Always check the highest number currently in the folder before creating a new migration.
2. **Idempotence**: Every statement should safely execute multiple times without error:
   - Tables: `CREATE TABLE IF NOT EXISTS public.<name> (...)`
   - Columns: `ALTER TABLE public.<name> ADD COLUMN IF NOT EXISTS <col> <type>`
   - Policies: `DROP POLICY IF EXISTS "<name>" ON public.<table_name>;` followed by `CREATE POLICY ...`
   - Indexes: `CREATE INDEX IF NOT EXISTS <index_name> ON public.<table_name> (...)`
3. **Always Enable RLS**:
   ```sql
   ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
   ```

---

## 2. Standard RLS Policy Patterns

The application distinguishes between private, public, and social follower access based on `profiles.is_public` and `connections`:

### SELECT Policy (Public or Accepted Connections or Owner):
```sql
CREATE POLICY "Public and connections can read <table_name>" ON public.<table_name>
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = <table_name>.user_id
    AND profiles.is_public = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.connections
    WHERE connections.following_id = <table_name>.user_id
    AND connections.follower_id = auth.uid()
    AND connections.status = 'accepted'
  )
);
```

### INSERT / UPDATE / DELETE Policies (Owner Only):
```sql
CREATE POLICY "Users can manage their own records" ON public.<table_name>
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## 3. Database Functions & Search Path

When creating stored procedures or views (e.g., `ranking_function`, `collective_countries_function`):
- Use `SECURITY DEFINER` when accessing elevated data across users.
- Explicitly set `search_path = public` to prevent schema hijack vulnerabilities.

Example:
```sql
CREATE OR REPLACE FUNCTION public.get_collective_visited_countries()
RETURNS TABLE (country_id text, visitor_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.summit_id AS country_id, COUNT(DISTINCT a.user_id) AS visitor_count
  FROM public.ascents a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.summit_id LIKE 'country-%' AND p.is_public = true
  GROUP BY a.summit_id;
END;
$$;
```

---

## 4. Supabase Storage: `summit-photos`

- **Bucket**: `summit-photos` (public: `true`)
- **Structure**: `[user_id]/[timestamp]_[summit_id].jpg`
- **Policies**:
  - `storage.objects` INSERT/UPDATE/DELETE: Checked with `(storage.foldername(name))[1] = auth.uid()::text`.
  - Public read: `bucket_id = 'summit-photos'`.

---

## 5. Keepalive & Pausing Prevention

Supabase free-tier projects pause after 7 days of inactivity.
This project includes a keepalive ping:
- Route: `app/api/keepalive/route.ts`
- Trigger: Vercel Cron configured in `vercel.json` (`schedule: "0 5 * * *"`).
- Authorization: Requires `CRON_SECRET` header or `SUPABASE_SERVICE_ROLE_KEY`.

---

## 6. Testing Migrations Locally

Run the migration integrity tests:
```bash
npm test tests/integration/migrations.test.ts
```
This test checks:
- Unbroken 3-digit sequence.
- Non-empty files.
- RLS enablement on all tables.

For full schema details, see [Schema Reference](./references/schema-reference.md).
