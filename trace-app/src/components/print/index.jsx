import React from 'react';

export const FILL = 'fill-blank';
export const FILL_BOLD = 'fill-blank font-bold';

export function DocumentHeader({ registryNo, juratBlock }) {
  const raw = String(registryNo ?? '').trim();

  return (
    <header className="print-doc-header ausf-doc-header mb-0 shrink-0">
      <div className="flex items-center justify-between gap-3 pb-2">
        <img src="/image-removebg-preview.png" alt="" className="ausf-doc-header__logo" />
        <div className="min-w-0 flex-1 text-center leading-tight">
          <p className="m-0 text-[12pt]">Republic of the Philippines</p>
          <p className="m-0 text-[13pt] font-bold">CITY CIVIL REGISTRAR&apos;S OFFICE</p>
          <p className="m-0 text-[12pt] font-bold">City of Iligan</p>
          <p className="m-0 text-[10pt] leading-snug">
            Ground Flr., Pedro Generalao Bldg., Buhanginan Hill, Pala-o, Iligan City
          </p>
        </div>
        <img src="/ccro-logo.png" alt="" className="ausf-doc-header__logo" />
      </div>
      <div className="ausf-doc-header__rule border-b border-black" />
      <div className="ausf-doc-header__meta flex flex-wrap items-start justify-between gap-x-4 gap-y-1 pt-2 pb-1 text-[12pt] leading-snug">
        <div className="min-w-0">{juratBlock}</div>
        <div className="shrink-0 text-right">
          <p className="m-0 whitespace-nowrap">
            Registry Number:{' '}
            <span className={`${FILL_BOLD} align-baseline`}>{raw || '\u00a0'}</span>
          </p>
        </div>
      </div>
    </header>
  );
}

export function DocumentFooter() {

  return (
    <footer className="print-doc-footer mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-black pt-2 text-[10pt] leading-snug">
      <div>
        <p className="m-0 font-bold">CONTACT DETAILS:</p>
        <p className="m-0">Telephone No.: (063) 228-1311</p>
        <p className="m-0">Email: civilregistrar.iligan@gmail.com</p>
      </div>
      <div className="text-right italic text-blue-700">
        <p className="m-0">Births, Marriages and Deaths matter,</p>
        <p className="m-0">Register them all!</p>
      </div>
    </footer>
  );
}
