# CODEX: Sprint 2 Task
**Date:** Jan 30, 2026 | **Time:** 30 min

## Your Mission
Deploy Edge Functions and create Admin PDF Report button.

## Tasks

### 1. Deploy Edge Functions (10 min)
```bash
# In sersteypan/supabase/functions/
supabase functions deploy generate-qr-codes --project-ref rggqjcguhfcfhlwbyrug
supabase functions deploy generate-report --project-ref rggqjcguhfcfhlwbyrug

# Set required secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key_from_env>
```

If you don't have access to deploy, document the commands for the user.

### 2. Add "Generate Report" Button to Admin Project Page (15 min)
Location: `src/app/(portals)/admin/projects/[projectId]/page.tsx`

Add a button next to "Generate QR Codes" that triggers PDF generation:

```tsx
// Add server action
async function handleGenerateReport() {
  'use server'
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-report`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ projectId })
    }
  )
  // Return PDF URL
}

// Add button in header
<form action={handleGenerateReport}>
  <Button type="submit" variant="outline">
    <FileDown className="mr-2 h-4 w-4" />
    Generate Report
  </Button>
</form>
```

### 3. Test Report Generation (5 min)
- Navigate to a project with elements
- Click "Generate Report"
- Verify PDF downloads or opens

## Key Files
```
supabase/functions/generate-report/index.ts
supabase/functions/generate-qr-codes/index.ts
src/app/(portals)/admin/projects/[projectId]/page.tsx
```

## Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Success Criteria
- [ ] Edge Functions deployed (or documented)
- [ ] "Generate Report" button added
- [ ] Report generation tested
- [ ] Commit and push

## When Done
Report: "Functions deployed (or commands documented). Report button added. Pushed to main."
