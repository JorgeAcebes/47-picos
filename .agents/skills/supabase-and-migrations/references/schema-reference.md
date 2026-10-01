# Supabase Schema Reference

Detailed documentation of all public tables, views, and storage buckets in **47 Picos y 196 Países**.

---

## Tables Overview

### 1. `public.profiles`
User profiles synced with `auth.users`.
- `id` (uuid, PK, references `auth.users.id` on delete cascade)
- `username` (text, unique)
- `display_name` (text)
- `avatar_url` (text)
- `bio` (text)
- `is_public` (boolean, default true)
- `enable_regions` (boolean, default false): Controls whether regional subdivisions (e.g. Argentine provinces) are enabled for the user.
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 2. `public.ascents`
Tracks completed summits, visited countries, and sub-national regions.
- `id` (uuid, PK)
- `user_id` (uuid, FK `auth.users.id`)
- `summit_id` (text): Can be:
  - Spanish peak id (e.g., `"gorbea"`, `"mulhacen"`)
  - Country id (e.g., `"country-es"`, `"country-fr"`)
  - Region id (e.g., `"region-ar-mendoza"`)
- `achieved_on` (date): Start date of ascent or visit.
- `end_date` (date, nullable): Optional completion / departure date.
- `notes` (text, nullable)
- `link` (text, nullable): Optional external GPS track (Wikiloc, Strava, Komoot).
- `created_at`, `updated_at` (timestamptz)

### 3. `public.wishes`
Wishlist entries for mountains or destinations users want to visit.
- `id` (uuid, PK)
- `user_id` (uuid, FK `auth.users.id`)
- `summit_id` (text)
- `created_at` (timestamptz)

### 4. `public.summit_photos`
Photo attachments associated with summits, countries, or regions.
- `id` (uuid, PK)
- `user_id` (uuid, FK `auth.users.id`)
- `summit_id` (text)
- `storage_path` (text, unique)
- `public_url` (text)
- `taken_on` (date)
- `caption` (text, nullable)
- `created_at` (timestamptz)

### 5. `public.connections`
Social follow / friendship relationships.
- `id` (uuid, PK)
- `follower_id` (uuid, FK `auth.users.id`)
- `following_id` (uuid, FK `auth.users.id`)
- `status` (text: `'pending'`, `'accepted'`, `'rejected'`)
- `created_at` (timestamptz)

### 6. `public.custom_experience_categories`
User-defined or system custom categories (e.g., "Buceo", "Parques Nacionales").
- `id` (uuid, PK)
- `static_id` (text, nullable): Optional key to match static templates.
- `user_id` (uuid, FK `auth.users.id`)
- `name` (text)
- `icon_name` (text)
- `created_at` (timestamptz)

### 7. `public.custom_experiences`
Individual experiences within a category.
- `id` (uuid, PK)
- `category_id` (uuid, FK `custom_experience_categories.id`)
- `user_id` (uuid, FK `auth.users.id`)
- `name` (text)
- `created_at` (timestamptz)

### 8. `public.experience_records`
Completions of predefined or custom experiences.
- `id` (uuid, PK)
- `user_id` (uuid, FK `auth.users.id`)
- `experience_id` (text): Either predefined `exp-xxx` or custom UUID.
- `achieved_on` (date)
- `end_date` (date, nullable)
- `notes` (text, nullable)
- `link` (text, nullable)
- `sub_items` (jsonb, nullable): e.g. `["lion", "leopard"]` for Big Five.
- `created_at`, `updated_at` (timestamptz)

### 9. `public.hidden_items`
Allows users to hide specific predefined categories or experiences from their view.
- `id` (uuid, PK)
- `user_id` (uuid, FK `auth.users.id`)
- `item_id` (text): Category or experience identifier.
- `created_at` (timestamptz)
