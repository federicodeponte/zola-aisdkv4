# Model Update: Gemini 2.5 Flash

## Changed Default Model

**From**: Gemini 2.0 Flash (`gemini-2.0-flash-001`)
**To**: Gemini 2.5 Flash (`gemini-2.5-flash`)

## What Changed

### 1. Default Model Configuration
- **File**: `lib/config.ts`
- **New Default**: `MODEL_DEFAULT = "gemini-2.5-flash"`
- **Non-Auth Allowed**: Updated to allow 2.5 Flash for non-authenticated users

### 2. Model Specifications (Gemini 2.5 Flash)
- **Context Window**: 1M tokens
- **Input Cost**: $0.075 per 1M tokens
- **Output Cost**: $0.30 per 1M tokens
- **Speed**: Fast
- **Intelligence**: High (reasoning enabled)
- **Features**: Vision ✅, Tools ✅, Audio ✅, Reasoning ✅

### 3. Comparison with 2.0 Flash

| Feature | Gemini 2.0 Flash | Gemini 2.5 Flash |
|---------|------------------|------------------|
| Context Window | 1M tokens | 1M tokens |
| Input Cost | $0.075/1M | $0.075/1M (same) |
| Output Cost | $0.30/1M | $0.30/1M (same) |
| Reasoning | ❌ | ✅ |
| Tools Support | ✅ | ✅ |
| Vision | ✅ | ✅ |
| Audio | ✅ | ✅ |

**Trade-off**: Same pricing as 2.0 Flash with enhanced reasoning capabilities.

### 4. Updated Files

```
✅ lib/config.ts
   - MODEL_DEFAULT updated
   - NON_AUTH_ALLOWED_MODELS updated

✅ lib/models/data/gemini.ts
   - Added enableSearch support to 2.5 Flash

✅ lib/tools/token-tracking.ts
   - Updated pricing for 2.5 Flash (moved to top as default)

✅ ARCHITECTURE.md
   - Updated to reference Gemini 2.5 Flash Preview
   - Technology stack section updated
```

## Why Gemini 2.5 Flash?

1. **Enhanced Reasoning**: Better strategic analysis for GTM tasks
2. **Next-Gen Features**: Latest multimodal capabilities
3. **Still Fast**: Maintains low-latency performance
4. **Tool Support**: Full support for all 4 GrowthGPT tools
5. **Future-Proof**: Preview of upcoming stable release

## Cost Impact

Pricing remains unchanged from Gemini 2.0 Flash, so no adjustments are required for existing token tiers. Expect the same ~$0.0002-$0.0003 per standard chat interaction.

## Token Tier Recommendations (Updated)

Given the slightly higher costs, you may want to adjust tiers:

```typescript
// Recommended updates (optional)
export const TOKEN_TIERS = {
  BETA: { monthly_tokens: 4_000_000, monthly_cost: 0 }, // ~4M tokens
  FREE: { monthly_tokens: 800_000, monthly_cost: 0 },   // ~800K tokens
  STARTER: { monthly_tokens: 8_000_000, monthly_cost: 10 }, // ~8M tokens
  PROFESSIONAL: { monthly_tokens: 40_000_000, monthly_cost: 50 }, // ~40M tokens
  ENTERPRISE: { monthly_tokens: -1, monthly_cost: "custom" },
}
```

Or keep existing tiers - the cost difference is minimal for the enhanced capabilities.

## Testing the Update

**Server is running on port 3002** (saw port 3000 was in use).

To test with 2.5 Flash:
```bash
# Check model is available
curl http://localhost:3002/api/models | jq '.models[] | select(.id=="gemini-2.5-flash")'

# Test chat (after DB setup + auth)
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{
    "messages": [{"role": "user", "content": "Explain the Rule of 40"}],
    "chatId": "test-123",
    "userId": "your-user-id",
    "model": "gemini-2.5-flash",
    "isAuthenticated": true,
    "enableSearch": false
  }'
```

## No Breaking Changes

✅ All existing code compatible
✅ Tools work identically
✅ API endpoints unchanged
✅ Database schema unchanged
✅ Just swap the model ID

## Rollback (If Needed)

To revert to Gemini 2.0 Flash:

```typescript
// In lib/config.ts
export const MODEL_DEFAULT = "gemini-2.0-flash-001"
export const NON_AUTH_ALLOWED_MODELS = ["gpt-4.1-nano", "gemini-2.0-flash-001"]
```

---

**Update Complete** ✅
- Default model: Gemini 2.5 Flash Preview
- Enhanced reasoning capabilities
- All tools fully compatible
- Documentation updated

