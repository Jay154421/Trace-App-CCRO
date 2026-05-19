import React from 'react'
import { formatDateLong, fullName, joinCommaParts } from '../../lib/printUtils';
import { DocumentHeader, DocumentFooter, FILL, FILL_BOLD } from '../../components/print';

/** A4 and long bond — not laid out for short (8.5" × 11"). */
export const AUSF_06_PRINT_TYPE = 'ausf-0-6'
export const AUSF_06_EXCLUDED_PAPER_SIZE_IDS = new Set(['short'])

export default function Ausf06({ data }) {
  const affiantName = data.applicantName || fullName(data.childFirst, data.childMiddle, data.fatherLast) || fullName(data.fatherFirst, data.fatherMiddle, data.fatherLast)
  const surnameSought = data.fatherLast
  const childFullName = fullName(data.childFirst, data.childMiddle, data.childLast)
  const relationship = String(data.relationshipToChild || '').trim().toUpperCase() || 'SON'
  const dobFormatted = formatDateLong(data.dateOfBirth)
  const colbReg = String(data.colbRegistryNo ?? '').trim() || ' '
  const colbDate = formatDateLong(data.colbDateOfRegistration) || ' '
  const publicReg = data.publicDocRegistryNo
  const publicDate = formatDateLong(data.publicDocDate)
  const publicOffice = data.publicDocOffice
  const filingAt = data.filingLocation || 'ILIGAN CITY'
  const witnessDate = formatDateLong(data.affidavitExecutionDate) || formatDateLong(data.colbDateOfRegistration)
  const placeStreet = (data.placeOfBirthAddress || '').trim()
  const placeCityProvince = joinCommaParts(data.placeOfBirthCity, data.placeOfBirthProvince)

  return (
    <div className="ausf-doc print-doc ausf-0-6-doc flex flex-col bg-white text-black">
      <DocumentHeader
        registryNo={data.ausfRegistryNo}
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
      <div className="ausf-0-6-doc-body ausf-doc-body print-doc-body flex flex-col">
        <h2 className="ausf-section-title">AFFIDAVIT TO USE THE SURNAME OF THE FATHER (AUSF)</h2>
        <p className="mb-2 leading-normal">
          I, <span className={`${FILL} affiant-name-blank uppercase mx-0.5 align-baseline`}><span className="affiant-name-inner">{affiantName}</span></span>, of legal age, single/married, Filipino, and a resident of Iligan City, Philippines, after having been duly sworn to in accordance with law, do hereby declare THAT:
        </p>

        <ol className="list-decimal space-y-2 mb-2 text-left leading-normal">
          <li>
            I am seeking to use the surname of <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{surnameSought}</span> in the Certificate of Live Birth/Report of Birth of <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{childFullName}</span> who is my <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{relationship}</span> pursuant to R.A No. 9255
          </li>
          <li className="ausf-place-of-birth-line">
            He/She was born on <span className={`${FILL_BOLD} px-0.5 align-baseline`}>{dobFormatted}</span> at <span className={`${FILL_BOLD} px-0.5 align-baseline`}>{placeStreet}</span>{placeStreet && placeCityProvince ? ', ' : null}{placeCityProvince ? <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{placeCityProvince}</span> : null}
          </li>
          <li>
            The Birth was recorded under Registry Number <span className={`${FILL_BOLD} empty-blank px-0.5 align-baseline`}>{colbReg}</span> on <span className={`${FILL_BOLD} empty-blank px-0.5 align-baseline`}>{colbDate}</span>
          </li>
          <li>
            The Public Documents or the Private Handwritten Instrument was recorded under Registry Number <span className={`${FILL} empty-blank px-0.5 align-baseline`}>{publicReg || ' '}</span> on <span className={`${FILL} empty-blank px-0.5 align-baseline`}>{publicDate || ' '}</span> at the Local Civil Registry Office (LCRO)/Philippine Foreign Service Post (PFSP) of <span className={`${FILL} empty-blank px-0.5 align-baseline`}>{publicOffice || ' '}</span>
          </li>
          <li>
            I am filing this AUSF at LCRO/PFSP of <span className={`${FILL_BOLD} px-0.5 align-baseline uppercase`}>{filingAt}</span> in accordance with R.A No. 9255 and its Revised Implementing Rules and Regulations.
          </li>
          <li>
            I hereby certify that the statements made herein are true and correct to the best of my knowledge and belief.
          </li>
        </ol>

        <p className="mb-0 leading-normal">
          <span className="font-bold">IN WITNESS WHEREOF,</span> I have hereunto set my hand this <span className={`${FILL_BOLD} ml-1 align-baseline`}>{witnessDate}</span> at Iligan City, Philippines.
        </p>
        <div className="ausf-signature-block">
          <div className="ausf-signature-block__name">{affiantName}</div>
          <div className="ausf-signature-block__label">Affiant</div>
        </div>
        <p className="ausf-subscribed-sworn mb-0 leading-normal">
          <span className="font-bold">SUBSCRIBED AND SWORN</span> to before me this <span className={`${FILL_BOLD} ml-1 align-baseline`}>{witnessDate}</span> in the City of Iligan. I certify that I personally examined the affiant and that he/she voluntarily executed the foregoing affidavit and understood the contents thereof.
        </p>
        <div className="registrar-signature-zone flex w-full flex-col items-end justify-end">
          <div className="ccr-signatory-block city-registrar-signature inline-flex flex-col leading-snug">
            <p className="ccr-signatory-block__name m-0 p-0 font-bold">{data.cityCivilRegistrarName}</p>
            <p className="ccr-signatory-block__title m-0 p-0 text-sm">City Civil Registrar</p>
          </div>
        </div>
      </div>
      <div className="ausf-doc-footer print-doc-footer-wrap shrink-0">
        <DocumentFooter contactPhone={data.contactPhone} contactEmail={data.contactEmail} />
      </div>
    </div>
  )
}
