import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT, buildUserPrompt } from '../src/lib/ai/drawing-prompt';
import { getDrawingAnalysisProvider } from '../src/lib/ai/providers';

// Load env vars
dotenv.config({ path: '.env.local' });

async function runTest() {
    const provider = getDrawingAnalysisProvider();

    if (!provider.isConfigured()) {
        console.error('Provider is not configured properly (missing API key in .env.local)');
        return;
    }

    console.log(`Testing with provider: ${provider.name}`);

    // We are going to test on a complex drawing: BS_01_ Forsteyptar svalir - 54.pdf
    const pdfPath = resolve('./Owners Feedback/Email 2/BS_01_ Forsteyptar svalir - 54.pdf');
    let pdfBuffer;
    try {
        pdfBuffer = readFileSync(pdfPath);
        console.log(`Loaded PDF: ${pdfPath} (${pdfBuffer.length} bytes)`);
    } catch (error) {
        console.error('Failed to load PDF:', error);
        return;
    }

    const pdfBase64 = pdfBuffer.toString('base64');

    const userPrompt = buildUserPrompt({
        projectName: 'Áshamar 54',
        documentName: 'BS_01_ Forsteyptar svalir - 54.pdf',
        buildingList: 'Hús A, Hús B',
    });

    console.log('Sending request to AI... This might take a minute.');

    try {
        const aiResult = await provider.analyzeDrawing({
            pdfBase64,
            systemPrompt: SYSTEM_PROMPT,
            userPrompt,
            maxTokens: 16000,
        });

        console.log('\n--- AI RESPONSE ---\n');
        console.log(aiResult.responseText);
        console.log('\n-------------------\n');
        console.log(`Model used: ${aiResult.model}`);
    } catch (err) {
        console.error('Failed to run AI analysis:', err);
    }
}

runTest();
