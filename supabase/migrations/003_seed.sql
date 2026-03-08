-- ============================================================
-- FILE: supabase/migrations/003_seed.sql
-- PURPOSE: Seed data — budget categories
-- RUN ORDER: 3 of 3 (after 002_rls.sql)
-- PROJECT: The Investment Academy
-- ============================================================

-- Budget Categories
-- display_order controls the sort order in the UI
INSERT INTO public.budget_categories (name, name_he, icon, display_order) VALUES
  ('Housing',             'דיור',               'home',           1),
  ('Food & Groceries',    'מזון וקניות',         'shopping-cart',  2),
  ('Transportation',      'תחבורה',             'car',            3),
  ('Health',              'בריאות',             'heart-pulse',    4),
  ('Education',           'חינוך',              'graduation-cap', 5),
  ('Entertainment',       'בידור',              'tv',             6),
  ('Clothing',            'ביגוד',              'shirt',          7),
  ('Insurance',           'ביטוח',              'shield',         8),
  ('Personal Care',       'טיפוח אישי',         'sparkles',       9),
  ('Gifts & Donations',   'מתנות ותרומות',       'gift',           10),
  ('Savings / Goals',     'חסכון / יעדים',       'piggy-bank',     11),
  ('Other',               'אחר',                'circle-ellipsis',12)
ON CONFLICT DO NOTHING;
