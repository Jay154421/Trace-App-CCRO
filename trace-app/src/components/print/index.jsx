import React from 'react';

export const FILL = 'fill-blank';
export const FILL_BOLD = 'fill-blank font-bold';

function RegistryDigits({ registryNo }) {
  const raw = String(registryNo ?? '').trim();
  const chars = raw ? raw.split('') : [];
  const boxes = chars.length > 0 ? chars : [' '];

  return (
    <div className="mt-1 flex flex-wrap justify-end gap-0.5" aria-label={`Registry number ${raw || 'blank'}`}>
      {boxes.map((ch, idx) => (
        <span
          key={`${ch}-${idx}`}
          className="inline-flex h-7 w-6 items-center justify-center border border-black text-sm font-semibold"
        >
          {ch}
        </span>
      ))}
    </div>
  );
}

export function DocumentHeader({ registryNo, headerTextSize = '18px', juratBlock }) {
  return (
    <header className="mb-3 border-b border-black pb-2">
      <div className="flex items-start justify-between gap-3">
        <img src="/image-removebg-preview.png" alt="" className="h-14 w-14 shrink-0 object-contain" />
        <div className="min-w-0 flex-1 text-center" style={{ fontSize: headerTextSize }}>
          <p className="m-0 text-sm font-semibold">Republic of the Philippines</p>
          <p className="m-0 text-base font-bold leading-tight">CITY CIVIL REGISTRAR&apos;S OFFICE</p>
          <p className="m-0 text-sm font-semibold">City of Iligan</p>
          <p className="m-0 text-[10px] leading-snug">
            Ground Flr., Pedro Generalao Bldg., Buhanginan Hill, Pala-o, Iligan City
          </p>
        </div>
        <img src="/ccro-logo.png" alt="" className="h-14 w-14 shrink-0 object-contain" />
      </div>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="text-sm leading-snug">{juratBlock}</div>
        <div className="text-right text-xs">
          <p className="m-0 font-semibold uppercase">Registry No.</p>
          <RegistryDigits registryNo={registryNo} />
        </div>
      </div>
    </header>
  );
}

export function DocumentFooter({ contactPhone, contactEmail }) {
  const phone = String(contactPhone || '(063) 228-1311').trim();
  const email = String(contactEmail || 'civilregistrar.iligan@gmail.com').trim();

  return (
    <footer className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-black pt-2 text-[10px] leading-snug">
      <div>
        <p className="m-0 font-semibold text-blue-700">CONTACT DETAILS:</p>
        <p className="m-0">Telephone No.: {phone}</p>
        <p className="m-0">Email: {email}</p>
      </div>
      <div className="text-right italic text-blue-700">
        <p className="m-0">Be counted,</p>
        <p className="m-0">Get REGISTERED!</p>
      </div>
    </footer>
  );
}
