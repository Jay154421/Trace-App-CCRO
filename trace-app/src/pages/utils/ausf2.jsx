import React from 'react'
import { formatDateLong, fullName, joinCommaParts } from '../../lib/printUtils';
import { DocumentHeader, DocumentFooter, FILL } from '../../components/print';

/** Long bond only — not laid out for A4 or short (8.5" × 11"). */
export const AUSF_0717_PRINT_TYPE = 'ausf-07-17'
export const AUSF_0717_EXCLUDED_PAPER_SIZE_IDS = new Set(['a4', 'short'])

export default function Ausf0717({ data }) {
  const affiantName = data.applicantName || fullName(data.fatherFirst, data.fatherMiddle, data.fatherLast)
  const surnameSought = data.fatherLast
  const relationship = String(data.relationshipToChild || '').trim().toUpperCase()
  const shouldAppendSurname = relationship === 'MYSELF' || relationship === 'SON'
  const affiantWithSurname = (shouldAppendSurname && affiantName && surnameSought)
    ? (affiantName.trim().toUpperCase().endsWith((surnameSought || '').trim().toUpperCase())
      ? affiantName
      : `${affiantName.trim()} ${surnameSought.trim()}`.trim())
    : affiantName
  const dobFormatted = formatDateLong(data.dateOfBirth)
  const colbReg = String(data.colbRegistryNo ?? '').trim() || ' '
  const colbDate = formatDateLong(data.colbDateOfRegistration) || ' '
  const publicReg = data.publicDocRegistryNo
  const publicDate = formatDateLong(data.publicDocDate)
  const publicOffice = data.publicDocOffice
  const filingAt = data.filingLocation || 'ILIGAN CITY'
  const witnessDate = formatDateLong(data.affidavitExecutionDate) || colbDate
  const placeStreet = (data.placeOfBirthAddress || '').trim()
  const placeCityProvince = joinCommaParts(data.placeOfBirthCity, data.placeOfBirthProvince)
  const attestationName = fullName(data.childFirst, data.childMiddle, data.childLast) || data.applicantName
  const selectedRelationship = String(data.relationshipToChild || '').trim().toUpperCase()
  const attestationRelationship = selectedRelationship === 'MYSELF'
    ? 'SELF'
    : (selectedRelationship || '—')

  return (
    <div className="ausf-doc print-doc ausf-07-17-doc flex flex-col min-h-[297mm] bg-white text-black text-[17px] max-w-[210mm] mx-auto px-6 py-2 leading-snug">
      <DocumentHeader
        registryNo={data.ausfRegistryNo}
        headerTextSize="20px"
        juratBlock={
          <div className="m-0 leading-none">
            Republic of the Philippines)
            <br />
            City of Iligan) S.S
            <br />
            x----------------------------------/
          </div>
        }
      />
      <div className="ausf-07-17-doc-body flex flex-col flex-1 min-h-0">
      <h2 className="text-center font-bold text-[14px] uppercase mb-2 mt-0">AFFIDAVIT TO USE THE SURNAME OF THE FATHER (AUSF)</h2>
      <p className="mb-0 leading-snug text-justify">
        I, <span className={`${FILL} affiant-name-blank affiant-name-bold-underline uppercase mx-0.5`}><span className="affiant-name-inner">{affiantWithSurname}</span></span>, of legal age, single/married, Filipino, and a resident of Iligan City, Philippines, after having been duly sworn to in accordance with law, do hereby declare THAT:
      </p>

      <ol className="list-decimal list-inside space-y-1.5 mb-0 mt-0 ml-6 text-justify">
        <li className="text-justify">I am seeking to use the surname of <span className="fill-blank inline-block font-bold px-1 min-w-[4rem] text-center uppercase">{surnameSought}</span> in the Certificate of Live Birth/Report of Birth of pursuant to R.A No. 9255.</li>
        <li className="ausf-place-of-birth-line text-justify">I was born on <span className={`${FILL} px-0.5 align-baseline`}>{dobFormatted}</span> at <span className={`${FILL} px-0.5 align-baseline`}>{placeStreet}</span>{placeStreet && placeCityProvince ? ', ' : null}{placeCityProvince ? <span className={`${FILL} px-0.5 align-baseline uppercase`}>{placeCityProvince}</span> : null}</li>
        <li className="text-justify">My Birth was recorded under Registry Number <span className="fill-blank empty-blank inline-block px-1 min-w-[5rem] text-center font-bold">{colbReg}</span> on <span className="fill-blank empty-blank inline-block px-1 min-w-[8rem] text-center font-bold">{colbDate}</span>.</li>
        <li className="text-justify">The Public Documents or the Private Handwritten Instrument was recorded under Registry Number <span className="fill-blank inline-block px-1 min-w-[5rem] text-center">{publicReg || ' '}</span> on <span className="fill-blank inline-block px-1 min-w-[8rem] text-center">{publicDate || ' '}</span> at the Local Civil Registry Office (LCRO)/Philippine Foreign Service Post (PFSP) of <span className="fill-blank inline-block px-1 min-w-[8rem] text-center">{publicOffice || ' '}</span>.</li>
        <li className="text-justify">I am filing this AUSF at LCRO/PFSP of <span className="fill-blank inline-block px-1 min-w-[8rem] text-center uppercase">{filingAt}</span> in accordance with R.A No. 9255 and its Revised Implementing Rules and Regulations.</li>
        <li className="text-justify">I hereby certify that the statements made herein are true and correct to the best of my knowledge and belief.</li>
      </ol>
      <p className="mb-0.5 text-justify"><span className="font-bold">IN WITNESS WHEREOF,</span> I have hereunto set my hand this <span className="fill-blank inline-block min-w-[8rem] text-center ml-1">{witnessDate}</span> at Iligan City, Philippines.</p>
      <div className="text-center mt-2 mb-3 leading-none">
        <div className="fill-blank uppercase inline-block pb-0">{attestationName}</div>
        <div className="text-xs mt-0">Affiant</div>
      </div>

      <h2 className="text-center font-bold text-sm uppercase my-3">SWORN ATTESTATION</h2>
      <p className="mb-0 text-justify">
        I, <span className="fill-blank inline-block min-w-[12rem] text-center mx-1">{affiantName}</span>, of legal age, single/married, Filipino, and a resident of Iligan City, Philippines, after having been duly sworn to in accordance with law, do hereby declare THAT:
      </p>
      <ol className="list-decimal list-inside space-y-1 mb-0 ml-6 text-justify">
        <li className="text-justify">That I am the <span className="fill-blank inline-block px-1 min-w-[3rem]">{attestationRelationship}</span> of the affiant in the above affidavit;</li>
        <li className="text-justify">That my above-named child/ward is fully aware of the consequences of the Affidavit to use the surname of his/her father.</li>
      </ol>
      <p className="mb-0.5 text-justify"><span className="font-bold">IN WITNESS WHEREOF,</span> I have hereunto set my hand this <span className="fill-blank inline-block min-w-[8rem] text-center ml-1">{witnessDate}</span> at Iligan City, Philippines.</p>
      <div className="text-center mt-2 mb-2 leading-none">
        <div className="fill-blank uppercase inline-block pb-0">{affiantName}</div>
        <div className="text-xs mt-0">Affiant</div>
      </div>
      <p className="ausf-subscribed-sworn mt-0.5 mb-0.5 text-justify leading-snug"><span className="font-bold">SUBSCRIBED AND SWORN</span> to before me this <span className="fill-blank inline-block min-w-[8rem] text-center ml-1">{witnessDate}</span> in the City of Iligan. I certify that I personally examined the affiant and that he/she voluntarily executed the foregoing affidavit and understood the contents thereof.</p>
      <div className="registrar-signature-zone mt-auto flex w-full min-h-[2rem] flex-col items-end justify-end">
        <div className="ccr-signatory-block city-registrar-signature inline-flex flex-col items-center text-center leading-snug">
          <p className="ccr-signatory-block__name m-0 p-0 font-bold text-sm">{data.cityCivilRegistrarName}</p>
          <p className="ccr-signatory-block__title m-0 p-0 text-xs italic">City Civil Registrar</p>
        </div>
      </div>
      </div>
      <div className="mt-auto shrink-0">
        <DocumentFooter contactPhone={data.contactPhone} contactEmail={data.contactEmail} />
      </div>
    </div>
  )
}