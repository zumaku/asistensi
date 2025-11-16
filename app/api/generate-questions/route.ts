import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ✅ Type definitions
type QuizQuestion = {
  question: string;
  options: string[];
  correct_answer: number;
};

type QuizResponse = {
  questions: QuizQuestion[];
};

// ✅ Fungsi untuk membersihkan JSON response
function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks
  let cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .replace(/`/g, '')
    .trim();

  // Remove any text before first {
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace > 0) {
    cleaned = cleaned.substring(firstBrace);
  }

  // Remove any text after last }
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > 0 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }

  // Fix common JSON issues
  cleaned = cleaned
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\r\n/g, ' ') // Replace CRLF with space
    .replace(/\n/g, ' ') // Replace LF with space
    .replace(/\r/g, ' ') // Replace CR with space
    .replace(/\t/g, ' ') // Replace tabs with space
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/"/g, '"') // Replace smart quotes
    .replace(/"/g, '"') // Replace smart quotes
    .replace(/'/g, "'") // Replace smart quotes
    .replace(/'/g, "'"); // Replace smart quotes

  return cleaned;
}

// ✅ Fungsi untuk generate questions dengan retry - DENGAN TYPE
async function generateQuestionsWithRetry(code: string, maxRetries = 3): Promise<QuizResponse> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Attempt ${attempt}/${maxRetries} to generate questions...`);

    try {
      const prompt = `
Anda adalah asisten dosen untuk mata kuliah Web Programming. Berdasarkan kode HTML dengan internal CSS berikut yang dibuat oleh praktikan, buatlah 10 soal pilihan ganda untuk menguji PEMAHAMAN KONSEP mereka.

Kode HTML dengan Internal CSS praktikan:
\`\`\`html
${code}
\`\`\`

ATURAN PEMBUATAN SOAL:

1. FOKUS PADA PEMAHAMAN KONSEP, BUKAN HAFALAN KODE
   ✅ Contoh BAIK: "Apa fungsi dari property font-weight dalam CSS?"
   ❌ Contoh BURUK: "Berapa ukuran font pada h1 dalam kode?"

2. MATERI YANG DIUJIKAN:
   - Font style (font-family, font-size, font-weight, font-style)
   - Text style (text-align, text-decoration, text-transform, line-height)
   - Background (background-color, background-image)
   - Display (block dan inline)
   - Div dan Span
   - CSS Selectors (element, class, id)

3. KRITERIA SOAL:
   ✓ Soal dapat dijawab tanpa melihat kode
   ✓ 4 pilihan jawaban yang masuk akal
   ✓ Tingkat kesulitan sedang
   ✓ Variasi topik

PENTING - ATURAN JSON:
1. Output HANYA JSON, tanpa teks apapun sebelum atau sesudahnya
2. JANGAN gunakan tanda kutip ganda (") di dalam teks soal atau jawaban
3. JANGAN gunakan karakter escape (\\n, \\t, dll)
4. Gunakan kata-kata sederhana tanpa karakter khusus
5. JANGAN gunakan apostrof (') di dalam teks, ganti dengan kata lain

Contoh format yang BENAR:
{
  "questions": [
    {
      "question": "Apa fungsi dari property font-weight dalam CSS?",
      "options": [
        "Mengatur ketebalan teks",
        "Mengatur ukuran font",
        "Mengatur jenis font",
        "Mengatur warna font"
      ],
      "correct_answer": 0
    }
  ]
}

WAJIB:
- Buat TEPAT 10 soal
- correct_answer adalah index 0-3
- Output HANYA JSON valid, tidak ada teks lain
- JANGAN gunakan karakter kutip atau apostrof di dalam string
`;

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              'You are a quiz generator. Output ONLY valid JSON. Never use quotes or apostrophes inside question or option text. Never use escape characters. Output pure JSON only, no markdown, no explanations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 4000,
      });

      const responseText = completion.choices[0]?.message?.content || '';

      console.log('Raw response (first 500 chars):', responseText.substring(0, 500));

      // Clean the response
      const cleanedResponse = cleanJsonResponse(responseText);

      console.log('Cleaned response (first 500 chars):', cleanedResponse.substring(0, 500));

      // Try to parse
      let result: QuizResponse;
      try {
        result = JSON.parse(cleanedResponse) as QuizResponse;
      } catch (parseError) {
        console.error(`Parsing failed on attempt ${attempt}:`, parseError);

        // If not last attempt, continue to retry
        if (attempt < maxRetries) {
          console.log('Retrying...');
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        // Last attempt failed, throw error
        throw new Error(
          `Failed to parse JSON after ${maxRetries} attempts: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        );
      }

      // Validate structure
      if (!result.questions || !Array.isArray(result.questions)) {
        throw new Error('Invalid response structure: missing questions array');
      }

      if (result.questions.length !== 10) {
        console.warn(`Warning: Got ${result.questions.length} questions instead of 10`);

        // If too few questions and not last attempt, retry
        if (result.questions.length < 5 && attempt < maxRetries) {
          console.log('Too few questions, retrying...');
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        // If too many, truncate to 10
        if (result.questions.length > 10) {
          result.questions = result.questions.slice(0, 10);
        }
      }

      // Validate each question
      for (let i = 0; i < result.questions.length; i++) {
        const q = result.questions[i];
        if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error(`Question #${i + 1} is invalid: missing required fields`);
        }
        if (
          typeof q.correct_answer !== 'number' ||
          q.correct_answer < 0 ||
          q.correct_answer > 3
        ) {
          throw new Error(`Question #${i + 1} has invalid correct_answer`);
        }
      }

      console.log(`Successfully generated ${result.questions.length} questions`);
      return result;
    } catch (error) {
      console.error(`Error on attempt ${attempt}:`, error);

      // If last attempt, throw error
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error('Failed to generate questions after all retries');
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || code.trim().length === 0) {
      return NextResponse.json({ error: 'Kode HTML tidak boleh kosong' }, { status: 400 });
    }

    // Generate questions with retry logic
    const result = await generateQuestionsWithRetry(code, 3);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating questions:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Gagal membuat soal. Silakan coba lagi.',
        details: errorMessage,
        hint: 'Pastikan kode HTML Anda valid dan tidak terlalu kompleks',
      },
      { status: 500 }
    );
  }
}