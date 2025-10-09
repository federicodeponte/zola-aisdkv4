# Supabase Storage Module (shared v5-ready)

Everything you need to reuse the v4 file-upload pipeline inside `zola-aisdkv5`—no code changes required.

## Files

- `supabase-storage.ts`
  - `uploadFileToBucket` – uploads a `File` to the `chat-attachments` bucket and returns the public URL + storage path
  - `recordFileMetadata` – inserts the attachment record into the `chat_attachments` table
  - `CHAT_ATTACHMENT_BUCKET` – metadata describing the bucket name and suggested storage policies

Usage: import the helpers and wire them into your upload flow (e.g., inside a route handler or integration layer that wraps the v5 API).

```ts
import { uploadFileToBucket, recordFileMetadata } from "../shared-v5-ready/storage/supabase-storage"

const { publicUrl } = await uploadFileToBucket({ supabase, file })
await recordFileMetadata({
  supabase,
  chatId,
  userId,
  fileUrl: publicUrl,
  fileName: file.name,
  fileType: file.type,
  fileSize: file.size,
})
```

## Supabase Requirements

1. **Bucket:** create `chat-attachments` in Supabase Storage
   - Access policy: public read + authenticated write
2. **Table:** ensure `chat_attachments` table exists with the same schema we ship in `supabase/migrations/*`
3. **RLS Policies:** allow users to insert/select their own attachments (see migrations for examples)

Once these are in place, v5 integrations can upload and display attachments using the shared preview component (`shared-v5-ready/chat/attachment-preview.tsx`).

