/**
 * E2E Workflow Test — Configuration
 *
 * Defines the full test scenario for the Áshamar 52 project.
 * 8 real structural engineering drawings from VEKTOR.
 */

import path from 'node:path'

// =====================================================
// Project Config
// =====================================================

export const TEST_PROJECT = {
  name: 'Áshamar 52 - Hafnarfjörður (E2E Test)',
  address: 'Áshamar 52, 220 Hafnarfjörður',
  description:
    'Automated E2E workflow test — real drawings from VEKTOR engineering.',
}

// The admin test account (from seed)
export const ADMIN_EMAIL = 'owner.admin@sersteypan.test'

// =====================================================
// Buildings
// =====================================================

export const TEST_BUILDINGS = [
  { name: 'Hús A', floors: 4 },
  { name: 'Hús B', floors: 4 },
  { name: 'Hús C', floors: 4 },
]

// =====================================================
// Drawings
// =====================================================

const DRAWINGS_ROOT = path.resolve(
  import.meta.dirname,
  '../Owners Feedback'
)

export interface DrawingConfig {
  /** File path on disk */
  filePath: string
  /** File name for Supabase Storage */
  fileName: string
  /** Expected drawing type */
  expectedType: string
  /** Expected building (if known) */
  expectedBuilding?: string
  /** Approximate expected element count (for validation) */
  expectedMinElements: number
  expectedMaxElements: number
}

export const TEST_DRAWINGS: DrawingConfig[] = [
  {
    filePath: path.join(
      DRAWINGS_ROOT,
      'Email 1',
      'BF-1_ Filegranplötur yfir 1. hæð - Hús A.pdf'
    ),
    fileName: 'BF-1_ Filegranplötur yfir 1. hæð - Hús A.pdf',
    expectedType: 'filigran',
    expectedBuilding: 'A',
    expectedMinElements: 20,
    expectedMaxElements: 60,
  },
  {
    filePath: path.join(
      DRAWINGS_ROOT,
      'Email 1',
      'BF-2_ Filegranplötur yfir 1. hæð - Hús A.pdf'
    ),
    fileName: 'BF-2_ Filegranplötur yfir 1. hæð - Hús A.pdf',
    expectedType: 'filigran',
    expectedBuilding: 'A',
    expectedMinElements: 4,
    expectedMaxElements: 20,
  },
  {
    filePath: path.join(
      DRAWINGS_ROOT,
      'Email 1',
      'BF-3_ Filegranplötur yfir 1. hæð - Hús B.pdf'
    ),
    fileName: 'BF-3_ Filegranplötur yfir 1. hæð - Hús B.pdf',
    expectedType: 'filigran',
    expectedBuilding: 'B',
    expectedMinElements: 10,
    expectedMaxElements: 40,
  },
  {
    filePath: path.join(
      DRAWINGS_ROOT,
      'Email 1',
      'BF-4_ Filegranplötur yfir 1. hæð - Hús C.pdf'
    ),
    fileName: 'BF-4_ Filegranplötur yfir 1. hæð - Hús C.pdf',
    expectedType: 'filigran',
    expectedBuilding: 'C',
    expectedMinElements: 10,
    expectedMaxElements: 40,
  },
  {
    filePath: path.join(
      DRAWINGS_ROOT,
      'Email 2',
      'BS_01_ Forsteyptar svalir - 54.pdf'
    ),
    fileName: 'BS_01_ Forsteyptar svalir - 54.pdf',
    expectedType: 'balcony',
    expectedMinElements: 1,
    expectedMaxElements: 10,
  },
  {
    filePath: path.join(
      DRAWINGS_ROOT,
      'Email 2',
      'Svalagangar 54.pdf'
    ),
    fileName: 'Svalagangar 54.pdf',
    expectedType: 'corridor',
    expectedMinElements: 10,
    expectedMaxElements: 30,
  },
  {
    filePath: path.join(
      DRAWINGS_ROOT,
      'Email 2',
      'A.1.9_ Svalagangar v og a  Rev.0.pdf'
    ),
    fileName: 'A.1.9_ Svalagangar v og a  Rev.0.pdf',
    expectedType: 'architectural',
    expectedMinElements: 0,
    expectedMaxElements: 0,
  },
  {
    filePath: path.join(
      DRAWINGS_ROOT,
      'Email 3',
      'BS-2_ Forsteyptir stigar Rev.0 markup (2).pdf'
    ),
    fileName: 'BS-2_ Forsteyptir stigar Rev.0 markup (2).pdf',
    expectedType: 'staircase',
    expectedMinElements: 2,
    expectedMaxElements: 10,
  },
]

// =====================================================
// Batch Config
// =====================================================

export const BATCH_DEFAULTS = {
  concreteSupplier: 'BM Vallá',
  concreteGrade: 'C30/37',
}

// =====================================================
// Checklist items (from migration 028)
// =====================================================

export const CHECKLIST_KEYS = [
  'rebar_verified',
  'electrical_placed',
  'formwork_verified',
  'dimensions_verified',
  'photos_uploaded',
]

// =====================================================
// AI Cache Config
// =====================================================

export const CACHE_DIR = path.resolve(import.meta.dirname, '.e2e-cache')
export const SKIP_AI = process.env.SKIP_AI_ANALYSIS === 'true'

// =====================================================
// Concurrency
// =====================================================

/** Max concurrent AI analysis calls (to avoid rate limits) */
export const MAX_CONCURRENT_ANALYSES = 2
