import { NextResponse } from 'next/server';
import supabaseAdmin from '../../../lib/supabaseAdmin';
import pdfParse from 'pdf-parse';
import unzipper from 'unzipper';
import { JSDOM } from 'jsdom';

export const runtime = 'nodejs';

function chunkText(text: string, chunkSize = 1000) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const docId = body?.documentId;
    if (!docId) return NextResponse.json({ error: 'documentId required' }, { status: 400 });

    // fetch upload row
    const { data: uploadRow, error: uploadErr } = await supabaseAdmin
      .from('document_uploads')
      .select('*')
      .eq('id', docId)
      .single();
    if (uploadErr || !uploadRow) {
      return NextResponse.json({ error: 'document_not_found', details: uploadErr?.message }, { status: 404 });
    }

    // mark processing
    await supabaseAdmin.from('document_uploads').update({ status: 'processing' }).eq('id', docId);

    const bucket = uploadRow.storage_bucket || 'reading-assets';
    const path = uploadRow.storage_path;
    const { data: downloadData, error: downloadError } = await supabaseAdmin.storage.from(bucket).download(path);
    if (downloadError || !downloadData) {
      await supabaseAdmin.from('document_uploads').update({ status: 'failed', error_message: downloadError?.message }).eq('id', docId);
      return NextResponse.json({ error: 'download_failed', details: downloadError?.message }, { status: 500 });
    }

    let buffer: Buffer;
    // data may be a Blob or a Node stream
    if (typeof (downloadData as any).arrayBuffer === 'function') {
      const ab = await (downloadData as any).arrayBuffer();
      buffer = Buffer.from(ab);
    } else if ((downloadData as any).stream) {
      // Read stream into buffer
      const chunks: Buffer[] = [];
      for await (const chunk of (downloadData as any).stream()) chunks.push(Buffer.from(chunk));
      buffer = Buffer.concat(chunks);
    } else if (Buffer.isBuffer(downloadData)) {
      buffer = downloadData as Buffer;
    } else {
      // fallback
      const ab = await (downloadData as any).arrayBuffer();
      buffer = Buffer.from(ab);
    }

    const format = (uploadRow.document_format || '').toLowerCase();
    const chaptersToInsert: Array<any> = [];

    if (format === 'pdf') {
      const pdf = await pdfParse(buffer);
      const text = (pdf.text || '').trim();
      // Create a single chapter for the PDF (simple MVP)
      chaptersToInsert.push({ chapter_number: 1, chapter_title: uploadRow.title || 'Full text', content: text, source_ref: 'pdf' });
    } else if (format === 'epub') {
      const zip = await unzipper.Open.buffer(buffer);
      // collect xhtml/html files in reading order as a best-effort
      const xhtmlEntries = zip.files.filter((f) => /\.xhtml$|\.html$|\.htm$/i.test(f.path));
      // sort by path for deterministic order
      xhtmlEntries.sort((a, b) => a.path.localeCompare(b.path));
      let chapNum = 0;
      for (const entry of xhtmlEntries) {
        try {
          const contentBuf = await entry.buffer();
          const dom = new JSDOM(contentBuf.toString('utf-8'));
          const text = dom.window.document.body?.textContent?.trim() || '';
          if (text.length === 0) continue;
          chapNum += 1;
          chaptersToInsert.push({ chapter_number: chapNum, chapter_title: entry.path, content: text, source_ref: entry.path });
        } catch (e) {
          // skip individual entries on error
          console.warn('Failed to parse EPUB entry', entry.path, e);
        }
      }
      if (chaptersToInsert.length === 0) {
        // fallback to whole-epub text
        chaptersToInsert.push({ chapter_number: 1, chapter_title: uploadRow.title || 'EPUB', content: 'Unable to extract chapter content.' });
      }
    } else {
      // unknown format: treat as text blob
      const text = buffer.toString('utf-8');
      chaptersToInsert.push({ chapter_number: 1, chapter_title: uploadRow.title || 'Document', content: text, source_ref: 'raw' });
    }

    // insert chapters and chunks
    const insertedChapterIds: string[] = [];
    for (const chap of chaptersToInsert) {
      const { data: insertedChapter, error: chapErr } = await supabaseAdmin
        .from('document_chapters')
        .insert([
          {
            document_upload_id: docId,
            chapter_number: chap.chapter_number,
            chapter_title: chap.chapter_title,
            source_ref: chap.source_ref || null,
            content: chap.content,
            metadata: {},
          },
        ])
        .select('*')
        .single();
      if (chapErr) {
        console.error('Failed to insert chapter', chapErr);
        continue;
      }
      insertedChapterIds.push(insertedChapter.id);

      // chunk and insert
      const chunks = chunkText(chap.content || '', 1200);
      const chunkInserts = chunks.map((text: string, idx: number) => ({
        document_upload_id: docId,
        document_chapter_id: insertedChapter.id,
        chunk_number: idx + 1,
        chunk_text: text,
        start_offset: idx * 1200,
        end_offset: idx * 1200 + text.length,
        token_count: Math.ceil(text.length / 4),
        metadata: {},
      }));

      // insert in batches of 200
      for (let i = 0; i < chunkInserts.length; i += 200) {
        const batch = chunkInserts.slice(i, i + 200);
        const { error: chunkErr } = await supabaseAdmin.from('document_chunks').insert(batch);
        if (chunkErr) console.error('chunk insert error', chunkErr);
      }
    }

    // update upload row
    await supabaseAdmin
      .from('document_uploads')
      .update({ status: 'ready', chapter_count: chaptersToInsert.length, processed_at: new Date().toISOString() })
      .eq('id', docId);

    return NextResponse.json({ success: true, chapters: chaptersToInsert.length });
  } catch (err) {
    console.error('Process route error:', err);
    return NextResponse.json({ error: 'processing_failed', details: (err as Error).message }, { status: 500 });
  }
}
