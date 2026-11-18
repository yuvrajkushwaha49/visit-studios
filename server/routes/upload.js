const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// POST /api/upload/logo - Uploads a logo and saves to public/uploads/logos/
router.post('/logo', (req, res) => {
  try {
    const { image_base64 } = req.body;
    if (!image_base64) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const matches = image_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    let ext = 'png';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('svg')) ext = 'svg';
      else if (mime.includes('webp')) ext = 'webp';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(image_base64, 'base64');
    }

    const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileId = 'logo-' + crypto.randomUUID().slice(0, 8) + '.' + ext;
    const filePath = path.join(uploadDir, fileId);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/logos/${fileId}`;
    return res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('Logo upload error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
