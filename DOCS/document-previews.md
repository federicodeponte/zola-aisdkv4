Document previews in chat
==========================

- Component: app/components/chat/attachment-preview/attachment-preview.tsx
  - Handles remote/data URL decoding, CSV parsing, PDF iframe, text snippet, fallback cards.
- Integration: app/components/chat/message-user.tsx uses AttachmentPreviewList.
- Helpers: none external.
- Test instructions: Start dev server, open localhost:3000, attach CSV/PDF/text/image -> verify preview + download.


