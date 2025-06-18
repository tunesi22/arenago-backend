require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const cors = require('cors');
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const s3 = new S3Client({
  region: process.env.R2_REGION,
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Penting untuk R2 (bukan S3)
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

    // Upload ke R2 pakai v3
    await s3.send(new PutObjectCommand(params));
    const fileUrl = `${process.env.CDN_DOMAIN}/${filename}`;
    res.json({ fileUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('API ready on', PORT));
