-- Document storage and processing metadata

INSERT INTO storage.buckets (id, name, public)
VALUES ('reading-assets', 'reading-assets', false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.document_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_file_name TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'reading-assets',
  storage_path TEXT UNIQUE NOT NULL,
  mime_type TEXT NOT NULL,
  file_extension TEXT,
  file_size_bytes BIGINT NOT NULL,
  document_format TEXT NOT NULL CHECK (document_format IN ('pdf', 'epub')),
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
  title TEXT,
  author TEXT,
  language TEXT,
  page_count INTEGER,
  chapter_count INTEGER NOT NULL DEFAULT 0,
  checksum TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.document_chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_upload_id UUID REFERENCES public.document_uploads(id) ON DELETE CASCADE NOT NULL,
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT,
  source_ref TEXT,
  start_page INTEGER,
  end_page INTEGER,
  start_offset INTEGER,
  end_offset INTEGER,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (document_upload_id, chapter_number)
);

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_upload_id UUID REFERENCES public.document_uploads(id) ON DELETE CASCADE NOT NULL,
  document_chapter_id UUID REFERENCES public.document_chapters(id) ON DELETE CASCADE,
  chunk_number INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  token_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (document_upload_id, chunk_number)
);

CREATE INDEX IF NOT EXISTS document_uploads_user_id_created_at_idx
  ON public.document_uploads (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS document_uploads_status_idx
  ON public.document_uploads (status);

CREATE INDEX IF NOT EXISTS document_chapters_document_upload_id_idx
  ON public.document_chapters (document_upload_id);

CREATE INDEX IF NOT EXISTS document_chunks_document_upload_id_idx
  ON public.document_chunks (document_upload_id);

CREATE INDEX IF NOT EXISTS document_chunks_document_chapter_id_idx
  ON public.document_chunks (document_chapter_id);

ALTER TABLE public.document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own document uploads"
  ON public.document_uploads
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own document chapters"
  ON public.document_chapters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.document_uploads du
      WHERE du.id = document_upload_id
        AND du.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own document chapters"
  ON public.document_chapters
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.document_uploads du
      WHERE du.id = document_upload_id
        AND du.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.document_uploads du
      WHERE du.id = document_upload_id
        AND du.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read their own document chunks"
  ON public.document_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.document_uploads du
      WHERE du.id = document_upload_id
        AND du.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own document chunks"
  ON public.document_chunks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.document_uploads du
      WHERE du.id = document_upload_id
        AND du.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.document_uploads du
      WHERE du.id = document_upload_id
        AND du.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can upload reading assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reading-assets'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users can read their reading assets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'reading-assets'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users can delete their reading assets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reading-assets'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE OR REPLACE FUNCTION public.set_document_uploads_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER document_uploads_updated_at_trigger
BEFORE UPDATE ON public.document_uploads
FOR EACH ROW
EXECUTE FUNCTION public.set_document_uploads_updated_at();