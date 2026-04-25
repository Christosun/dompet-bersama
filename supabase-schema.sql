-- ============================================
-- DOMPET BERSAMA - Supabase SQL Setup
-- Jalankan semua ini di Supabase SQL Editor
-- ============================================

-- 1. Tabel profiles (linked ke auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel categories
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '💰',
  color TEXT DEFAULT '#6366f1',
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'both')),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel transactions
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel budgets
CREATE TABLE budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, month, year)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Profiles: user bisa baca semua profile (untuk tau siapa yang input), edit sendiri
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Categories: semua user bisa baca, hanya owner yang bisa edit
CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (auth.uid() = user_id);

-- Transactions: semua user bisa baca semua transaksi, hanya owner yang bisa edit/hapus
CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (true);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Budgets: semua bisa baca, hanya owner yang bisa edit
CREATE POLICY "budgets_select" ON budgets FOR SELECT USING (true);
CREATE POLICY "budgets_insert" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budgets_delete" ON budgets FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- DEFAULT CATEGORIES (insert setelah ada user pertama)
-- Atau bisa insert manual dengan user_id dari dashboard
-- ============================================

-- Fungsi untuk auto-insert default categories saat user baru register
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));

  -- Insert default expense categories
  INSERT INTO categories (user_id, name, icon, color, type, is_default) VALUES
    (NEW.id, 'Makan & Minum', '🍽️', '#f59e0b', 'expense', true),
    (NEW.id, 'Transport', '🚗', '#3b82f6', 'expense', true),
    (NEW.id, 'Belanja', '🛒', '#ec4899', 'expense', true),
    (NEW.id, 'Kesehatan', '💊', '#10b981', 'expense', true),
    (NEW.id, 'Hiburan', '🎬', '#8b5cf6', 'expense', true),
    (NEW.id, 'Tagihan', '📄', '#ef4444', 'expense', true),
    (NEW.id, 'Pendidikan', '📚', '#06b6d4', 'expense', true),
    (NEW.id, 'Lainnya', '📦', '#6b7280', 'both', true),
    (NEW.id, 'Gaji', '💼', '#10b981', 'income', true),
    (NEW.id, 'Freelance', '💻', '#6366f1', 'income', true),
    (NEW.id, 'Investasi', '📈', '#f59e0b', 'income', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
