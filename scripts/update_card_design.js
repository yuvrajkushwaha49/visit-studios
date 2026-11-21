const fs = require('fs');
const path = require('path');

const newFunction = `  // Generates high-res personalized invitation pass card image matching Reference Design 1 (Background) & Reference Design 2 (Content)
  generateInvitationCard(data) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 819;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      const agencyName = (data.agency_name || 'NCR').toUpperCase();
      const customerName = data.customer_name || 'Valued Client';
      const projectName = data.project_name || 'MONARCH';
      const developerName = (data.developer_name || 'M3M INDIA').toUpperCase();
      const shortUrl = data.shortUrl || \`\${window.location.origin}/i/\${data.short_code || ''}\`;
      const advisorName = data.advisor_name || 'Karan Verma';
      const advisorPhone = data.advisor_phone || '+91 98111 22334';

      // Parse Date components
      const d = data.visit_date ? new Date(data.visit_date + 'T00:00:00') : new Date();
      const weekday = !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { weekday: 'long' }) : 'Wednesday';
      const formattedDate = Utils.formatDate(data.visit_date) || '18 Nov 2026';
      const formattedTime = Utils.formatTime(data.visit_time) || '11:30 AM';

      // Location formatting
      let rawLoc = data.location || data.project_location || 'Noida';
      let locationText = rawLoc;
      if (rawLoc.includes(',')) {
        const parts = rawLoc.split(',');
        locationText = parts[parts.length - 1].trim();
      }
      if (!locationText || locationText.length < 2) locationText = 'Noida';

      // Helper function to draw letter-spaced text with perfect centered alignment
      function drawLetterSpaced(text, centerX, y, letterSpacing) {
        ctx.textAlign = 'left';
        let totalW = 0;
        for (let i = 0; i < text.length; i++) {
          totalW += ctx.measureText(text[i]).width;
          if (i < text.length - 1) totalW += letterSpacing;
        }
        let curX = centerX - totalW / 2;
        for (let i = 0; i < text.length; i++) {
          ctx.fillText(text[i], curX, y);
          curX += ctx.measureText(text[i]).width + letterSpacing;
        }
      }

      // Drawing Routine matching Reference Image 2 exactly
      const drawCardContent = (projLogoImg = null, devLogoImg = null, qrImg = null) => {
        // 1. Top Brand / Developer Logo or Name ("NCR" in reference)
        const topLogo = devLogoImg || projLogoImg;

        if (topLogo) {
          try {
            const maxW = 140;
            const maxH = 65;
            let w = topLogo.naturalWidth || topLogo.width || maxW;
            let h = topLogo.naturalHeight || topLogo.height || maxH;
            const ratio = Math.min(maxW / w, maxH / h);
            const renderW = Math.max(30, w * ratio);
            const renderH = Math.max(25, h * ratio);
            const drawX = 410 - renderW / 2;
            const drawY = 135 - renderH / 2;

            ctx.save();
            ctx.drawImage(topLogo, drawX, drawY, renderW, renderH);
            ctx.restore();
          } catch (e) {
            drawBrandText();
          }
        } else {
          drawBrandText();
        }

        function drawBrandText() {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = '#dfba73';
          ctx.font = 'bold 36px "Cinzel", "Playfair Display", Georgia, serif';
          ctx.shadowColor = 'rgba(223, 186, 115, 0.45)';
          ctx.shadowBlur = 10;
          const displayBrand = (developerName || agencyName || 'NCR').slice(0, 16);
          ctx.fillText(displayBrand, 410, 142);
          ctx.restore();
        }

        // 2. Main Project Title ("MONARCH" in reference)
        ctx.save();
        ctx.textAlign = 'center';
        let projFontSize = 46;
        if (projectName.length > 24) projFontSize = 32;
        else if (projectName.length > 16) projFontSize = 38;

        ctx.font = \`700 \${projFontSize}px "Cinzel", "Playfair Display", Georgia, serif\`;
        const goldGrad = ctx.createLinearGradient(230, 210, 590, 255);
        goldGrad.addColorStop(0, '#e2c079');
        goldGrad.addColorStop(0.5, '#faebd0');
        goldGrad.addColorStop(1, '#dfba73');
        ctx.fillStyle = goldGrad;
        ctx.shadowColor = 'rgba(223, 186, 115, 0.5)';
        ctx.shadowBlur = 14;
        ctx.fillText(projectName.toUpperCase(), 410, 245);
        ctx.restore();

        // 3. Subtitle ("AN EXCLUSIVE INVITATION" in reference)
        ctx.save();
        ctx.fillStyle = '#bfa36f';
        ctx.font = '600 12.5px "Cinzel", "Inter", sans-serif';
        drawLetterSpaced('AN EXCLUSIVE INVITATION', 410, 282, 3.5);
        ctx.restore();

        // 4. Personalized Guest Greeting & Viewing Invitation
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#faebd0';
        ctx.font = '500 21px "Playfair Display", Georgia, serif';
        ctx.fillText(\`Dear \${customerName},\`, 410, 395);

        ctx.fillStyle = '#dfcaa0';
        ctx.font = '400 18px "Playfair Display", Georgia, serif';
        ctx.fillText('You are cordially invited to a private viewing of', 410, 432);

        ctx.fillStyle = '#faebd0';
        ctx.font = '600 22px "Playfair Display", Georgia, serif';
        const projectHighlight = developerName ? \`\${developerName} \${projectName}\` : projectName;
        ctx.fillText(projectHighlight, 410, 468);
        ctx.restore();

        // 5. Date, Time & City Block
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#faebd0';
        ctx.font = '500 21px "Playfair Display", Georgia, serif';
        ctx.fillText(\`\${weekday}, \${formattedDate}\`, 410, 565);

        ctx.font = '500 20px "Playfair Display", Georgia, serif';
        ctx.fillText(\`\${formattedTime} IST\`, 410, 602);

        ctx.font = '500 20px "Playfair Display", Georgia, serif';
        ctx.fillText(locationText, 410, 638);
        ctx.restore();

        // 6. Property Advisor Block
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#b8a176';
        ctx.font = '400 14px "Playfair Display", Georgia, serif';
        ctx.fillText('Your Property Adviser', 410, 735);

        ctx.fillStyle = '#faebd0';
        ctx.font = '600 24px "Playfair Display", Georgia, serif';
        ctx.fillText(advisorName, 410, 770);

        ctx.fillStyle = '#e5ce9f';
        ctx.font = '500 18px "Playfair Display", Georgia, serif';
        ctx.fillText(advisorPhone, 410, 804);
        ctx.restore();

        // 7. Footer ("BY M3M INDIA" in reference)
        ctx.save();
        ctx.fillStyle = '#9e875e';
        ctx.font = '600 12px "Cinzel", "Inter", sans-serif';
        const footerText = \`BY \${developerName || agencyName || 'M3M INDIA'}\`.toUpperCase();
        drawLetterSpaced(footerText, 410, 905, 3.0);
        ctx.restore();

        // Return final output
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        canvas.toBlob((blob) => {
          const file = new File([blob], \`invitation-\${customerName.replace(/\\s+/g, '_')}.png\`, { type: 'image/png' });
          resolve({ dataUrl, blob, file, canvas });
        }, 'image/png');
      };

      // Helper function to safely load image with crossOrigin
      const loadImg = (src) => {
        if (!src) return Promise.resolve(null);
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      };

      // Determine QR Code source: use data URL if available, otherwise fetch from /api/qr
      let qrSource = data.qr_code_data;
      if (!qrSource || !qrSource.startsWith('data:image')) {
        const qrPayload = qrSource || data.shortUrl || \`\${window.location.origin}/i/\${data.short_code || ''}\`;
        qrSource = \`/api/qr?text=\${encodeURIComponent(qrPayload)}\`;
      }

      // Load background template image (Reference Image 1: Luxury Dark Royal Blue with Gold Accents)
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.onload = async () => {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        try {
          const [pLogo, dLogo, qr] = await Promise.all([
            loadImg(data.project_logo),
            loadImg(data.developer_logo),
            loadImg(qrSource)
          ]);
          drawCardContent(pLogo, dLogo, qr);
        } catch (err) {
          drawCardContent(null, null, null);
        }
      };

      bgImg.onerror = async () => {
        // High-end CSS fallback rendering the exact luxury royal blue and gold frame if image fails
        ctx.fillStyle = '#081224';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Elegant gold rectangular frame
        ctx.strokeStyle = '#c5a059';
        ctx.lineWidth = 2;
        ctx.strokeRect(55, 55, canvas.width - 110, canvas.height - 110);

        // Subtle inner golden border
        ctx.strokeStyle = 'rgba(197, 160, 89, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(62, 62, canvas.width - 124, canvas.height - 124);

        try {
          const [pLogo, dLogo, qr] = await Promise.all([
            loadImg(data.project_logo),
            loadImg(data.developer_logo),
            loadImg(qrSource)
          ]);
          drawCardContent(pLogo, dLogo, qr);
        } catch (err) {
          drawCardContent(null, null, null);
        }
      };

      bgImg.src = '/images/luxury-card-bg.jpg';
    });
  },

`;

const filePath = path.join(__dirname, '..', 'public', 'js', 'utils.js');
const content = fs.readFileSync(filePath, 'utf8');
const startMarker = '  // Generates high-res personalized invitation pass card image matching Reference Design';
const endMarker = '  downloadDataUrl(dataUrl, filename = \'invitation-pass.png\') {';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const updated = content.slice(0, startIdx) + newFunction + content.slice(endIdx);
fs.writeFileSync(filePath, updated, 'utf8');
console.log('Successfully updated generateInvitationCard in utils.js!');
