import { DocumentHeader, DocumentFooter, FILL_BOLD } from '../../components/print';
import {
  OUT_OF_TOWN_APPLICANT_VARIANT,
  OUT_OF_TOWN_REPRESENTATIVE_VARIANT,
} from '../../utils/outOfTownVariant';

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
  if (d && m) return `${d} day of ${m}`;
  return d || m;
}

function CorroborationBlock({ data }) {
  const affiant1 = blank(data.corroborator1Signature || data.corroborator1Name);
  const affiant2 = blank(data.corroborator2Signature || data.corroborator2Name);
  const subjectName = blank(data.corroborationSubjectName || data.affiantName || data.applicantName);

  return (
    <>
      <h3 className="ausf-section-title mt-4 text-center">CORROBORATION</h3>
      <p className="mt-3 mb-3 leading-normal">
        We,{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.corroborator1Name)}</span> and{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.corroborator2Name)}</span>, both of
        legal age, Filipinos, and residents of{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.corroboratorResidence)}</span>,
        Philippines, after having been duly sworn to in accordance with law depose and say:
      </p>
      <p className="mb-3 leading-normal">
        That we personally declare that the above-statements of{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{subjectName}</span> are true and correct to
        the best of our knowledge and beliefs having known him/her.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-8">
        <div className="ausf-signature-block">
          <div className="ausf-signature-block__name uppercase">{affiant1}</div>
          <div className="ausf-signature-block__label">Affiant</div>
        </div>
        <div className="ausf-signature-block">
          <div className="ausf-signature-block__name uppercase">{affiant2}</div>
          <div className="ausf-signature-block__label">Affiant</div>
        </div>
      </div>
    </>
  );
}

function ApplicantBody({ data }) {
  return (
    <>
      <p className="mt-4 mb-3 leading-normal">
        I, <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.affiantName)}</span>, of legal
        age, married/single/widow/widower, Filipino, and a resident of{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.affiantResidence)}</span>,
        Philippines, after having been duly sworn to in accordance with law depose and say:
      </p>
      <p className="mb-3 leading-normal">That I am an applicant for the late registration of my birth;</p>
      <p className="mb-3 leading-normal">
        That I was born on <span className={`${FILL_BOLD} px-0.5 align-baseline`}>{blank(data.birthDate)}</span> at{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.birthPlace)}</span>;
      </p>
      <p className="mb-3 leading-normal">
        That my parents are{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.fatherName)}</span> and{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.motherName)}</span>;
      </p>
      <p className="mb-3 leading-normal">
        That the facts of my birth were not duly registered with the Local Civil Registry Office of{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.lcroOffice)}</span> within the
        period required by law due to inadvertence of my parents and not knowing the adverse consequence it may bring
        about;
      </p>
      <p className="mb-3 leading-normal">
        That I execute this affidavit to attest to the truth of the foregoing statements and for any lawful purpose which
        it may serve.
      </p>
    </>
  );
}

function RepresentativeBody({ data }) {
  return (
    <>
      <p className="mt-4 mb-3 leading-normal">
        I, <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.affiantName)}</span>, of legal
        age, married/single/widow/widower, Filipino, and a resident of{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.affiantResidence)}</span>,
        Philippines, after having been duly sworn to in accordance with law depose and say:
      </p>
      <p className="mb-3 leading-normal">
        That I am the{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.relationshipToApplicant)}</span> of{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.applicantName)}</span> who is an
        applicant for late registration of birth;
      </p>
      <p className="mb-3 leading-normal">
        That he/she was born on <span className={`${FILL_BOLD} px-0.5 align-baseline`}>{blank(data.birthDate)}</span> at{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.birthPlace)}</span>;
      </p>
      <p className="mb-3 leading-normal">
        That his/her parents are{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.fatherName)}</span> and{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.motherName)}</span>;
      </p>
      <p className="mb-3 leading-normal">
        That the facts of his/her birth were not duly registered with the Local Civil Registry Office of{' '}
        <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{blank(data.lcroOffice)}</span> within the
        period required by law due to inadvertence of my parents and not knowing the adverse consequence it may bring
        about;
      </p>
      <p className="mb-3 leading-normal">
        That I execute this affidavit to attest to the truth of the foregoing statements and for any lawful purpose which
        it may serve.
      </p>
    </>
  );
}

export default function OutOfTownPrintDocument({ data = {}, variant = OUT_OF_TOWN_APPLICANT_VARIANT }) {
  const isApplicant = variant === OUT_OF_TOWN_APPLICANT_VARIANT;
  const affiantSignature = blank(data.affiantSignature || data.affiantName);
  const corroborationSubjectName = isApplicant
    ? data.affiantName
    : data.applicantName || data.affiantName;

  return (
    <div className="ausf-doc witness-doc out-of-town-doc print-doc flex flex-col bg-white text-black">
      <DocumentHeader registryNo={data.registryNo} juratBlock={JURAT_BLOCK} />

      <div className="witness-doc-body print-doc-body ausf-doc-body flex flex-col text-[12pt] leading-relaxed">
        <h2 className="ausf-section-title text-center">AFFIDAVIT FOR DELAYED REGISTRATION OF BIRTH WITH CORROBORATION</h2>

        {isApplicant ? <ApplicantBody data={data} /> : <RepresentativeBody data={data} />}

        <p className="mb-2 leading-normal">
          <span className="font-bold">IN WITNESS WHEREOF,</span> I have hereunto set my hand this{' '}
          <span className={`${FILL_BOLD} px-0.5 align-baseline`}>{witnessDateLine(data.affixedDay, data.affixedMonth)}</span>{' '}
          at Iligan City, Philippines.
        </p>

        <div className="mt-4 flex justify-end">
          <div className="ausf-signature-block w-72">
            <div className="ausf-signature-block__name uppercase">{affiantSignature}</div>
            <div className="ausf-signature-block__label">Affiant</div>
          </div>
        </div>

        <CorroborationBlock data={{ ...data, corroborationSubjectName }} />

        <p className="ausf-subscribed-sworn mt-6 mb-0 leading-normal">
          <span className="font-bold">SUBSCRIBED AND SWORN</span> to before me this{' '}
          <span className={`${FILL_BOLD} px-0.5 align-baseline`}>{witnessDateLine(data.swornDay, data.swornMonth)}</span>{' '}
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

export { OUT_OF_TOWN_APPLICANT_VARIANT, OUT_OF_TOWN_REPRESENTATIVE_VARIANT };
