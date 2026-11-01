import { Router, type IRouter } from "express";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { db, productsTable, insertProductSchema } from "@workspace/db";
import { desc } from "drizzle-orm";
import { uploadProductImage, downloadProductImage } from "../lib/storage";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    callback(null, allowed.includes(file.mimetype));
  },
});

router.get("/products", async (_req, res) => {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .orderBy(desc(productsTable.createdAt));

    res.json({ products });
  } catch {
    res.status(500).json({ error: "Failed to load products" });
  }
});

router.post("/products", async (req, res) => {
  const result = insertProductSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: "Invalid product data",
      details: result.error.flatten(),
    });
    return;
  }

  try {
    const [product] = await db
      .insert(productsTable)
      .values(result.data)
      .returning();

    res.status(201).json({ product });
  } catch {
    res.status(500).json({ error: "Failed to save product" });
  }
});

router.post("/products/upload-image", (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      res.status(400).json({
        error: error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
          ? "حجم الصورة يجب ألا يتجاوز 10 ميغابايت"
          : "تعذّر استقبال الصورة",
      });
      return;
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "لم يتم اختيار صورة" });
    return;
  }

  try {
    const imageBuffer = await sharp(req.file.buffer)
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    const filename = `${randomUUID()}.webp`;
    const objectName = `products/${filename}`;

    await uploadProductImage(objectName, imageBuffer);

    res.status(201).json({
      imageUrl: `/api/products/images/${filename}`,
    });
  } catch {
    res.status(400).json({
      error: "الصورة غير صالحة أو تعذّر معالجتها ورفعها",
    });
  }
});


router.post("/products/analyze-image", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "مفتاح Gemini غير متاح للمخدم" });
    return;
  }

  const imageUrl = req.body?.imageUrl;
  const match = typeof imageUrl === "string"
    ? imageUrl.match(/^\/api\/products\/images\/([0-9a-f-]{36}\.webp)$/i)
    : null;

  if (!match) {
    res.status(400).json({ error: "رابط صورة المنتج غير صالح" });
    return;
  }

  try {
    const stored = await downloadProductImage(`products/${match[1]}`);
    if (!stored.ok) {
      res.status(404).json({ error: "لم يتم العثور على صورة المنتج" });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          inlineData: {
            mimeType: "image/webp",
            data: stored.value[0].toString("base64"),
          },
        },
        {
          text: "حلّل صورة المنتج واكتب اقتراحاً تسويقياً باللغة العربية. أعد JSON فقط بالشكل التالي: {\"name\":\"اسم مقترح قصير للمنتج\",\"description\":\"وصف تسويقي واضح وجذاب مبني فقط على ما يظهر في الصورة، دون اختراع مواصفات أو أسعار أو ضمانات\"}.",
        },
      ],
    });

    const text = result.text?.trim();
    if (!text) {
      res.status(502).json({ error: "لم يُرجع Gemini اقتراحاً" });
      return;
    }

    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const suggestion = JSON.parse(cleaned);

    if (typeof suggestion.name !== "string" ||
        typeof suggestion.description !== "string") {
      throw new Error("Invalid Gemini response");
    }

    res.json({ suggestion });
  } catch {
    res.status(502).json({
      error: "تعذّر تحليل الصورة حالياً. حاول مرة أخرى.",
    });
  }
});

router.get("/products/images/:filename", async (req, res) => {
  if (!/^[0-9a-f-]{36}\.webp$/i.test(req.params.filename)) {
    res.status(400).json({ error: "Invalid image name" });
    return;
  }

  try {
    const result = await downloadProductImage(
      `products/${req.params.filename}`,
    );

    if (!result.ok) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(result.value[0]);
  } catch {
    res.status(404).json({ error: "Image not found" });
  }
});

export default router;
