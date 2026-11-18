const QRCode = require('qrcode');

async function generateQRCodeDataURL(text) {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff'
      },
      width: 320
    });
  } catch (err) {
    console.error('QR code generation error:', err);
    throw err;
  }
}

module.exports = { generateQRCodeDataURL };
