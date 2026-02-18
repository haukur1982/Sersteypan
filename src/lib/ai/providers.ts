/**
 * AI Drawing Analysis — Provider Abstraction
 *
 * Configurable AI provider for analyzing structural engineering drawings.
 * Supports Anthropic (Claude Opus 4.6) and Google Gemini (Gemini 3 Pro / Deep Think).
 *
 * Provider is selected via environment variables:
 *   AI_DRAWING_PROVIDER = 'anthropic' | 'google'  (default: 'anthropic')
 *   AI_DRAWING_MODEL = model name override (optional)
 *
 * Anthropic requires: ANTHROPIC_API_KEY
 * Google requires: GOOGLE_AI_API_KEY
 */

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface DrawingAnalysisParams {
  /** Base64-encoded PDF data */
  pdfBase64: string
  /** System prompt with extraction instructions */
  systemPrompt: string
  /** User prompt with project context */
  userPrompt: string
  /** Max tokens for the response (default varies by provider) */
  maxTokens?: number
}

export interface DrawingAnalysisResult {
  /** Raw text response from the AI */
  responseText: string
  /** Model name actually used */
  model: string
  /** Provider name */
  provider: string
}

export interface AIDrawingAnalysisProvider {
  name: string
  /** Check if the provider is configured (API key present) */
  isConfigured(): boolean
  /** Analyze a PDF drawing and return raw text */
  analyzeDrawing(params: DrawingAnalysisParams): Promise<DrawingAnalysisResult>
}

// ---------------------------------------------------------------------------
// Anthropic Provider (Claude Opus 4.6)
// ---------------------------------------------------------------------------

const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-4-20250514'

class AnthropicProvider implements AIDrawingAnalysisProvider {
  name = 'anthropic'

  isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY
  }

  async analyzeDrawing(
    params: DrawingAnalysisParams
  ): Promise<DrawingAnalysisResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set')
    }

    // Dynamic import to avoid loading SDK when not needed
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const anthropic = new Anthropic({ apiKey })

    const model = process.env.AI_DRAWING_MODEL || DEFAULT_ANTHROPIC_MODEL

    // Use streaming to avoid timeout on long PDF analysis (Anthropic SDK
    // requires streaming for operations that may exceed 10 minutes)
    const stream = anthropic.messages.stream({
      model,
      max_tokens: params.maxTokens || 16000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: params.pdfBase64,
              },
            },
            {
              type: 'text',
              text: params.userPrompt,
            },
          ],
        },
      ],
      system: params.systemPrompt,
    })

    const message = await stream.finalMessage()

    // Extract text from content blocks
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('\n')
      .trim()

    return {
      responseText,
      model,
      provider: this.name,
    }
  }
}

// ---------------------------------------------------------------------------
// Google Gemini Provider (Gemini 3 Pro / Deep Think)
// ---------------------------------------------------------------------------

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro'

class GeminiProvider implements AIDrawingAnalysisProvider {
  name = 'google'

  isConfigured(): boolean {
    return !!process.env.GOOGLE_AI_API_KEY
  }

  async analyzeDrawing(
    params: DrawingAnalysisParams
  ): Promise<DrawingAnalysisResult> {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is not set')
    }

    // Dynamic import to avoid loading SDK when not needed
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(apiKey)

    const model = process.env.AI_DRAWING_MODEL || DEFAULT_GEMINI_MODEL
    const generativeModel = genAI.getGenerativeModel({
      model,
      systemInstruction: params.systemPrompt,
    })

    const result = await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: params.pdfBase64,
              },
            },
            {
              text: params.userPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: params.maxTokens || 16000,
      },
    })

    const response = result.response
    const responseText = response.text()

    return {
      responseText,
      model,
      provider: this.name,
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const providers: Record<string, AIDrawingAnalysisProvider> = {
  anthropic: new AnthropicProvider(),
  google: new GeminiProvider(),
}

/**
 * Get the configured AI drawing analysis provider.
 *
 * Reads `AI_DRAWING_PROVIDER` env var. Defaults to 'anthropic'.
 * Throws if the selected provider is not configured (missing API key).
 */
export function getDrawingAnalysisProvider(): AIDrawingAnalysisProvider {
  const providerName = (
    process.env.AI_DRAWING_PROVIDER || 'anthropic'
  ).toLowerCase()

  const provider = providers[providerName]
  if (!provider) {
    throw new Error(
      `Unknown AI_DRAWING_PROVIDER: "${providerName}". ` +
        `Supported: ${Object.keys(providers).join(', ')}`
    )
  }

  return provider
}

/**
 * Check if ANY AI provider is configured (for feature-flagging the UI).
 */
export function isAIAnalysisAvailable(): boolean {
  return Object.values(providers).some((p) => p.isConfigured())
}
