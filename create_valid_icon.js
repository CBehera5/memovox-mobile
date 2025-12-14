const { PNG } = require('pngjs');
const fs = require('fs');

// Create a 192x192 PNG image
const width = 192;
const height = 192;
const png = new PNG({ width, height });

// Fill with app color (667EEA - purple/blue)
for (let i = 0; i < png.data.length; i += 4) {
  png.data[i] = 102;      // R
  png.data[i + 1] = 126;  // G
  png.data[i + 2] = 234;  // B
  png.data[i + 3] = 255;  // A
}

png.pack().pipe(fs.createWriteStream('/Users/chinmaybehera/memovox-rel1/memovox-mobile/assets/adaptive-icon.png'))
  .on('finish', () => {
    console.log('Created valid adaptive-icon.png');
  });
