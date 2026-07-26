const fs = require('fs');

const files = [
  'trace-app/src/pages/utils/MuslimAttachment.jsx',
  'trace-app/src/pages/utils/muslimAttachmentPrintDocument.jsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const marker = "<table className=\"form\" style={{ tableLayout: 'fixed' }}>";
  const replacement = `<table className="form" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '50%' }} />
          <col style={{ width: '50%' }} />
        </colgroup>`;
  
  if (content.includes(marker)) {
    content = content.replace(marker, replacement);
    fs.writeFileSync(file, content);
    console.log('Updated:', file);
  } else {
    console.log('Marker not found in:', file);
  }
}
