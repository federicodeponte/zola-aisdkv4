# Heavy Tool UI Implementation Plan

## Current State Analysis

**What Exists:**
- ✅ Bulk processing backend (`/api/bulk-process`, `lib/bulk-processing/processor.ts`)
- ✅ Basic tool invocation UI (`app/components/chat/tool-invocation.tsx`)
- ✅ Tools: web_search, gtm_expert, analyze_website, deep_research
- ✅ Vercel AI SDK v4 with tool calling
- ✅ Shadcn UI components
- ✅ Supabase Storage for file uploads

**What's Missing:**
- ❌ Interactive tool UI for heavy operations (bulk processing)
- ❌ Multi-stage tool execution (plan → refine → execute)
- ❌ CSV upload integration with tool UI
- ❌ Real-time progress streaming for long-running operations
- ❌ Tool continuation pattern with user feedback

**Future Tools (Later):**
- ADK (Data Analysis) - backend exists, just needs UI integration
- Website Analysis - can wrap existing analyze_website tool

## Decision: Use Assistant UI

After analysis, we're using **@assistant-ui/react** because:

1. **Interactive Input Fields** - Need text inputs within tool cards for refinement
2. **Tool Continuation Pattern** - `addResult()` enables clean multi-stage execution
3. **Execution Context Management** - Automatic tracking of tool status, args, results
4. **Future-Proof** - Easier to add charts, wizards, conditional fields later

**Trade-off:** New dependency vs. building custom (~2 hours saved, better patterns)

## Safe Development Strategy

**Feature Branch + Feature Flags + Parallel Components**

1. Work in `feature/heavy-tool-ui` branch
2. Feature flag to enable/disable (`NEXT_PUBLIC_HEAVY_TOOLS`)
3. Create new files, minimal modifications to existing code
4. Zero disruption to production functionality
5. Test at each layer before continuing

## Architecture

### CSV Upload Flow (Bulk Processing)

```
User uploads CSV in chat attachment
  ↓
File stored in Supabase Storage bucket (chat-files)
  ↓
File URL + metadata passed to AI
  ↓
AI calls bulk_process tool with file reference
  ↓
Tool card renders with CSV preview
  ↓
User can: Upload different CSV | Refine Plan | Run Sample (3 rows) | Run Full
```

### Multi-Stage Tool Flow

```
Stage 1: PLAN
  ↓ AI calls tool with stage="plan"
Tool generates plan (sample outputs, cost estimate)
  ↓
Card renders with markdown plan + action buttons
  ↓
User clicks: "Refine Plan" → Pre-fills chat input → User types refinement → AI re-calls tool
User clicks: "Run Sample" → Stage 2
  ↓
Stage 2: EXECUTE
  ↓ Tool executes with mode="sample" or "full"
Progress streaming via SSE
  ↓
Card shows progress bar, live updates
  ↓
Stage 3: COMPLETE
  ↓
Card shows results + download button
```

### Layered Architecture

**Layer 1: Core Abstraction**
```typescript
lib/tools/heavy-tool/
├── base.ts              # Interfaces, types, state machine
├── factory.ts           # Generic tool factory
└── types.ts             # Shared types
```

**Layer 2: Tool Implementation**
```typescript
lib/tools/
├── bulk-process-tool.ts # Bulk processing logic
└── [future tools]
```

**Layer 3: UI Components**
```typescript
app/components/chat/heavy-tools/
├── heavy-tool-renderer.tsx    # Main router
├── stages/
│   ├── plan-stage.tsx         # Reusable plan view
│   ├── executing-stage.tsx    # Reusable progress view
│   └── complete-stage.tsx     # Reusable results view
└── bulk-process/
    ├── bulk-plan-view.tsx     # CSV-specific plan
    ├── bulk-input-form.tsx    # CSV upload/preview
    └── bulk-results-view.tsx  # Results + download
```

**Layer 4: Integration Points**
```typescript
app/components/chat/tool-invocation.tsx  # Minimal modification
app/api/chat/route.ts                    # Register tool (feature-flagged)
app/api/bulk-process/execute/route.ts    # Streaming endpoint
```

### Key Files to Create

**New Files (No Risk):**
1. `lib/config.ts` - Add feature flag (if not exists, update if exists)
2. `lib/tools/heavy-tool/base.ts` - Core abstractions
3. `lib/tools/bulk-process-tool.ts` - Tool implementation
4. `app/components/chat/heavy-tools/*` - All UI components
5. `app/hooks/use-tool-execution.ts` - Progress streaming hook
6. `app/api/bulk-process/execute/route.ts` - SSE streaming

**Modified Files (Minimal Changes):**
1. `app/components/chat/tool-invocation.tsx` - Add conditional heavy tool rendering
2. `app/api/chat/route.ts` - Register tool behind feature flag

## Implementation Phases

### Phase 1: Verify Assistant UI Compatibility (1-2 hours)

**Goal:** Prove the tech stack works before building full implementation

**Steps:**
1. Create feature branch: `git checkout -b feature/heavy-tool-ui`
2. Install dependencies: `npm install @assistant-ui/react react-markdown`
3. Add feature flag to `lib/config.ts`
4. Create minimal "hello world" heavy tool
5. Verify it renders in chat with Vercel AI SDK + Next.js App Router
6. Test `addResult()` callback pattern works
7. Document any compatibility issues

**Success Criteria:**
- Tool renders in chat UI
- Button clicks trigger callbacks
- Assistant UI integrates cleanly with existing setup

**If Phase 1 Fails:** Pivot to custom implementation (add ~2-3 hours)

**Testing:**
- Manual: Start dev server, enable feature flag, trigger tool
- Verify: Tool card appears, buttons clickable, no console errors

---

### Phase 2: Core Abstractions (3-4 hours)

**Goal:** Build reusable foundation following SOLID principles

**Files to Create:**

**`lib/tools/heavy-tool/types.ts`**
```typescript
export interface HeavyToolStage {
  type: 'plan' | 'executing' | 'complete' | 'error'
}

export interface PlanStage extends HeavyToolStage {
  type: 'plan'
  markdown: string
  csvPreview?: {
    headers: string[]
    sampleRows: string[][]
    totalRows: number
  }
  estimates: {
    cost: number
    time: string
    rowsToProcess: number
  }
}

export interface ExecutingStage extends HeavyToolStage {
  type: 'executing'
  executionId: string
  mode: 'sample' | 'full'
  progress: {
    current: number
    total: number
    currentRow?: string
  }
}

export interface CompleteStage extends HeavyToolStage {
  type: 'complete'
  executionId: string
  summary: {
    totalProcessed: number
    successful: number
    failed: number
    totalCost: number
  }
  downloadUrl: string
}

export interface ErrorStage extends HeavyToolStage {
  type: 'error'
  error: string
  canRetry: boolean
}
```

**`lib/tools/heavy-tool/base.ts`**
```typescript
// State machine for tool execution
// Validation helpers
// Error handling patterns
```

**Testing:**
- Unit tests for type validation
- State transition logic tests
- Mock data fixtures

---

### Phase 3: Bulk Processing Tool Implementation (4-5 hours)

**Goal:** Complete end-to-end implementation of bulk processing tool

**`lib/tools/bulk-process-tool.ts`**
- Integrate with existing `/api/bulk-process`
- Handle CSV from Supabase Storage
- Generate plan with sample outputs (first 3 rows)
- Support refinements through tool re-invocation

**`app/api/bulk-process/execute/route.ts`** (NEW)
- SSE endpoint for progress streaming
- Handle sample (3 rows) and full modes
- Upload results to Supabase Storage
- Return download URL

**Testing:**
- Unit: Plan generation with various CSV inputs
- Unit: Template variable validation
- Integration: API endpoint with mock CSV
- E2E: Full flow with real CSV (3 rows)

---

### Phase 4: UI Components (5-6 hours)

**Goal:** Build reusable, accessible UI components

**Components to Build:**
1. `heavy-tool-renderer.tsx` - Main router
2. `stages/plan-stage.tsx` - Plan view with markdown, CSV preview, action buttons
3. `stages/executing-stage.tsx` - Progress bar with live updates
4. `stages/complete-stage.tsx` - Summary + download button
5. `stages/error-stage.tsx` - Error display with retry option

**Key Features:**
- Markdown rendering with react-markdown
- CSV preview table (first 3 rows)
- "Refine Plan" button pre-fills chat input
- "Run Sample" and "Run Full" buttons
- Real-time progress updates
- Download enriched CSV

**Testing:**
- Component tests with mock data
- Accessibility audit (keyboard navigation, screen readers)
- Responsive design tests

---

### Phase 5: Integration (2-3 hours)

**Goal:** Wire everything together with minimal changes to existing code

**Modifications:**
1. `app/components/chat/tool-invocation.tsx` - Add conditional rendering for heavy tools
2. `app/api/chat/route.ts` - Register bulk_process tool behind feature flag

**Testing:**
- Feature flag on/off verification
- Integration with existing chat flow
- No regression in existing tools

---

### Phase 6: Polish & Error Handling (2-3 hours)

**Goal:** Production-grade error handling and UX polish

**Error Scenarios:**
- CSV parsing fails
- Network error during execution
- User navigates away during execution
- API rate limits
- Large CSV timeout

**UX Polish:**
- Loading skeletons
- Smooth animations
- Keyboard shortcuts
- Copy sample prompts
- CSV preview with syntax highlighting

**Testing:**
- Error boundary tests
- Network failure simulation
- Timeout handling

## Testing Strategy

### Layer-by-Layer Testing

**Phase 1: Unit Tests**
- Type validation and interfaces
- CSV parsing logic
- Plan generation
- Template variable replacement

**Phase 2: Component Tests**
- PlanStage with mock data
- ExecutingStage with mock progress
- CompleteStage with mock results
- Accessibility compliance

**Phase 3: Integration Tests**
- API endpoint with mock Supabase
- File upload to storage
- Progress streaming with EventSource
- Download CSV generation

**Phase 4: E2E Tests (Playwright)**
```typescript
// tests/e2e/bulk-process.spec.ts
test('complete bulk processing flow', async ({ page }) => {
  // 1. Upload CSV in chat
  await page.goto('/c/test-chat')
  await page.setInputFiles('[data-testid="file-upload"]', 'fixtures/test-3-rows.csv')
  
  // 2. Wait for plan to render
  await expect(page.locator('[data-testid="heavy-tool-plan"]')).toBeVisible()
  await expect(page.locator('text="3 rows"')).toBeVisible()
  
  // 3. Click "Run Sample"
  await page.click('button:has-text("Run Sample")')
  
  // 4. Verify progress bar
  await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()
  
  // 5. Wait for completion
  await expect(page.locator('text="Processing complete"')).toBeVisible({ timeout: 30000 })
  
  // 6. Download and verify CSV
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Download")')
  ])
  
  // 7. Verify CSV content
  const path = await download.path()
  const csv = fs.readFileSync(path, 'utf-8')
  expect(csv).toContain('AI_Output')
  expect(csv.split('\n')).toHaveLength(4) // Header + 3 rows
})
```

**Test Data:**
- `fixtures/test-3-rows.csv` - Valid CSV with 3 rows
- `fixtures/test-100-rows.csv` - Medium CSV
- `fixtures/test-invalid.csv` - Malformed CSV for error testing
- `fixtures/test-special-chars.csv` - Unicode, commas in values

### Manual Testing Checklist

- [ ] CSV upload with various file sizes
- [ ] Plan generation accuracy
- [ ] Refinement through chat
- [ ] Sample execution (3 rows)
- [ ] Full execution (100+ rows)
- [ ] Progress updates in real-time
- [ ] Download CSV functionality
- [ ] Error handling (network, timeout, invalid CSV)
- [ ] Feature flag on/off
- [ ] Mobile responsiveness
- [ ] Keyboard navigation
- [ ] Screen reader compatibility

## Security & Performance

### Security
1. **CSV Validation**
   - Max file size: 10MB
   - Allowed mime types: text/csv, text/plain
   - Sanitize file names
   - Scan for malicious content

2. **Rate Limiting**
   - Check user tier before execution
   - Limit concurrent executions
   - Track costs per user

3. **Markdown Sanitization**
   - Use react-markdown with safe defaults
   - No HTML rendering
   - Whitelist allowed elements

### Performance
1. **Streaming**
   - SSE for progress updates
   - Backpressure handling
   - Connection timeout (5 min)

2. **File Handling**
   - Stream large CSVs (don't load in memory)
   - Use Supabase Storage CDN
   - Implement chunking for large files

3. **UI Optimization**
   - Virtualized tables for CSV preview
   - Debounced progress updates
   - Lazy load result components

## Production Readiness Checklist

- [ ] All tests passing
- [ ] Error boundaries in place
- [ ] Loading states for all async operations
- [ ] Proper TypeScript types (no `any`)
- [ ] Accessibility audit passed
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Feature flag tested in production
- [ ] Rollback plan documented
- [ ] Monitoring/logging in place

## Future Enhancements (Not in Scope)

- ADK tool integration (backend exists, needs UI)
- Website analysis tool (can wrap existing)
- Inline card editing (V2 of refinement)
- Batch retries for failed rows
- CSV transformation preview
- Schedule bulk processing jobs
- Export to other formats (Excel, JSON)
- Chart visualization of results

## Estimated Timeline

- Phase 1 (Compatibility): 1-2 hours
- Phase 2 (Core Abstractions): 3-4 hours
- Phase 3 (Tool Implementation): 4-5 hours
- Phase 4 (UI Components): 5-6 hours
- Phase 5 (Integration): 2-3 hours
- Phase 6 (Polish & Errors): 2-3 hours

**Total: 17-23 hours** (2-3 days of focused work)

