# Known Issues

## ⚠️ Radix UI Hydration Warning (Non-Breaking)

### Issue:
You may see console warnings about `aria-controls` attributes having different IDs between server and client:

```
aria-controls="radix-_R_1r5etalb_" (server)
aria-controls="radix-_R_7d5etalb_" (client)
```

### Why This Happens:
- Radix UI generates unique IDs using React's `useId()` hook
- Server-side and client-side renders can generate different IDs
- This is a known issue with React 18 + Radix UI + Next.js SSR

### Impact:
**None.** This is a cosmetic warning only:
- ✅ Functionality works perfectly
- ✅ Accessibility is maintained (IDs sync after hydration)
- ✅ No user-facing impact
- ❌ Just annoying console warnings

### Status:
- **Not a bug in GrowthGPT** - This is a Radix UI + Next.js limitation
- Being tracked in Radix UI repo: https://github.com/radix-ui/primitives/issues/1386
- Will be resolved when Radix UI updates their ID generation strategy

### Workaround:
None needed. The app works correctly despite the warning.

### Future Fix:
- Wait for Radix UI to fix in future version
- Or migrate to Radix Vue/other UI library that handles SSR IDs better

---

## 🐛 Other Known Issues

None currently! 🎉

---

## 📝 Reporting New Issues

If you find a real bug (not just warnings), please document:
1. What you were trying to do
2. What happened vs what you expected
3. Steps to reproduce
4. Browser console errors (if any)

