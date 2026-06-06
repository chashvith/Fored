import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file') as unknown as File | null;
    const title = form.get('title')?.toString();
    const author = form.get('author')?.toString();

    const userId = form.get('userId')?.toString();
    if (!file || !userId) {
      return NextResponse.json({ error: 'file and userId are required' }, { status: 400 });
    }

    const filename = (file as any).name || `upload-${Date.now()}`;
    const mimeType = (file as any).type || 'application/octet-stream';
    const arr = await (file as any).arrayBuffer();
    const buffer = Buffer.from(arr);

    const id = crypto.randomUUID();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${id}-${safeName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('reading-assets')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.error('Supabase storage error:', uploadError);
      return NextResponse.json({ error: 'storage.upload_failed', details: uploadError.message }, { status: 500 });
    }

    // Create a document_uploads row
    const fileExtMatch = safeName.match(/\.([a-z0-9]+)$/i);
    const fileExt = fileExtMatch ? fileExtMatch[1].toLowerCase() : null;
    const documentFormat = fileExt === 'epub' ? 'epub' : fileExt === 'pdf' ? 'pdf' : 'pdf';

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('document_uploads')
      .insert([
        {
          user_id: userId,
          original_file_name: filename,
          storage_path: storagePath,
          mime_type: mimeType,
          file_extension: fileExt,
          file_size_bytes: buffer.length,
          document_format: documentFormat,
          title: title || null,
          author: author || null,
          status: 'uploaded',
        },
      ])
      .select('*')
      .single();

    if (insertError) {
      console.error('Insert document_uploads error:', insertError);
      return NextResponse.json({ error: 'db.insert_failed', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ upload: insertData, storage: uploadData });
  } catch (err) {
    console.error('Upload route error:', err);
    return NextResponse.json({ error: 'server_error', details: (err as Error).message }, { status: 500 });
  }
}
