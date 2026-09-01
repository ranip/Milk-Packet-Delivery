import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let latestServerBackup: any = null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini AI client lazily
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables.');
    }
    return new GoogleGenAI({ apiKey });
  };

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Dual-Phone Backup Mirror Endpoint
  app.post('/api/backup/sync', (req, res) => {
    try {
      const payload = req.body;
      if (!payload || !payload.houses) {
        return res.status(400).json({ error: 'Invalid backup payload structure.' });
      }
      latestServerBackup = {
        ...payload,
        serverReceivedAt: new Date().toISOString(),
      };
      console.log(`[Backup Sync] Stored backup with ${payload.houses.length} houses from ${payload.exportedBy}`);
      res.json({ success: true, timestamp: latestServerBackup.serverReceivedAt });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to sync backup' });
    }
  });

  app.get('/api/backup/latest', (req, res) => {
    if (!latestServerBackup) {
      return res.status(444).json({ message: 'No server backup available yet.' });
    }
    res.json(latestServerBackup);
  });

  // AI Voice/Text Note Parsing for Milk Boy Delivery & Payment Logging
  app.post('/api/ai/parse-voice-note', async (req, res) => {
    try {
      const { text, houseList } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text note is required' });
      }

      const ai = getGeminiClient();
      
      const housesInfo = Array.isArray(houseList)
        ? houseList.map((h: any) => `House #${h.houseNumber} (${h.customerName}, Street: ${h.street})`).join('\n')
        : '';

      const prompt = `
You are an intelligent assistant for a milk boy delivery vendor ("Shree Krishna Dairy").
The user spoke or typed this quick delivery or payment update:
"${text}"

Available Houses in Vendor's List:
${housesInfo}

Analyze the note and convert it into a structured JSON object.
Return ONLY valid JSON with this schema:
{
  "actionType": "delivery" | "payment" | "vacation" | "unknown",
  "houseNumber": string or null, // e.g. "A-101" or match best house number
  "customerName": string or null,
  "items": [
    {
      "productName": "Full Cream Milk" | "Toned Milk" | "Cow Milk" | "Fresh Curd (Dahi)" | "Fresh Paneer" | "Butter" | "Desi Ghee" | string,
      "qty": number // quantity delivered or requested
    }
  ],
  "paymentAmount": number or null, // if payment recorded in rupees
  "paymentMode": "cash" | "upi" | "bank_transfer" | null,
  "notes": string or null,
  "confidence": number // 0 to 1
}

Ensure numeric values for qty and paymentAmount are clean numbers.
Return JSON ONLY, no markdown ticks.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const rawContent = response.text || '';
      const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJson);

      res.json({ success: true, result: parsedData });
    } catch (err: any) {
      console.error('Error in AI parse route:', err);
      res.status(500).json({ error: err.message || 'Failed to parse note via Gemini AI' });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MilkBoy Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
