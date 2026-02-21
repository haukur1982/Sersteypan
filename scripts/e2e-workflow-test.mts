#!/usr/bin/env tsx
/**
 * E2E Workflow Test — Full Lifecycle
 *
 * Runs the entire Sersteypan lifecycle automatically:
 *   1. SETUP — Create project, buildings
 *   2. UPLOAD — Upload 8 real PDF drawings to Supabase Storage
 *   3. AI ANALYSIS — Run AI extraction on each drawing
 *   4. COMMIT — Convert extracted elements to real DB records
 *   5. BATCHES — Create production batches, complete checklists
 *   6. REPORT — Generate summary report
 *
 * Usage:
 *   npm run test:workflow              # Full run
 *   npm run test:workflow:skip-ai      # Use cached AI results only
 *
 * Prerequisites:
 *   - .env.local with SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 *   - ANTHROPIC_API_KEY (unless SKIP_AI_ANALYSIS=true)
 *   - Real drawings in /Owners Feedback/ directory
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

import {
  TEST_PROJECT,
  ADMIN_EMAIL,
  TEST_BUILDINGS,
  TEST_DRAWINGS,
  BATCH_DEFAULTS,
  CHECKLIST_KEYS,
  CACHE_DIR,
  SKIP_AI,
  MAX_CONCURRENT_ANALYSES,
  type DrawingConfig,
} from './e2e-workflow-config.mjs'

// =====================================================
// Inlined shared logic from src/lib/
// (Cannot import .ts from Next.js source tree in ESM scripts
//  due to CJS/ESM interop issues with path aliases)
// =====================================================

// From src/lib/schemas/drawing-analysis.ts — ELEMENT_TYPE_MAP
const ELEMENT_TYPE_MAP: Record<string, string> = {
  filigran: 'filigran', balcony: 'balcony', staircase: 'staircase',
  wall: 'wall', column: 'column', beam: 'beam', ceiling: 'ceiling',
  corridor: 'svalagangur',
  svalir: 'balcony', svalagangar: 'svalagangur', svalagangur: 'svalagangur',
  stigi: 'staircase', stigategund: 'staircase', veggur: 'wall',
  sula: 'column', súla: 'column', bita: 'beam', þak: 'ceiling',
  filegranplata: 'filigran', filegranplötur: 'filigran',
  svalaplata: 'balcony', svalaplötur: 'balcony',
  fg: 'filigran', sv: 'balcony', sg: 'svalagangur', st: 'staircase',
  bf: 'filigran', bs: 'other',
}

function mapElementType(aiType: string): string {
  return ELEMENT_TYPE_MAP[aiType.toLowerCase().trim()] || 'other'
}

// From src/lib/drawing-analysis/weight.ts
const DEFAULT_THICKNESSES: Record<string, number> = {
  filigran: 60, balcony: 200, svalagangur: 200,
}

function estimateWeight(
  lengthMm: number | null, widthMm: number | null,
  heightMm: number | null, elementType?: string
): { weightKg: number; source: 'calculated' | 'estimated' } | null {
  if (!lengthMm || !widthMm) return null
  const density = 2400 // kg/m³
  if (heightMm) {
    const vol = (lengthMm / 1000) * (widthMm / 1000) * (heightMm / 1000)
    return { weightKg: Math.round(vol * density * 10) / 10, source: 'calculated' }
  }
  if (elementType) {
    const defaultH = DEFAULT_THICKNESSES[elementType]
    if (defaultH) {
      const vol = (lengthMm / 1000) * (widthMm / 1000) * (defaultH / 1000)
      return { weightKg: Math.round(vol * density * 10) / 10, source: 'estimated' }
    }
  }
  return null
}

// From src/lib/ai/parse-response.ts
function parseAIResponse(responseText: string): {
  success: boolean
  elements: unknown[]
  warnings: string[]
  page_description: string
  drawing_reference: string
  drawing_type: string
  building: string | null
  error?: string
  rawText?: string
} {
  let jsonText = responseText.trim()
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) jsonText = jsonMatch[1].trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonText) as Record<string, unknown>
  } catch {
    return {
      success: false, elements: [], warnings: [], page_description: '',
      drawing_reference: '', drawing_type: 'unknown', building: null,
      error: 'Invalid JSON', rawText: responseText.slice(0, 2000),
    }
  }

  return {
    success: true,
    elements: Array.isArray(parsed.elements) ? parsed.elements : [],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings as string[] : [],
    page_description: typeof parsed.page_description === 'string' ? parsed.page_description : '',
    drawing_reference: typeof parsed.drawing_reference === 'string' ? parsed.drawing_reference : '',
    drawing_type: typeof parsed.drawing_type === 'string' ? parsed.drawing_type : 'unknown',
    building: typeof parsed.building === 'string' ? parsed.building : null,
  }
}

// From src/lib/ai/drawing-prompt.ts — buildUserPrompt
function buildUserPrompt(params: { projectName: string; documentName: string; buildingList: string }): string {
  return `Analyze this structural engineering drawing from project "${params.projectName}".
The drawing file is named "${params.documentName}".

The project has the following buildings: ${params.buildingList}.

Extract ALL precast concrete elements visible in this drawing.
Be thorough — count every single element. For filigran drawings there may be 20-50+ elements on a single sheet.
For each element, extract dimensions from the dimension lines on the drawing.
Return ONLY valid JSON — no markdown formatting, no code blocks.`
}

// The SYSTEM_PROMPT is loaded from a separate file to keep this script readable
// We use fs.readFileSync to load it at runtime from the extracted module
const SYSTEM_PROMPT_PATH = path.resolve(import.meta.dirname, '../src/lib/ai/drawing-prompt.ts')
let SYSTEM_PROMPT: string
try {
  const promptFile = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8')
  // Extract the template literal between backticks after "export const SYSTEM_PROMPT = `" and the closing backtick
  const match = promptFile.match(/export const SYSTEM_PROMPT = `([\s\S]*?)`/)
  if (!match) throw new Error('SYSTEM_PROMPT not found in drawing-prompt.ts')
  SYSTEM_PROMPT = match[1]
} catch (err) {
  console.error('Failed to load SYSTEM_PROMPT from drawing-prompt.ts:', err)
  process.exit(1)
}

// =====================================================
// Utility: Load .env.local
// =====================================================

function loadEnvFile(fileName: string) {
  const envPath = path.resolve(import.meta.dirname, `../${fileName}`)
  if (!fs.existsSync(envPath)) return

  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const clean = line.trim()
    if (!clean || clean.startsWith('#')) continue

    const idx = clean.indexOf('=')
    if (idx <= 0) continue

    const key = clean.substring(0, idx).trim()
    let value = clean.substring(idx + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

// =====================================================
// Config
// =====================================================

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '❌ Missing environment variables.\n\n' +
    '  Required:\n' +
    `    NEXT_PUBLIC_SUPABASE_URL  ${SUPABASE_URL ? '✓ found' : '✗ missing'}\n` +
    `    SUPABASE_SERVICE_ROLE_KEY ${SERVICE_ROLE_KEY ? '✓ found' : '✗ missing'}\n\n` +
    '  Get your service role key from:\n' +
    '    Supabase Dashboard → Settings → API → service_role key\n\n' +
    '  Usage:\n' +
    '    SUPABASE_SERVICE_ROLE_KEY=eyJ... npm run test:workflow\n'
  )
  process.exit(1)
}

// =====================================================
// Supabase Client (service role — bypasses RLS)
// =====================================================

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// =====================================================
// Report Collector
// =====================================================

interface ReportEntry {
  phase: string
  step: string
  success: boolean
  details?: string
  duration_ms?: number
}

const report: {
  entries: ReportEntry[]
  drawingsAnalyzed: number
  elementsExtracted: number
  elementsCommitted: number
  batchesCreated: number
  batchesCompleted: number
  lowConfidenceItems: Array<{ name: string; field: string; level: string }>
  warnings: string[]
  errors: string[]
} = {
  entries: [],
  drawingsAnalyzed: 0,
  elementsExtracted: 0,
  elementsCommitted: 0,
  batchesCreated: 0,
  batchesCompleted: 0,
  lowConfidenceItems: [],
  warnings: [],
  errors: [],
}

function log(phase: string, msg: string) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}] [${phase}] ${msg}`)
}

function logError(phase: string, msg: string) {
  const ts = new Date().toISOString().slice(11, 19)
  console.error(`[${ts}] [${phase}] ❌ ${msg}`)
  report.errors.push(`[${phase}] ${msg}`)
}

// =====================================================
// PHASE 1: SETUP
// =====================================================

async function phase1Setup(): Promise<{
  adminId: string
  projectId: string
  buildings: Array<{ id: string; name: string; floors: number }>
}> {
  log('SETUP', '═══════════════════════════════════════')
  log('SETUP', 'Phase 1: Setting up project and buildings')
  log('SETUP', '═══════════════════════════════════════')

  // 1. Find admin user
  const { data: adminProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (profileErr || !adminProfile) {
    throw new Error(`Admin user not found: ${profileErr?.message}`)
  }

  const adminId = adminProfile.id
  log('SETUP', `Admin user: ${adminProfile.full_name} (${adminId})`)

  // 2. Clean up existing test project (for re-runs)
  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('name', TEST_PROJECT.name)

  if (existing && existing.length > 0) {
    log('SETUP', `Cleaning up ${existing.length} existing test project(s)...`)
    for (const proj of existing) {
      // Delete in order: elements → batches → analyses → documents → buildings → project
      await supabase.from('elements').delete().eq('project_id', proj.id)
      await supabase
        .from('production_batches')
        .delete()
        .eq('project_id', proj.id)
      await supabase
        .from('drawing_analyses')
        .delete()
        .eq('project_id', proj.id)
      await supabase
        .from('project_documents')
        .delete()
        .eq('project_id', proj.id)
      await supabase.from('buildings').delete().eq('project_id', proj.id)
      await supabase.from('projects').delete().eq('id', proj.id)
    }
    log('SETUP', 'Cleanup complete')
  }

  // 3. Find or create company
  let companyId: string
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .limit(1)
    .single()

  if (existingCompany) {
    companyId = existingCompany.id
    log('SETUP', `Using existing company: ${companyId}`)
  } else {
    const { data: newCompany, error: compErr } = await supabase
      .from('companies')
      .insert({
        name: 'Áshamar ehf.',
        kennitala: '5501012020',
        contact_name: 'Jón Gunnar',
        contact_email: 'test@ashamar.is',
      })
      .select('id')
      .single()

    if (compErr || !newCompany) {
      throw new Error(`Failed to create company: ${compErr?.message}`)
    }
    companyId = newCompany.id
    log('SETUP', `Created company: Áshamar ehf. (${companyId})`)
  }

  // 4. Create project
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      name: TEST_PROJECT.name,
      company_id: companyId,
      status: 'active',
      description: TEST_PROJECT.description,
      address: TEST_PROJECT.address,
    })
    .select('id')
    .single()

  if (projErr || !project) {
    throw new Error(`Failed to create project: ${projErr?.message}`)
  }

  log('SETUP', `Created project: "${TEST_PROJECT.name}" (${project.id})`)

  // 5. Create buildings
  const buildings: Array<{ id: string; name: string; floors: number }> = []
  for (const bld of TEST_BUILDINGS) {
    const { data: building, error: bldErr } = await supabase
      .from('buildings')
      .insert({
        project_id: project.id,
        name: bld.name,
        floors: bld.floors,
      })
      .select('id')
      .single()

    if (bldErr || !building) {
      logError('SETUP', `Failed to create building ${bld.name}: ${bldErr?.message}`)
      continue
    }

    buildings.push({ id: building.id, name: bld.name, floors: bld.floors })
    log('SETUP', `Created building: ${bld.name} (${bld.floors} floors)`)
  }

  report.entries.push({
    phase: 'SETUP',
    step: 'Create project + buildings',
    success: true,
    details: `Project: ${project.id}, Buildings: ${buildings.length}`,
  })

  return { adminId, projectId: project.id, buildings }
}

// =====================================================
// PHASE 2: UPLOAD DRAWINGS
// =====================================================

async function phase2Upload(
  projectId: string,
  adminId: string
): Promise<Array<{ id: string; drawing: DrawingConfig }>> {
  log('UPLOAD', '═══════════════════════════════════════')
  log('UPLOAD', 'Phase 2: Uploading drawings to Supabase Storage')
  log('UPLOAD', '═══════════════════════════════════════')

  const uploaded: Array<{ id: string; drawing: DrawingConfig }> = []

  for (const drawing of TEST_DRAWINGS) {
    // Check file exists
    if (!fs.existsSync(drawing.filePath)) {
      logError('UPLOAD', `File not found: ${drawing.filePath}`)
      continue
    }

    const fileBuffer = fs.readFileSync(drawing.filePath)
    const fileSize = fileBuffer.length

    // Upload to Supabase Storage
    // Sanitize filename for storage path — Supabase doesn't allow Icelandic chars in keys
    const safeFileName = drawing.fileName
      .replace(/[ýÝ]/g, 'y').replace(/[æÆ]/g, 'ae').replace(/[ðÐ]/g, 'd')
      .replace(/[þÞ]/g, 'th').replace(/[öÖ]/g, 'o').replace(/[áÁ]/g, 'a')
      .replace(/[íÍ]/g, 'i').replace(/[úÚ]/g, 'u').replace(/[éÉ]/g, 'e')
      .replace(/[ó]/g, 'o')
      .replace(/[^a-zA-Z0-9._\-/]/g, '_')
    const storagePath = `${projectId}/${Date.now()}-${safeFileName}`

    const { error: uploadError } = await supabase.storage
      .from('project-documents')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      logError('UPLOAD', `Failed to upload ${drawing.fileName}: ${uploadError.message}`)
      continue
    }

    // Create document record (note: no file_size column in project_documents table)
    const { data: doc, error: docErr } = await supabase
      .from('project_documents')
      .insert({
        project_id: projectId,
        name: drawing.fileName,
        file_url: storagePath,
        file_type: 'application/pdf',
        category: 'drawing',
        uploaded_by: adminId,
      })
      .select('id')
      .single()

    if (docErr || !doc) {
      logError('UPLOAD', `Failed to create document record: ${docErr?.message}`)
      continue
    }

    uploaded.push({ id: doc.id, drawing })
    log(
      'UPLOAD',
      `✓ ${drawing.fileName} (${(fileSize / 1024).toFixed(0)}KB) → ${doc.id}`
    )
  }

  report.entries.push({
    phase: 'UPLOAD',
    step: 'Upload drawings',
    success: uploaded.length === TEST_DRAWINGS.length,
    details: `${uploaded.length}/${TEST_DRAWINGS.length} uploaded`,
  })

  return uploaded
}

// =====================================================
// PHASE 3: AI ANALYSIS
// =====================================================

interface AnalysisResult {
  analysisId: string
  documentId: string
  drawing: DrawingConfig
  elements: unknown[]
  warnings: string[]
  drawingRef: string
  drawingType: string
  building: string | null
  cached: boolean
}

async function phase3Analysis(
  projectId: string,
  adminId: string,
  documents: Array<{ id: string; drawing: DrawingConfig }>,
  buildings: Array<{ id: string; name: string }>
): Promise<AnalysisResult[]> {
  log('ANALYSIS', '═══════════════════════════════════════')
  log('ANALYSIS', 'Phase 3: Running AI drawing analysis')
  log('ANALYSIS', '═══════════════════════════════════════')

  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }

  const results: AnalysisResult[] = []

  // Process in batches of MAX_CONCURRENT_ANALYSES
  for (let i = 0; i < documents.length; i += MAX_CONCURRENT_ANALYSES) {
    const batch = documents.slice(i, i + MAX_CONCURRENT_ANALYSES)

    const promises = batch.map((doc) =>
      analyzeOneDrawing(projectId, adminId, doc, buildings)
    )

    const batchResults = await Promise.allSettled(promises)

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value)
      } else if (result.status === 'rejected') {
        logError('ANALYSIS', `Analysis failed: ${result.reason}`)
      }
    }
  }

  report.drawingsAnalyzed = results.length
  report.elementsExtracted = results.reduce(
    (sum, r) => sum + r.elements.length,
    0
  )

  log(
    'ANALYSIS',
    `═══ Analysis complete: ${results.length} drawings, ${report.elementsExtracted} elements extracted ═══`
  )

  return results
}

async function analyzeOneDrawing(
  projectId: string,
  adminId: string,
  doc: { id: string; drawing: DrawingConfig },
  buildings: Array<{ id: string; name: string }>
): Promise<AnalysisResult | null> {
  const startTime = Date.now()
  const { drawing } = doc

  // Check cache
  const pdfBuffer = fs.readFileSync(drawing.filePath)
  const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')
  const cachePath = path.join(CACHE_DIR, `${hash}.json`)

  // Create analysis record
  const { data: analysis, error: analysisErr } = await supabase
    .from('drawing_analyses')
    .insert({
      project_id: projectId,
      document_id: doc.id,
      document_name: drawing.fileName,
      status: 'pending',
      created_by: adminId,
    })
    .select('id')
    .single()

  if (analysisErr || !analysis) {
    logError(
      'ANALYSIS',
      `Failed to create analysis record for ${drawing.fileName}: ${analysisErr?.message}`
    )
    return null
  }

  // Try cache first
  if (fs.existsSync(cachePath)) {
    log('ANALYSIS', `📦 Cache hit for ${drawing.fileName}`)
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'))

    // Store results in DB
    await supabase
      .from('drawing_analyses')
      .update({
        status: 'completed',
        extracted_elements: cached.elements || [],
        ai_summary: cached.page_description || '',
        ai_model: cached._model || 'cached',
        ai_confidence_notes:
          cached.warnings?.length > 0 ? cached.warnings.join('\n') : null,
        pages_analyzed: 1,
      })
      .eq('id', analysis.id)

    const elements = cached.elements || []
    collectConfidenceData(elements, drawing.fileName)

    report.entries.push({
      phase: 'ANALYSIS',
      step: drawing.fileName,
      success: true,
      details: `${elements.length} elements (cached)`,
    })

    return {
      analysisId: analysis.id,
      documentId: doc.id,
      drawing,
      elements,
      warnings: cached.warnings || [],
      drawingRef: cached.drawing_reference || drawing.fileName,
      drawingType: cached.drawing_type || 'unknown',
      building: cached.building || null,
      cached: true,
    }
  }

  // Skip AI if flag set
  if (SKIP_AI) {
    log('ANALYSIS', `⏭️  Skipping AI for ${drawing.fileName} (SKIP_AI_ANALYSIS=true)`)
    await supabase
      .from('drawing_analyses')
      .update({
        status: 'failed',
        error_message: 'Skipped — SKIP_AI_ANALYSIS=true and no cache',
      })
      .eq('id', analysis.id)
    return null
  }

  // Run AI analysis
  log('ANALYSIS', `🤖 Analyzing ${drawing.fileName}...`)

  await supabase
    .from('drawing_analyses')
    .update({ status: 'processing' })
    .eq('id', analysis.id)

  try {
    const pdfBase64 = pdfBuffer.toString('base64')

    const buildingList =
      buildings.length > 0
        ? buildings.map((b) => b.name).join(', ')
        : 'Engar byggingar skilgreindar enn'

    const userPrompt = buildUserPrompt({
      projectName: TEST_PROJECT.name,
      documentName: drawing.fileName,
      buildingList,
    })

    // Use Anthropic SDK directly (avoid CJS/ESM import issues with source tree)
    const providerName = (process.env.AI_DRAWING_PROVIDER || 'anthropic').toLowerCase()
    let responseText: string
    let modelUsed: string

    if (providerName === 'google') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const apiKey = process.env.GOOGLE_AI_API_KEY
      if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not set')
      const genAI = new GoogleGenerativeAI(apiKey)
      modelUsed = process.env.AI_DRAWING_MODEL || 'gemini-2.5-pro'
      const model = genAI.getGenerativeModel({ model: modelUsed, systemInstruction: SYSTEM_PROMPT })
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
          { text: userPrompt },
        ] }],
        generationConfig: { maxOutputTokens: 16000 },
      })
      responseText = result.response.text()
    } else {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
      const anthropic = new Anthropic({ apiKey })
      modelUsed = process.env.AI_DRAWING_MODEL || 'claude-opus-4-20250514'
      // Use streaming to avoid timeout on long PDF analysis (>10min)
      const stream = anthropic.messages.stream({
        model: modelUsed,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
            { type: 'text', text: userPrompt },
          ],
        }],
      })
      const message = await stream.finalMessage()
      responseText = message.content
        .filter((b) => b.type === 'text')
        .map((b) => (b.type === 'text' ? b.text : ''))
        .join('\n').trim()
    }

    const aiResult = { responseText, model: modelUsed, provider: providerName }

    const duration = Date.now() - startTime

    // Parse response
    const parseResult = parseAIResponse(aiResult.responseText)

    if (!parseResult.success) {
      logError(
        'ANALYSIS',
        `Failed to parse response for ${drawing.fileName}: ${parseResult.error}`
      )

      await supabase
        .from('drawing_analyses')
        .update({
          status: 'failed',
          error_message: parseResult.error || 'Parse failed',
          ai_confidence_notes: parseResult.rawText,
        })
        .eq('id', analysis.id)

      return null
    }

    const elements = parseResult.elements
    const warnings = parseResult.warnings

    // Cache the raw parsed result
    const cacheData = {
      elements,
      warnings,
      page_description: parseResult.page_description,
      drawing_reference: parseResult.drawing_reference || drawing.fileName,
      drawing_type: parseResult.drawing_type || 'unknown',
      building: parseResult.building,
      _model: aiResult.model,
      _provider: aiResult.provider,
      _cached_at: new Date().toISOString(),
    }

    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2))

    // Store in DB
    await supabase
      .from('drawing_analyses')
      .update({
        status: 'completed',
        extracted_elements: elements,
        ai_summary: parseResult.page_description,
        ai_model: aiResult.model,
        ai_confidence_notes:
          warnings.length > 0 ? warnings.join('\n') : null,
        pages_analyzed: 1,
      })
      .eq('id', analysis.id)

    collectConfidenceData(elements, drawing.fileName)

    const drawingRef = cacheData.drawing_reference || drawing.fileName
    const drawingType = cacheData.drawing_type || 'unknown'

    log(
      'ANALYSIS',
      `✓ ${drawing.fileName}: ${elements.length} elements, type=${drawingType}, ref=${drawingRef} (${(duration / 1000).toFixed(1)}s)`
    )

    if (warnings.length > 0) {
      for (const w of warnings) {
        log('ANALYSIS', `  ⚠️ ${w}`)
        report.warnings.push(`[${drawing.fileName}] ${w}`)
      }
    }

    // Validate against expectations
    if (
      elements.length < drawing.expectedMinElements ||
      elements.length > drawing.expectedMaxElements
    ) {
      const msg = `Element count ${elements.length} outside expected range [${drawing.expectedMinElements}-${drawing.expectedMaxElements}]`
      log('ANALYSIS', `  ⚠️ ${msg}`)
      report.warnings.push(`[${drawing.fileName}] ${msg}`)
    }

    report.entries.push({
      phase: 'ANALYSIS',
      step: drawing.fileName,
      success: true,
      details: `${elements.length} elements, ${warnings.length} warnings`,
      duration_ms: duration,
    })

    return {
      analysisId: analysis.id,
      documentId: doc.id,
      drawing,
      elements,
      warnings,
      drawingRef,
      drawingType,
      building: cacheData.building || null,
      cached: false,
    }
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Unknown AI analysis error'
    logError('ANALYSIS', `${drawing.fileName}: ${errorMsg}`)

    await supabase
      .from('drawing_analyses')
      .update({
        status: 'failed',
        error_message: `Greining mistókst: ${errorMsg}`,
      })
      .eq('id', analysis.id)

    return null
  }
}

function collectConfidenceData(elements: unknown[], fileName: string) {
  for (const el of elements) {
    const element = el as {
      name?: string
      confidence?: { name?: string; dimensions?: string; weight?: string }
    }
    if (!element.confidence) continue

    for (const [field, level] of Object.entries(element.confidence)) {
      if (level === 'low') {
        report.lowConfidenceItems.push({
          name: element.name || 'unknown',
          field,
          level,
        })
      }
    }
  }
}

// =====================================================
// PHASE 4: COMMIT ELEMENTS
// =====================================================

async function phase4Commit(
  projectId: string,
  adminId: string,
  analyses: AnalysisResult[],
  buildings: Array<{ id: string; name: string }>
): Promise<number> {
  log('COMMIT', '═══════════════════════════════════════')
  log('COMMIT', 'Phase 4: Committing elements to database')
  log('COMMIT', '═══════════════════════════════════════')

  // Build building name → ID map
  const buildingMap: Record<string, string> = {}
  for (const b of buildings) {
    buildingMap[b.name.toLowerCase()] = b.id
    const stripped = b.name.toLowerCase().replace(/^hús\s+/i, '')
    buildingMap[stripped] = b.id
  }

  let totalCommitted = 0

  for (const analysis of analyses) {
    if (!analysis.elements.length) {
      log(
        'COMMIT',
        `⏭️  Skipping ${analysis.drawing.fileName} (0 elements)`
      )
      continue
    }

    const elementsToInsert: Array<Record<string, unknown>> = []

    for (const rawEl of analysis.elements) {
      const element = rawEl as {
        name: string
        element_type: string
        length_mm?: number | null
        width_mm?: number | null
        height_mm?: number | null
        weight_kg?: number | null
        quantity?: number
        rebar_spec?: string | null
        floor?: number | null
        building?: string | null
        production_notes?: string | null
      }

      const systemType = mapElementType(element.element_type || 'other')
      const buildingId = resolveBuildingId(element.building, buildingMap)

      // Estimate weight if not provided
      let weightKg = element.weight_kg || null
      if (!weightKg && element.length_mm && element.width_mm) {
        const est = estimateWeight(
          element.length_mm,
          element.width_mm,
          element.height_mm || null,
          systemType
        )
        if (est) weightKg = est.weightKg
      }

      const qty = element.quantity || 1
      const drawingRef = analysis.drawing.fileName

      if (qty > 1 && element.production_notes?.match(/\d+H:/)) {
        // Per-floor breakdown
        const floorBreakdown = parseFloorBreakdown(
          element.production_notes
        )

        if (floorBreakdown.length > 0) {
          for (const { floor, count } of floorBreakdown) {
            for (let i = 1; i <= count; i++) {
              elementsToInsert.push({
                project_id: projectId,
                building_id: buildingId,
                name: `${element.name}-${floor}H-${i}`,
                element_type: systemType,
                status: 'planned',
                floor,
                length_mm: element.length_mm || null,
                width_mm: element.width_mm || null,
                height_mm: element.height_mm || null,
                weight_kg: weightKg,
                rebar_spec: element.rebar_spec || null,
                drawing_reference: drawingRef,
                production_notes: element.production_notes || null,
                priority: 0,
                created_by: adminId,
              })
            }
          }
        } else {
          // Couldn't parse → simple expansion
          for (let i = 1; i <= qty; i++) {
            elementsToInsert.push({
              project_id: projectId,
              building_id: buildingId,
              name: `${element.name}-${i}`,
              element_type: systemType,
              status: 'planned',
              floor: element.floor || null,
              length_mm: element.length_mm || null,
              width_mm: element.width_mm || null,
              height_mm: element.height_mm || null,
              weight_kg: weightKg,
              rebar_spec: element.rebar_spec || null,
              drawing_reference: drawingRef,
              production_notes: element.production_notes || null,
              priority: 0,
              created_by: adminId,
            })
          }
        }
      } else {
        // Single element
        elementsToInsert.push({
          project_id: projectId,
          building_id: buildingId,
          name: element.name,
          element_type: systemType,
          status: 'planned',
          floor: element.floor || null,
          length_mm: element.length_mm || null,
          width_mm: element.width_mm || null,
          height_mm: element.height_mm || null,
          weight_kg: weightKg,
          rebar_spec: element.rebar_spec || null,
          drawing_reference: drawingRef,
          production_notes: element.production_notes || null,
          priority: 0,
          created_by: adminId,
        })
      }
    }

    // Batch insert (chunks of 500)
    let inserted = 0
    for (let i = 0; i < elementsToInsert.length; i += 500) {
      const chunk = elementsToInsert.slice(i, i + 500)
      const { error: insertErr } = await supabase
        .from('elements')
        .insert(chunk)

      if (insertErr) {
        logError(
          'COMMIT',
          `Insert error for ${analysis.drawing.fileName}: ${insertErr.message}`
        )
        break
      }
      inserted += chunk.length
    }

    // Update analysis status
    await supabase
      .from('drawing_analyses')
      .update({
        status: 'committed',
        elements_created: inserted,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', analysis.analysisId)

    totalCommitted += inserted
    log(
      'COMMIT',
      `✓ ${analysis.drawing.fileName}: ${analysis.elements.length} extracted → ${inserted} elements committed`
    )

    report.entries.push({
      phase: 'COMMIT',
      step: analysis.drawing.fileName,
      success: inserted > 0,
      details: `${inserted} elements committed`,
    })
  }

  report.elementsCommitted = totalCommitted
  log('COMMIT', `═══ Total elements committed: ${totalCommitted} ═══`)

  return totalCommitted
}

// =====================================================
// PHASE 5: PRODUCTION BATCHES
// =====================================================

async function phase5Batches(
  projectId: string,
  adminId: string
): Promise<void> {
  log('BATCHES', '═══════════════════════════════════════')
  log('BATCHES', 'Phase 5: Creating and completing production batches')
  log('BATCHES', '═══════════════════════════════════════')

  // 1. Get all uncommitted elements
  const { data: elements, error: elemErr } = await supabase
    .from('elements')
    .select('id, name, element_type, building_id, floor')
    .eq('project_id', projectId)
    .eq('status', 'planned')
    .is('batch_id', null)

  if (elemErr || !elements) {
    logError('BATCHES', `Failed to fetch elements: ${elemErr?.message}`)
    return
  }

  if (elements.length === 0) {
    log('BATCHES', 'No unbatched elements found — skipping')
    return
  }

  log('BATCHES', `Found ${elements.length} unbatched elements`)

  // 2. Group by building + floor + element_type
  const groups: Record<string, string[]> = {}
  for (const el of elements) {
    const key = `${el.building_id || 'none'}_${el.floor ?? 'none'}_${el.element_type}`
    if (!groups[key]) groups[key] = []
    groups[key].push(el.id)
  }

  log('BATCHES', `Grouped into ${Object.keys(groups).length} batches`)

  // 3. Create batches using RPC
  const batchIds: string[] = []

  for (const [groupKey, elementIds] of Object.entries(groups)) {
    // Limit batch size to ~20 elements (realistic factory batch)
    const chunks: string[][] = []
    for (let i = 0; i < elementIds.length; i += 20) {
      chunks.push(elementIds.slice(i, i + 20))
    }

    for (const chunk of chunks) {
      const { data: result, error: rpcError } = await supabase.rpc(
        'create_batch_with_elements',
        {
          p_project_id: projectId,
          p_element_ids: chunk,
          p_created_by: adminId,
          p_concrete_supplier: BATCH_DEFAULTS.concreteSupplier,
          p_concrete_grade: BATCH_DEFAULTS.concreteGrade,
          p_notes: `E2E test batch — group ${groupKey}`,
        }
      )

      if (rpcError) {
        logError('BATCHES', `RPC create_batch error: ${rpcError.message}`)
        continue
      }

      const rpcResult = result as { success?: boolean; batchId?: string; batchNumber?: string; error?: string }

      if (rpcResult?.error) {
        logError('BATCHES', `Batch creation failed: ${rpcResult.error}`)
        continue
      }

      if (rpcResult?.batchId) {
        batchIds.push(rpcResult.batchId)
        log(
          'BATCHES',
          `✓ Created batch ${rpcResult.batchNumber} with ${chunk.length} elements`
        )
      }
    }
  }

  report.batchesCreated = batchIds.length
  log('BATCHES', `Created ${batchIds.length} batches`)

  // 4. Complete each batch (check all checklist items first)
  for (const batchId of batchIds) {
    // Fetch current checklist
    const { data: batch } = await supabase
      .from('production_batches')
      .select('batch_number, checklist')
      .eq('id', batchId)
      .single()

    if (!batch) continue

    // Check all checklist items
    const checklist = (batch.checklist as Array<{
      key: string
      label: string
      checked: boolean
      checked_by: string | null
      checked_at: string | null
    }>) || []

    const updatedChecklist = checklist.map((item) => ({
      ...item,
      checked: true,
      checked_by: adminId,
      checked_at: new Date().toISOString(),
    }))

    await supabase
      .from('production_batches')
      .update({
        checklist: JSON.parse(JSON.stringify(updatedChecklist)),
        status: 'checklist',
      })
      .eq('id', batchId)

    // Complete the batch via RPC
    const { data: completeResult, error: completeErr } = await supabase.rpc(
      'complete_batch',
      {
        p_batch_id: batchId,
        p_completed_by: adminId,
      }
    )

    if (completeErr) {
      logError(
        'BATCHES',
        `RPC complete_batch error for ${batch.batch_number}: ${completeErr.message}`
      )
      continue
    }

    const cResult = completeResult as { success?: boolean; error?: string }

    if (cResult?.error) {
      logError(
        'BATCHES',
        `Batch ${batch.batch_number} completion failed: ${cResult.error}`
      )
      continue
    }

    report.batchesCompleted++
    log('BATCHES', `✓ Completed batch ${batch.batch_number}`)
  }

  log(
    'BATCHES',
    `═══ Batches: ${report.batchesCreated} created, ${report.batchesCompleted} completed ═══`
  )

  // 5. Verify element statuses
  const { data: castElements } = await supabase
    .from('elements')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'cast')

  const castCount = castElements?.length || 0
  log('BATCHES', `Elements at 'cast' status: ${castCount}/${report.elementsCommitted}`)

  report.entries.push({
    phase: 'BATCHES',
    step: 'Create and complete batches',
    success: report.batchesCompleted > 0,
    details: `${report.batchesCreated} created, ${report.batchesCompleted} completed, ${castCount} elements cast`,
  })
}

// =====================================================
// PHASE 6: REPORT
// =====================================================

async function phase6Report(
  startTime: number,
  projectId: string
): Promise<void> {
  log('REPORT', '═══════════════════════════════════════')
  log('REPORT', 'Phase 6: Generating summary report')
  log('REPORT', '═══════════════════════════════════════')

  const duration = Date.now() - startTime

  // Fetch final element breakdown
  const { data: elements } = await supabase
    .from('elements')
    .select('element_type, building_id, status')
    .eq('project_id', projectId)

  const byType: Record<string, number> = {}
  const byStatus: Record<string, number> = {}

  for (const el of elements || []) {
    byType[el.element_type] = (byType[el.element_type] || 0) + 1
    byStatus[el.status || 'unknown'] = (byStatus[el.status || 'unknown'] || 0) + 1
  }

  console.log('\n')
  console.log('╔═══════════════════════════════════════════════════════════════╗')
  console.log('║              E2E WORKFLOW TEST — FINAL REPORT                ║')
  console.log('╠═══════════════════════════════════════════════════════════════╣')
  console.log(`║  Duration: ${(duration / 1000).toFixed(1)}s`)
  console.log(`║  Project: ${TEST_PROJECT.name}`)
  console.log('╠═══════════════════════════════════════════════════════════════╣')
  console.log('║  DRAWINGS')
  console.log(`║    Analyzed: ${report.drawingsAnalyzed} / ${TEST_DRAWINGS.length}`)
  console.log('║')
  console.log('║  ELEMENTS')
  console.log(`║    Extracted by AI: ${report.elementsExtracted}`)
  console.log(`║    Committed to DB: ${report.elementsCommitted}`)
  console.log('║    By type:')
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`║      ${type}: ${count}`)
  }
  console.log('║    By status:')
  for (const [status, count] of Object.entries(byStatus)) {
    console.log(`║      ${status}: ${count}`)
  }
  console.log('║')
  console.log('║  BATCHES')
  console.log(`║    Created: ${report.batchesCreated}`)
  console.log(`║    Completed: ${report.batchesCompleted}`)
  console.log('║')
  if (report.lowConfidenceItems.length > 0) {
    console.log(`║  LOW CONFIDENCE ITEMS (${report.lowConfidenceItems.length})`)
    for (const item of report.lowConfidenceItems.slice(0, 20)) {
      console.log(`║    ${item.name}: ${item.field}=${item.level}`)
    }
    if (report.lowConfidenceItems.length > 20) {
      console.log(`║    ... and ${report.lowConfidenceItems.length - 20} more`)
    }
    console.log('║')
  }
  if (report.warnings.length > 0) {
    console.log(`║  WARNINGS (${report.warnings.length})`)
    for (const w of report.warnings.slice(0, 15)) {
      console.log(`║    ⚠️ ${w}`)
    }
    if (report.warnings.length > 15) {
      console.log(`║    ... and ${report.warnings.length - 15} more`)
    }
    console.log('║')
  }
  if (report.errors.length > 0) {
    console.log(`║  ERRORS (${report.errors.length})`)
    for (const e of report.errors) {
      console.log(`║    ❌ ${e}`)
    }
    console.log('║')
  }
  console.log('╚═══════════════════════════════════════════════════════════════╝')

  // Save report to file
  const reportData = {
    ...report,
    projectId,
    projectName: TEST_PROJECT.name,
    durationMs: duration,
    timestamp: new Date().toISOString(),
    elementBreakdown: { byType, byStatus },
  }

  const reportPath = path.resolve(
    import.meta.dirname,
    `e2e-report-${Date.now()}.json`
  )
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
  log('REPORT', `Report saved to ${reportPath}`)
}

// =====================================================
// Helper Functions (replicated from actions.ts)
// =====================================================

function resolveBuildingId(
  building: string | null | undefined,
  buildingMap: Record<string, string>
): string | null {
  if (!building) return null

  const normalized = building.toLowerCase().trim()

  // Direct match
  if (buildingMap[normalized]) return buildingMap[normalized]

  // Try without "Hús " prefix
  const stripped = normalized.replace(/^hús\s+/i, '')
  if (buildingMap[stripped]) return buildingMap[stripped]

  // Try adding "Hús " prefix
  const withPrefix = `hús ${stripped}`
  if (buildingMap[withPrefix]) return buildingMap[withPrefix]

  return null
}

function parseFloorBreakdown(
  notes: string
): { floor: number; count: number }[] {
  const results: { floor: number; count: number }[] = []
  const regex = /(\d+)\s*[Hh]\s*[.:]\s*(\d+)\s*\.?\s*stk?/g
  let match

  while ((match = regex.exec(notes)) !== null) {
    const floor = parseInt(match[1], 10)
    const count = parseInt(match[2], 10)
    if (!isNaN(floor) && !isNaN(count) && count > 0) {
      results.push({ floor, count })
    }
  }

  return results
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  const startTime = Date.now()

  console.log('')
  console.log('╔═══════════════════════════════════════════════════════════════╗')
  console.log('║          SERSTEYPAN — E2E WORKFLOW TEST                      ║')
  console.log('║          Full lifecycle: Upload → Analyze → Commit → Batch   ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝')
  console.log('')

  try {
    // Phase 1: Setup
    const { adminId, projectId, buildings } = await phase1Setup()

    // Phase 2: Upload drawings
    const documents = await phase2Upload(projectId, adminId)

    if (documents.length === 0) {
      logError('MAIN', 'No documents uploaded — aborting')
      process.exit(1)
    }

    // Phase 3: AI Analysis
    const analyses = await phase3Analysis(
      projectId,
      adminId,
      documents,
      buildings
    )

    if (analyses.length === 0) {
      logError('MAIN', 'No analyses completed — aborting batch phase')
      await phase6Report(startTime, projectId)
      process.exit(1)
    }

    // Phase 4: Commit elements
    const committed = await phase4Commit(projectId, adminId, analyses, buildings)

    if (committed === 0) {
      logError('MAIN', 'No elements committed — aborting batch phase')
      await phase6Report(startTime, projectId)
      process.exit(1)
    }

    // Phase 5: Production batches
    await phase5Batches(projectId, adminId)

    // Phase 6: Report
    await phase6Report(startTime, projectId)

    // Exit code based on errors
    if (report.errors.length > 0) {
      process.exit(1)
    }
  } catch (err) {
    logError('MAIN', `Fatal error: ${err instanceof Error ? err.message : err}`)
    console.error(err)
    process.exit(1)
  }
}

main()
