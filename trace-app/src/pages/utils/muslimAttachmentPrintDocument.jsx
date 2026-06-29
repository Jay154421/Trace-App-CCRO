function blank(value) {
  const s = String(value ?? '').trim();
  return s || '\u00a0';
}

const DEFAULT_PROVINCE = 'LANAO DEL NORTE';
const DEFAULT_CITY_MUNICIPALITY = 'ILIGAN CITY';

export default function MuslimAttachmentPrintDocument({ data = {} }) {
  const province = blank(data.province || DEFAULT_PROVINCE);
  const cityMunicipality = blank(data.cityMunicipality || DEFAULT_CITY_MUNICIPALITY);
  const registryNo = blank(data.registryNo);
  const childFirstName = blank(data.childFirstName);
  const childMiddleName = blank(data.childMiddleName);
  const childLastName = blank(data.childLastName);
  const birthDay = blank(data.birthDay);
  const birthMonth = blank(data.birthMonth);
  const birthYear = blank(data.birthYear);
  const hijrahDay = blank(data.hijrahDay);
  const hijrahMonth = blank(data.hijrahMonth);
  const hijrahYear = blank(data.hijrahYear);
  const fatherEthnicity = blank(data.fatherEthnicity);
  const motherEthnicity = blank(data.motherEthnicity);
  const informantSignature = blank(data.informantSignature);
  const informantAddress = blank(data.informantAddress);
  const informantNameInPrint = blank(data.informantNameInPrint);
  const informantRelationship = blank(data.informantRelationship);
  const informantDate = blank(data.informantDate);

  return (
    <div className="ausf-doc muslim-attachment-doc print-doc bg-white text-black">
      <style>{`
        body.pdf-capture .muslim-attachment-doc,
        .muslim-attachment-doc {
          font-family: Arial, Helvetica, sans-serif !important;
          color: #000 !important;
          background: #fff !important;
          padding: 24px !important;
          width: 100% !important;
          max-width: none !important;
          min-height: 0 !important;
          height: auto !important;
          display: block !important;
          box-sizing: border-box !important;
        }
        .muslim-attachment-doc .header {
          text-align: center;
          margin-bottom: 10px;
        }
        .muslim-attachment-doc .header-logo {
          text-align: center;
          margin-bottom: 4px;
        }
        .muslim-attachment-doc .header-logo img {
          height: 70px;
          width: auto;
          margin: 0 auto;
        }
        .muslim-attachment-doc table.form {
          width: 100%;
          border-collapse: collapse;
          border: 1.5px solid #000 !important;
          margin-top: 10px;
        }
        .muslim-attachment-doc table.form td,
        .muslim-attachment-doc table.form th {
          border: 1px solid #000 !important;
          vertical-align: top;
          padding: 6px 8px;
          font-size: 12.5px;
        }
        .muslim-attachment-doc .label {
          font-weight: bold;
        }
        .muslim-attachment-doc .field-value {
          border-bottom: 1px solid #000 !important;
          display: inline-block;
          width: 100%;
          min-height: 1.2em;
          padding: 2px 0;
        }
      `}</style>

      <div className="header">
        <div className="header-logo">
          <img src="/muslim logo.png" alt="" />
        </div>
      </div>

      <table className="form">
        <tbody>
          <tr>
            <td style={{ width: '75%' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="label">Municipal Form No. 102</span>
              </div>
              <div style={{ fontSize: 11, marginTop: 2 }}>
                (Revised January 2007, attachment)
              </div>
            </td>
            <td style={{ textAlign: 'right', fontSize: 11.5 }}>
              (To be accomplished in quadruplicate using black ink)
            </td>
          </tr>

          <tr>
            <td style={{ width: '75%' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Province</span>
                <span className="field-value" style={{ flex: 1 }}>{province}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>City/Municipality</span>
                <span className="field-value" style={{ flex: 1 }}>{cityMunicipality}</span>
              </div>
            </td>
            <td>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Registry No.</span>
                <span className="field-value" style={{ flex: 1 }}>{registryNo}</span>
              </div>
            </td>
          </tr>

          <tr>
            <td colSpan={2} style={{ padding: '8px 12px 16px 12px' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: '150px', fontWeight: 'bold' }}>1. NAME OF CHILD</div>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', marginBottom: 4 }}>(First)</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', textTransform: 'uppercase', minHeight: '20px' }}>{childFirstName}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', marginBottom: 4 }}>(Middle)</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', textTransform: 'uppercase', minHeight: '20px' }}>{childMiddleName}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', marginBottom: 4 }}>(Last)</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', textTransform: 'uppercase', minHeight: '20px' }}>{childLastName}</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td colSpan={2} style={{ padding: '8px 12px 12px 12px' }}>
              {/* Header Row */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                <div style={{ width: '150px', fontWeight: 'bold' }}>2. DATE OF BIRTH</div>
                <div style={{ flex: 1, display: 'flex' }}>
                  <div style={{ width: '20%', textAlign: 'center', fontSize: '11px' }}>(Day)</div>
                  <div style={{ width: '50%', textAlign: 'center', fontSize: '11px' }}>(Month)</div>
                  <div style={{ width: '30%', textAlign: 'center', fontSize: '11px' }}>(Year)</div>
                </div>
              </div>
              
              {/* Gregorian Calendar Row */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ width: '150px', fontSize: '12.5px' }}>Gregorian Calendar</div>
                <div style={{ flex: 1, display: 'flex', borderBottom: '1px solid #000' }}>
                  <div style={{ width: '20%', textAlign: 'center', minHeight: '1.2em' }}>{birthDay}</div>
                  <div style={{ width: '50%', textAlign: 'center', minHeight: '1.2em' }}>{birthMonth}</div>
                  <div style={{ width: '30%', textAlign: 'center', minHeight: '1.2em' }}>{birthYear}</div>
                </div>
              </div>

              {/* Hijrah Calendar Row */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <div style={{ width: '150px', fontSize: '12.5px' }}>Hijrah Calendar</div>
                <div style={{ flex: 1, display: 'flex', borderBottom: '1px solid #000' }}>
                  <div style={{ width: '20%', textAlign: 'center', minHeight: '1.2em' }}>{hijrahDay}</div>
                  <div style={{ width: '50%', textAlign: 'center', minHeight: '1.2em' }}>{hijrahMonth}</div>
                  <div style={{ width: '30%', textAlign: 'center', minHeight: '1.2em' }}>{hijrahYear}</div>
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td style={{ width: '50%', padding: '8px 12px 16px 12px' }}>
              <div className="label" style={{ marginBottom: 8 }}>3. ETHNICITY OF THE FATHER</div>
              <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '500', minHeight: '20px', textTransform: 'uppercase' }}>
                {fatherEthnicity}
              </div>
            </td>
            <td style={{ width: '50%', padding: '8px 12px 16px 12px' }}>
              <div className="label" style={{ marginBottom: 8 }}>4. ETHNICITY OF THE MOTHER</div>
              <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '500', minHeight: '20px', textTransform: 'uppercase' }}>
                {motherEthnicity}
              </div>
            </td>
          </tr>

          <tr>
            <td colSpan={2} style={{ padding: '8px 12px 12px 12px' }}>
              <div className="label">5. INFORMANT</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginTop: 12 }}>
                {/* Signature */}
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Signature</span>
                  <span className="field-value" style={{ flex: 1, textAlign: 'center' }}>{informantSignature}</span>
                </div>
                {/* Address */}
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Address</span>
                  <span className="field-value" style={{ flex: 1, textAlign: 'center' }}>{informantAddress}</span>
                </div>
                {/* Name in Print */}
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Name in Print</span>
                  <span className="field-value" style={{ flex: 1, textAlign: 'center' }}>{informantNameInPrint}</span>
                </div>
                {/* Blank line under Address (aligned with Address line using visibility hidden label) */}
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ marginRight: 8, whiteSpace: 'nowrap', visibility: 'hidden' }}>Address</span>
                  <span className="field-value" style={{ flex: 1, textAlign: 'center' }}>&nbsp;</span>
                </div>
                {/* Relationship to the Child */}
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Relationship to the Child</span>
                  <span className="field-value" style={{ flex: 1, textAlign: 'center' }}>{informantRelationship}</span>
                </div>
                {/* Date */}
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Date</span>
                  <span className="field-value" style={{ flex: 1, textAlign: 'center' }}>{informantDate}</span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}