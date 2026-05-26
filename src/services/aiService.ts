import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
  if (!aiInstance) {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                   (typeof process !== 'undefined' ? process?.env?.GEMINI_API_KEY : '') || 
                   '';
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export interface NarrativeInput {
  maksud: string;
  tujuan: string;
  catatanSingkat: string;
}

export interface NarrativeOutput {
  laporan1: string;
  laporan2: string;
  laporan3: string;
}

export const generateNarrative = async (input: NarrativeInput): Promise<NarrativeOutput> => {
  try {
    const prompt = `Sebagai seorang staf kantor yang profesional di Indonesia, buatkan narasi Laporan Perjalanan Dinas yang runtut, formal, namun sangat padat dan singkat berdasarkan data berikut:
    - Maksud Perjalanan: ${input.maksud}
    - Tempat Tujuan: ${input.tujuan}
    - Narasi Singkat/Catatan: ${input.catatanSingkat}

    Ketentuan Penting:
    - Masing-masing narasi (laporan1, laporan2, laporan3) HARUS sangat singkat, maksimal 3 baris teks atau 2-3 kalimat saja.
    - Hindari narasi yang bertele-tele.

    Output harus dalam format JSON dengan key:
    - laporan1: Narasi pembuka (persiapan, kedatangan, koordinasi awal).
    - laporan2: Isi laporan utama (pelaksanaan kegiatan, inti pembahasan/kegiatan di lokasi).
    - laporan3: Penutup (kesimpulan, saran, atau hasil akhir kunjungan).

    Gunakan bahasa Indonesia yang formal, sopan, dan sesuai standar kedinasan (EYD).`;

    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            laporan1: { type: Type.STRING },
            laporan2: { type: Type.STRING },
            laporan3: { type: Type.STRING },
          },
          required: ["laporan1", "laporan2", "laporan3"],
        },
      },
    });

    const text = response.text || "{}";
    return JSON.parse(text) as NarrativeOutput;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Gagal membuat narasi dengan AI. Silakan coba lagi.");
  }
};
