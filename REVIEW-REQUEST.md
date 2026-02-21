# Code Review Request — Factory Owner Feedback Implementation

## Purpose

This document is for a second engineer to review everything that was implemented in response to factory owner Jón Gunnar's 4 emails with feedback. **No code changes are needed from the reviewer** — we just want a fresh perspective on whether the implementation correctly addresses the owner's requirements, follows good patterns, and has no gaps.

---

## Background: What the Owner Asked For

Jón Gunnar (the factory owner) sent 4 emails on Feb 15–16, 2026 with structural engineering PDFs, annotated screenshots of the system, and detailed written feedback in Icelandic. Here's what he asked for, translated and organized:

### Email 1: Filigran Drawings
- Sent 4 PDF structural drawings (BF-1 through BF-4) for filigran (thin floor slabs) over the 1st floor of buildings A, B, C
- Said: "dæmi um filigran teikningar — Þetta er fyrsta hæð af 6" (example filigran drawings — this is the first floor of 6)

### Email 2: Balcony & Svalagangur Drawings
- Sent 3 PDFs: pre-cast balconies (BS_01), svalagangur corridor (A.1.9), and svalagangur details
- These are new element types the system needed to support

### Email 3: Staircase Drawing
- Sent 1 PDF: pre-cast stairs (BS-2)
- Said: "stigar — allar þessar teikningar eru úr sömu byggingunni" (stairs — all these drawings are from the same building)

### Email 4: The Main Feedback Email ("comments 2")
This is the critical one. He described two major areas:

**A. Admin Portal Problems:**
1. "GG gaman er með 20 teikningar. lengi að henda inn einu og einu." — Uploading 20 drawings one by one takes too long. Need bulk upload.
2. "hefði kannski þurft að flokka eftir hæðum eða svæðum, t.d áshamar 56 eru þrjár byggingar A,B,C svo valagangar" — Documents should be organized by building and floor (Áshamar 56 has buildings A, B, C plus connecting corridors)
3. "tengja einingu við teikningu sem hefur verið uploadað" — Link elements to uploaded drawings
4. "setja upp reikni formúlu á Mál... til að reikna út þyngd og m2" — Auto-calculate weight and area from dimensions
5. "Stofna eina einingu í einu tekur mikinn tíma. Skoða að hlaða inn upplýsingar í gegnum teikningu eða vera með multi insert." — Creating elements one by one is too slow. Load from drawings or bulk insert.

**B. Factory Manager (Framleiðslustjóri) Needs:**
1. "þurfum að geta skjala mistök og framleiðslugalla á einingum. og lýsa því hvað var gert til að leiðrétta mistök. og hvað má gera betur næst svo það endurtaki sig ekki." — Need to document production defects: what happened, what was done to fix it, what to do better so it doesn't repeat.
2. Detailed production workflow description (translated):
   - Factory manager sees all elements to produce for a project
   - Each element gets a barcode when created
   - Manager checks off elements prepared for concrete pour
   - Takes photos of rebar and electrical components on the table
   - Elements are NOT produced in order — must jump between floors to fill available mold space
   - ~10 filigran + 2 balcony + 1 stair poured together from same concrete truck
   - Manager checks elements, uploads photos, uploads concrete slip → Batch number created
   - If defect found in element F(A)1-1, can look up ALL elements from the same batch
   - Must be able to trace COMPLETE history: drawing → rebar photo → batch number → concrete slip → driver photos

**C. Annotated Screenshots (framleiðsla.jpg, image-3.png)**
He included mockup screenshots showing his vision of the production management UI:
- A "Manage Production" page with date, batch number, air temperature
- A checklist section with tabs for Filigran, Balcony, Stairs, Columns
- Elements grouped by floor with batch dates and batch numbers
- Red text annotations: "Framleiðslu stjóri þarf að staðfesta að hann hafi farið yfir þessa liði áður en steypan fer í mótið og það er tekið fram í bach skránni" (Factory manager must confirm he has reviewed these items before concrete goes into the mold, and this is recorded in the batch record)

---

## What Was Already Built (Before This Sprint)

These features were completed in a prior session and should NOT be reviewed for this document:

| Feature | How it addresses feedback |
|---------|--------------------------|
| **AI Drawing Analysis** (migration 027, API route, review UI) | Addresses item A.5 — auto-extract elements from drawing PDFs |
| **Drawing reference on elements** | Already existed |
| **Rebar spec field** | Added to DB, schema, form, AI extraction |
| **Svalagangur element type** | New type from Email 2 drawings |
| **Multi-file upload for drawing analysis** | DrawingUploadZone component |
| **Element photos at all stages** | PhotoUploadForm + PhotoGallery |
| **Auto weight in drawing analysis review** | estimateWeight() in ElementReviewTable |

---

## What Was Built in This Sprint (8 Items)

### Item 1: Fix batch_number Bug

**Owner's request**: Elements should have batch numbers.

**Problem found**: `batch_number` was being parsed from FormData and validated by Zod, but NEVER written to the database — omitted from both `createElement()` and `updateElement()` in `src/lib/elements/actions.ts`.

**Fix**:
- `createElement()`: Added `batch_number: validatedData.batch_number || null` to the elementData object
- `updateElement()`: Added `batch_number: (formData.get('batch_number') as string)?.trim() || null` to the updateData object
- Added batch_number input field in ElementForm

**Files changed**: `src/lib/elements/actions.ts`, `src/components/elements/ElementForm.tsx`

**Review question**: Is the field correctly added in both create and update paths? Does getFormValues() include it?

---

### Item 2: Auto Weight Calculation in ElementForm

**Owner's request**: "setja upp reikni formúlu á Mál... til að reikna út þyngd og m2"

**Implementation**:
- Reused existing `estimateWeight()` from `src/lib/drawing-analysis/weight.ts`
- When the user enters length/width/height dimensions, a blue info box shows the calculated area (m2) and estimated weight (kg) using 2400 kg/m3 concrete density
- "Nota reiknuð þyngd" button copies the calculated weight into the weight input
- Recalculates when dimensions change or element type changes

**Files changed**: `src/components/elements/ElementForm.tsx`

**Review questions**:
- Is 2400 kg/m3 the right density for precast concrete? (Standard value, but worth confirming)
- Does the recalculation trigger correctly on all dimension field changes?
- Does the "copy weight" button work correctly with React's controlled/uncontrolled input pattern?

---

### Item 3: Production Batch System (CORE FEATURE)

**Owner's request**: The entire "Framleiða vöru" section of Email 4, plus the annotated screenshots showing batch management.

**Database (migration 028)**:
- New `production_batches` table with auto-numbered batch IDs (LOTA-2026-001, etc.)
- Status lifecycle: preparing → checklist → completed | cancelled
- Checklist stored as JSONB with 5 default items (rebar verified, electrical placed, formwork verified, dimensions verified, photos uploaded)
- Each checklist item tracks who checked it and when
- Concrete slip URL, supplier, grade fields
- `batch_id` FK added to elements table
- RLS policies: Admin + factory_manager full access, buyer read-only on own projects

**Server Actions (`src/lib/factory/batch-actions.ts`)**:
- `createBatch()` — generates batch number via SQL RPC, inserts batch, links selected elements
- `getBatch()`, `getBatchesForProject()`, `getAllBatches()`, `getBatchForElement()`
- `updateChecklistItem()` — updates single item with who/when tracking, auto-updates batch status
- `completeBatch()` — verifies ALL checklist items checked, advances elements to 'cast' status
- `uploadConcreteSlip()` — uploads to project-documents storage bucket
- `getUnbatchedElements()` — gets elements not yet assigned to any batch

**Components**:
- `BatchCreateDialog` — dialog with element picker (checkboxes), concrete supplier/grade, creates batch
- `ProductionChecklist` — interactive checklist with optimistic updates, shows who/when for each item
- `BatchDetailCard` — compact batch info card + sibling elements list (used in element detail sidebar)
- `ConcreteSlipUpload` — single-file upload for concrete slip PDF/image

**Pages**:
- `/factory/batches` — list page with stats cards (preparing/checklist/completed counts), batch cards
- `/factory/batches/[batchId]` — detail page with interactive checklist, elements table, concrete info, completion button
- `BatchCompletionButton` — client component, disabled if checklist incomplete

**Navigation**: Added "Steypulotur" to factory sidebar nav

**Review questions**:
- Does the batch workflow match what the owner described? (select elements → checklist → concrete slip → complete → elements advance to 'cast')
- Is the `generate_batch_number()` SQL function safe under concurrent access? (SELECT MAX + 1 pattern — potential race condition?)
- The checklist has 5 hardcoded items. Should these be configurable per project or is 5 items sufficient?
- `completeBatch()` advances elements to 'cast' but only those in 'planned' or 'rebar' status. Is this correct? What if an element is already 'cast' from a manual status change?
- The owner's mockup shows elements grouped by element type (Filigran tab, Balcony tab, etc.). Our batch creation dialog groups them in a flat list with checkboxes. Should we add type-based grouping?
- The owner mentions "air temperature" in his mockup. We don't capture this. Is it important?

---

### Item 4: Enhanced Defect Tracking

**Owner's request**: "þurfum að geta skjala mistök og framleiðslugalla á einingum. og lýsa því hvað var gert til að leiðrétta mistök. og hvað má gera betur næst svo það endurtaki sig ekki."

**Database**: Added `root_cause`, `corrective_action`, `lessons_learned`, `photos` (JSONB) to `fix_in_factory` table.

**Server actions (`src/lib/factory/fix-factory-actions.ts`)**:
- `createFixRequest()` now accepts and inserts `root_cause`
- `updateFixStatus()` now accepts `correctiveAction` and `lessonsLearned` when completing a fix
- `getFixRequests()` select query includes all new columns

**UI (`src/components/factory/FixInFactoryList.tsx`)**:
- Create dialog: Added root_cause textarea ("Grunnorsök — Hvað olli vandamálinu?")
- Complete dialog: Added corrective_action textarea (required, "Hvað var gert til að laga?"), lessons_learned textarea ("Hvað má gera betur næst?")
- Table rows are expandable — click to show full detail with all fields

**Review questions**:
- The `photos` JSONB field was added to the DB but photo upload UI was NOT built for defect tracking. Should it be?
- Should corrective_action be truly required when completing a fix, or optional?
- Is the expandable row pattern discoverable enough? Should there be an expand indicator icon?

---

### Item 5: Production Checklist

**Owner's request**: Red text in his mockup: "Framleiðslu stjóri þarf að staðfesta að hann hafi farið yfir þessa liði áður en steypan fer í mótið"

**Implementation**: Built as part of Item 3 (batch system). The `ProductionChecklist` component renders the 5 default checklist items. Each item:
- Shows a checkbox that can be toggled
- When checked, records who checked it and when
- Shows the checker's name and timestamp in green
- When all items are checked, batch status advances to 'checklist' (ready for completion)
- When batch is completed, checklist becomes read-only

**Review questions**:
- The 5 default items are: Rebar verified, Electrical/plumbing placed, Formwork verified, Dimensions verified, Photos uploaded. Are these the right items for Jón Gunnar's workflow?
- Should we allow adding custom checklist items per batch?

---

### Item 6: Element Traceability View

**Owner's request**: "það á að vera hægt að rekja alla söguna fyrir þessa einingu. sjá frá hvaða teikningu var unnið eftir, járnabindingu (myndin), bachnumer, steypumið, svo myndir frá bílstjóra, þegar hann hleður á bílinn og tekur af bílnum"

**Implementation (`src/components/factory/TraceabilityTimeline.tsx`)**:
A vertical timeline component showing the full chronological chain for an element:
1. **Eining stofnuð** (Created) — timestamp, drawing reference
2. **Járnabinding lokið** (Rebar completed) — timestamp, rebar spec
3. **Lota [batch_number]** (Batch assigned) — batch date, concrete grade, link to batch detail
4. **Gátlisti staðfestur** (Checklist confirmed) — when all items checked
5. **Steypt** (Cast) — timestamp, concrete slip indicator
6. **Þurrkun lokið** (Curing completed) — timestamp
7. **Tilbúið til afhendingar** (Ready) — timestamp
8. **Hlaðið á bíl** (Loaded) — timestamp
9. **Afhent** (Delivered) — timestamp
- Active fix requests shown as red alerts at the top
- Photo count at bottom

**Integration**: Added to `src/app/(portals)/factory/production/[elementId]/page.tsx` between status history and photo gallery. Also added:
- `rebar_spec` display in element details
- `svalagangur` and `stair` to typeConfig labels
- `BatchDetailCard` in the right sidebar showing sibling elements

**Review questions**:
- The owner specifically mentions "myndir frá bílstjóra" (driver photos). Our timeline shows photo count but doesn't show actual photo thumbnails inline. Is this sufficient?
- The timeline currently only shows data that exists — it doesn't show "pending" future steps. Would a full lifecycle view (with grayed-out future steps) be more useful?
- The owner wants to trace from element → batch → all other elements in that batch. This is possible via BatchDetailCard → batch detail page → elements list. Is that navigation path clear enough?

---

### Item 7: Document Organization by Building/Floor

**Owner's request**: "hefði kannski þurft að flokka eftir hæðum eða svæðum, t.d áshamar 56 eru þrjár byggingar A,B,C svo valagangar"

**Database**: Added `building_id` (FK to buildings) and `floor` (integer) to `project_documents` table.

**Upload**: DocumentUploadForm now has building selector dropdown and floor number input. Both are optional.

**Display**: DocumentListWithFilter now shows:
- Teal badges on documents: "Building A / hæð 2"
- Building filter bar (appears when documents have building assignments)
- Combined filtering: category filter AND building filter work together

**Query**: `getProjectDocuments()` now joins building data in the select.

**Review questions**:
- The building selector only appears if the project has buildings in the `buildings` table. Is this always populated?
- Floor is a simple integer input. Should it validate against the building's `floors` count?
- Should the factory drawings page (`/factory/drawings`) also have building/floor filtering?

---

### Item 8: Bulk Document Upload

**Owner's request**: "GG gaman er með 20 teikningar. lengi að henda inn einu og einu."

**Implementation (`src/components/documents/MultiDocumentUploadForm.tsx`)**:
- Drag-and-drop zone accepting PDF, images, Excel, Word (same types as single upload)
- File list with per-file status indicators (pending/uploading/done/error)
- Global category, building, floor selectors applied to all files
- Sequential upload (calls `uploadDocument` per file to avoid overwhelming the server)
- Progress stats (pending/done/error counts)
- Auto-reload when all files complete

**Integration (`src/components/documents/DocumentUploadTabs.tsx`)**:
- Toggle between "Eitt" (single) and "Mörg" (multi) upload modes
- Used in both admin and factory project pages

**Review questions**:
- Sequential upload is safe but slow for 20 files. Should we consider parallel upload (e.g., 3 at a time)?
- The multi-upload applies the same category/building/floor to ALL files. The owner might want different categories per file. Is this a problem?
- Max file size is 50MB per file (same as single upload). Is this appropriate for structural engineering PDFs?
- The single-file form supports element linking (associating a document with a specific element). The multi-upload form does NOT. Should it?

---

## Complete File Inventory

### New Files Created (12)

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/migrations/028_production_batches_and_enhancements.sql` | 171 | Database migration |
| `src/lib/factory/batch-actions.ts` | 600 | Batch CRUD + checklist server actions |
| `src/components/factory/BatchCreateDialog.tsx` | ~250 | Create batch from element picker |
| `src/components/factory/ProductionChecklist.tsx` | ~150 | Interactive checklist |
| `src/components/factory/BatchDetailCard.tsx` | ~100 | Batch info in element sidebar |
| `src/components/factory/ConcreteSlipUpload.tsx` | ~130 | Concrete slip upload |
| `src/components/factory/TraceabilityTimeline.tsx` | 300 | Full element history timeline |
| `src/app/(portals)/factory/batches/page.tsx` | ~200 | Batch list page |
| `src/app/(portals)/factory/batches/[batchId]/page.tsx` | ~300 | Batch detail page |
| `src/app/(portals)/factory/batches/[batchId]/BatchCompletionButton.tsx` | ~60 | Completion button |
| `src/components/documents/MultiDocumentUploadForm.tsx` | 320 | Multi-file upload |
| `src/components/documents/DocumentUploadTabs.tsx` | 65 | Single/multi upload toggle |

### Modified Files (13)

| File | What changed |
|------|-------------|
| `src/types/database.ts` | production_batches types, batch_id on elements, fix columns, doc columns |
| `src/lib/elements/actions.ts` | batch_number written in create + update |
| `src/components/elements/ElementForm.tsx` | batch_number field + auto weight calculator |
| `src/lib/factory/fix-factory-actions.ts` | root_cause, corrective_action, lessons_learned in CRUD |
| `src/components/factory/FixInFactoryList.tsx` | Rewritten: root_cause in create, corrective/lessons in complete, expandable rows |
| `src/lib/documents/actions.ts` | building_id + floor in upload, building join in query |
| `src/components/documents/DocumentUploadForm.tsx` | Building + floor selectors |
| `src/components/documents/DocumentListWithFilter.tsx` | Building/floor badges + filter |
| `src/app/(portals)/factory/production/page.tsx` | Batch link button |
| `src/app/(portals)/factory/production/[elementId]/page.tsx` | Batch data, traceability, rebar_spec, svalagangur label |
| `src/components/layout/RoleBasedNav.tsx` | "Steypulotur" nav item |
| `src/app/(portals)/admin/projects/[projectId]/page.tsx` | DocumentUploadTabs + buildings |
| `src/app/(portals)/factory/projects/[projectId]/page.tsx` | DocumentUploadTabs + buildings + BatchCreateDialog |

---

## Verification Status

- `npx tsc --noEmit` — **zero errors**
- `npm run build` — **all routes compile** (70+ routes including new `/factory/batches/*`)
- `supabase db push --include-all` — **both migrations 027 and 028 applied successfully**
- Manual testing: NOT yet performed

---

## Potential Concerns for Reviewer

### Architecture
1. **Batch number generation race condition**: `generate_batch_number()` uses `SELECT MAX() + 1`. Under high concurrency, two batches could get the same number. The `UNIQUE` constraint on `batch_number` would catch this, but the user would get an error. Consider using a sequence or advisory lock.

2. **JSONB checklist pattern**: The checklist is stored as a JSONB array in the batch record. Updates require read-modify-write (fetch, update JS array, write back). This is fine for low-concurrency (one factory manager at a time) but could have issues if two people update the same checklist simultaneously. Consider if this needs optimistic locking.

3. **N+1 queries in getBatchesForProject()**: For each batch, we do a separate query to get elements. `getAllBatches()` optimizes this by doing a single IN() query. Should `getBatchesForProject()` follow the same pattern?

### Missing from Owner's Vision
4. **Element type grouping in batch creation**: Owner's mockup shows tabs for Filigran/Balcony/Stairs/Columns. Our implementation has a flat checkbox list. This is functional but doesn't match his visual.

5. **Air temperature**: Owner's mockup includes an "Air Temperature" field on the production page. We don't capture this.

6. **Defect photos**: The `photos` JSONB column was added to `fix_in_factory` but no UI was built to upload photos to defect reports. The existing `PhotoUploadForm` could potentially be reused.

7. **Batch number on the production queue page**: The owner's mockup shows batch numbers directly on the element list. Our production queue page doesn't display batch numbers — you have to click into an element to see its batch info.

### Code Quality
8. **`as unknown as ChecklistItem[]` casts**: There are 5 instances of this cast in batch-actions.ts. This is needed because Supabase returns JSONB as `Json` type. A Zod parser could validate the shape at runtime instead.

9. **Error handling consistency**: Some server actions throw errors (via `requireFactoryAuth()`), while others return `{ error: string }`. The catch block converts thrown errors to error returns, which works, but mixing patterns adds complexity.

10. **The `DocumentUploadForm` is no longer directly imported by any page** — it's only used through `DocumentUploadTabs`. The file could potentially be converted to a non-exported component inside DocumentUploadTabs, but since it's also a standalone component, keeping it separate is fine.

---

## How to Review

1. **Read the owner's email** (Email 4 PDF in `/Owners Feedback/Email 4/Gmail - comments 2.pdf`) to understand requirements
2. **Look at his mockup screenshots** (`framleiðsla.jpg`, `image-3.png`) to see his vision
3. **Read the migration** (`supabase/migrations/028_production_batches_and_enhancements.sql`) for data model
4. **Read the server actions** (`src/lib/factory/batch-actions.ts`) for business logic
5. **Scan the components** for UI patterns
6. **Check the review questions** listed under each item
7. **Verify against the owner's mockup** — does the implementation match his visual?
8. **Try the manual test flows** from the verification plan below

### Manual Test Flows
1. Create an element → verify batch_number saves to DB
2. Enter dimensions in ElementForm → verify auto weight/area appears
3. Go to factory project page → click "Stofna steypulotu" → select elements → create batch
4. Go to batch detail page → check off checklist items → verify who/when tracking
5. Upload concrete slip to batch
6. Complete batch → verify elements advance to 'cast'
7. Open element detail → verify traceability timeline shows full chain
8. Create fix request with root_cause → complete with corrective_action + lessons_learned
9. Upload document with building + floor → verify filters work
10. Use multi-upload for 3+ documents → verify sequential upload with progress
