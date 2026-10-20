-- ==============================================================================
-- PILIHKU E-VOTING: MIGRATION MENAMBAHKAN DUKUNGAN PEMILIHAN MPK & OSIS
-- Jalankan script SQL ini di Supabase Dashboard -> "SQL Editor"
-- ==============================================================================

-- 1. Tambahkan kolom 'category' pada tabel 'candidates' (default: 'osis')
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'candidates' 
      AND column_name = 'category'
  ) THEN
    ALTER TABLE public.candidates ADD COLUMN category text NOT NULL DEFAULT 'osis';
  END IF;
END $$;

-- 2. Update index unik nomor kandidat agar unik PER KATEGORI (bukan global)
-- Sehingga Paslon OSIS bisa punya no 1, 2, 3 dan Paslon MPK juga bisa punya no 1, 2, 3
DROP INDEX IF EXISTS public.candidates_candidate_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS candidates_category_candidate_number_idx 
ON public.candidates (category, candidate_number);

-- 3. Tambahkan kolom 'category' pada tabel 'votes' (default: 'osis')
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'votes' 
      AND column_name = 'category'
  ) THEN
    ALTER TABLE public.votes ADD COLUMN category text NOT NULL DEFAULT 'osis';
  END IF;
END $$;

-- 4. Tambahkan kolom status voting terpisah pada tabel 'voters' (opsional tapi sangat berguna untuk tracking)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'voters' 
      AND column_name = 'has_voted_osis'
  ) THEN
    ALTER TABLE public.voters ADD COLUMN has_voted_osis boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'voters' 
      AND column_name = 'has_voted_mpk'
  ) THEN
    ALTER TABLE public.voters ADD COLUMN has_voted_mpk boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Sinkronisasi data lama voters: jika has_voted = true, maka has_voted_osis = true dan has_voted_mpk = true
UPDATE public.voters SET has_voted_osis = true, has_voted_mpk = true WHERE has_voted = true;

-- Tambahkan setting terpisah untuk pemenang MPK jika diperlukan di settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'settings' 
      AND column_name = 'winner_mpk_id'
  ) THEN
    ALTER TABLE public.settings ADD COLUMN winner_mpk_id uuid NULL REFERENCES public.candidates(id) ON DELETE SET NULL;
  END IF;
END $$;
