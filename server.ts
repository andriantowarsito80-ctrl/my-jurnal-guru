import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_VOICES = new Set(['Kore', 'Puck', 'Zephyr', 'Charon', 'Fenrir']);

// Simple in-memory cache to make repeated attendance phrases instant
const ttsCache = new Map<string, string>();
const MAX_CACHE_ITEMS = 120;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: 'v1beta',
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/tts', async (req, res) => {
    try {
      const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      const rawStyle =
        typeof req.body?.style === 'string' && req.body.style.trim()
          ? req.body.style.trim()
          : 'Warm, natural, friendly Indonesian school teacher voice, clear pronunciation';
      const requestedVoice =
        typeof req.body?.voiceName === 'string' && ALLOWED_VOICES.has(req.body.voiceName)
          ? req.body.voiceName
          : 'Kore';

      if (!rawText) {
        res.status(400).json({ error: 'Teks suara tidak boleh kosong.' });
        return;
      }

      const safeText = rawText.slice(0, 320);
      const cacheKey = `${requestedVoice}::${rawStyle}::${safeText}`;
      const cached = ttsCache.get(cacheKey);
      if (cached) {
        res.json({ audioBase64: cached, mimeType: 'audio/wav', cached: true });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY tidak tersedia',
          fallback: true,
        });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: safeText,
                speechMetadata: {
                  style: rawStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: requestedVoice },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({
          error: 'Audio tidak dihasilkan oleh layanan suara.',
          fallback: true,
        });
        return;
      }

      if (ttsCache.size >= MAX_CACHE_ITEMS) {
        const firstKey = ttsCache.keys().next().value;
        if (firstKey) ttsCache.delete(firstKey);
      }
      ttsCache.set(cacheKey, base64Audio);

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal menghasilkan suara.';
      res.status(500).json({ error: message, fallback: true });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
