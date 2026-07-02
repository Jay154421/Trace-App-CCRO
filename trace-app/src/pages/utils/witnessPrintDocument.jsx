import { DocumentHeader, DocumentFooter, FILL_BOLD } from '../../components/print';

const CITY_CIVIL_REGISTRAR_NAME = 'ATTY. YUSSIF DON JUSTIN F. MARTIL, REB';
const CITY_CIVIL_REGISTRAR_TITLE = 'City Civil Registrar';

const JURAT_BLOCK = (
  <div className="m-0 leading-none">
    Republic of the Philippines)
    <br />
    City of Iligan) S.S
    <br />
    x----------------------------------/
  </div>
);

function blank(value) {
  const s = String(value ?? '').trim();
  return s || '\u00a0';
}

function witnessDateLine(day, month) {
  const d = String(day ?? '').trim();
  const m = String(month ?? '').trim();
  if (!d && !m) return '\u00a0';
  if (d && m) return <><span className={`${FILL_BOLD} px-0.5 align-baseline`}>{d}</span> day of <span className={`${FILL_BOLD} px-0.5 align-baseline`}>{m}</span></>;
  if (d) return <span className={`${FILL_BOLD} px-0.5 align-baseline`}>{d}</span>;
  return <span className={`${FILL_BOLD} px-0.5 align-baseline`}>{m}</span>;
}

export default function WitnessPrintDocument({ data = {} }) {
  const affiant1 = blank(data.witness1Signature || data.witness1Name);
  const affiant2 = blank(data.witness2Signature || data.witness2Name);

  return (
    <div className="ausf-doc witness-doc print-doc flex flex-col bg-white text-black">
      <DocumentHeader registryNo={data.registryNo} juratBlock={JURAT_BLOCK} />

      <div className="witness-doc-body print-doc-body ausf-doc-body flex flex-col text-[12pt] leading-relaxed">
        <h2 className="ausf-section-title text-center">AFFIDAVIT TWO DISINTERESTED WITNESSES</h2>
        <p className="witness-affidavit-subtitle m-0 text-[10pt] italic">(For Late registration of Birth)</p>

        <p className="mt-4 mb-3 leading-normal">
          We, <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.witness1Name)}</span> and{' '}
          <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.witness2Name)}</span>, both of
          legal age, Filipinos, and residents of{' '}
          <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.residence)}</span>, Philippines,
          after having been duly sworn to in accordance with law depose and say:
        </p>

        <p className="mb-3 leading-normal">
        1.  That we personally know{' '}
          <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.childName)}</span> born on{' '}
          <span className={`${FILL_BOLD} px-0.5 align-baseline`}>{blank(data.childDob)}</span> at{' '}
          <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.childPob)}</span> to parents{' '}
          <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.fatherName)}</span> and{' '}
          <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.motherName)}</span>.
        </p>

        <p className="mb-3 leading-normal">
        2. That the fact of birth of{' '}
          <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.lateRegistrationName)}</span> was
          not promptly recorded at the Civil Registrar&apos;s Office of{' '}
          <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.civilRegistrarOffice)}</span>, as
          a result, no records appeared in the Philippine Statistics Authority (PSA);
        </p>

        <p className="mb-3 leading-normal">
        3. That we have knowledge of the foregoing facts because we are close friends of their family;
        </p>

        <p className="mb-3 leading-normal">
        4. That we are executing this affidavit to attest to the veracity and truthfulness of the foregoing statements and
          for the purpose of late registration of birth of{' '}
          <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.lateRegistrationName)}</span>.
        </p>

        <p className="mb-2 leading-normal">
          <span className="font-bold">IN WITNESS WHEREOF,</span> we have hereunto set our hands this{' '}
          {witnessDateLine(data.affixedDay, data.affixedMonth)}{' '}
          at Iligan City, Philippines.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-8">
          <div className="ausf-signature-block">
            <div className="ausf-signature-block__name uppercase">{affiant1}</div>
            <div className="ausf-signature-block__label">Affiant</div>
          </div>
          <div className="ausf-signature-block">
            <div className="ausf-signature-block__name uppercase">{affiant2}</div>
            <div className="ausf-signature-block__label">Affiant</div>
          </div>
        </div>

        <p className="ausf-subscribed-sworn mt-8 mb-0 leading-normal">
          <span className="font-bold">SUBSCRIBED AND SWORN</span> to before me this{' '}
          {witnessDateLine(data.swornDay, data.swornMonth)}{' '}
          in the ILIGAN CITY, Philippines.
        </p>
        <div className="registrar-signature-zone flex w-full flex-col items-end justify-end">
          <div className="ccr-signatory-block city-registrar-signature inline-flex flex-col items-center leading-snug">
            <p className="ccr-signatory-block__name m-0 p-0 font-bold">
              {String(data.cityCivilRegistrarName || '').trim() || CITY_CIVIL_REGISTRAR_NAME}
            </p>
            <p className="ccr-signatory-block__title m-0 p-0 text-sm">{CITY_CIVIL_REGISTRAR_TITLE}</p>
          </div>
        </div>
      </div>

      <div className="ausf-doc-footer print-doc-footer-wrap shrink-0">
        <DocumentFooter />
      </div>
    </div>
  );
}
