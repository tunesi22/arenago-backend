require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const cors = require('cors');
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// ⚠️ DEBUG ENV dan versi Node, WAJIB buat troubleshooting Railway + R2
console.log("==== ENV CHECK (Startup) ====");
console.log("Node version:", process.version);
console.log("R2_ENDPOINT:", process.env.R2_ENDPOINT);
console.log("R2_BUCKET:", process.env.R2_BUCKET);
console.log("R2_REGION:", process.env.R2_REGION);
console.log("R2_ACCESS_KEY_ID:", process.env.R2_ACCESS_KEY_ID);
console.log("R2_SECRET_ACCESS_KEY length:", process.env.R2_SECRET_ACCESS_KEY ? process.env.R2_SECRET_ACCESS_KEY.length : 'undefined');
console.log("CDN_DOMAIN:", process.env.CDN_DOMAIN);
console.log("=============================");

// ⚠️ Fix SSL handshake error di Railway (safe untuk R2)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const s3 = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

app.use(cors());
app.use(express.json());

// Endpoint upload file ke R2
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const filename = `${Date.now()}_${file.originalname.replace(/\s+/g, '')}`;
    const params = {
      Bucket: process.env.R2_BUCKET,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3.send(new PutObjectCommand(params));
    const fileUrl = `${process.env.CDN_DOMAIN}/${filename}`;
    res.json({ fileUrl });
  } catch (err) {
    console.error('UPLOAD ERROR:', err);
    res.status(500).json({ error: 'Upload failed', detail: err.message || err.toString() });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('API ready on', PORT));
