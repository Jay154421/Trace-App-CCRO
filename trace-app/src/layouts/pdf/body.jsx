import React, { useId, useState } from 'react';

function show(v) {
  const s = (v ?? '').trim();
  return s || '—';
}

export default function Certification({
  copy,
  editablePurpose = '',
  purposeOptions = [],
  onPurposeChange,
  editableRequestPerson = '',
  requestPersonOptions = [],
  onRequestPersonChange,
  editableSignatoryName = '',
  editableSignatoryTitle = '',
  signatoryOptions = [],
  onSignatoryChange,
}) {
  if (!copy) return null;
  const [isEditingPurpose, setIsEditingPurpose] = useState(false);
  const [isEditingRequestPerson, setIsEditingRequestPerson] = useState(false);
  const purposeDatalistId = useId();
  const requestPersonDatalistId = useId();
  const displayedPurpose = show(editablePurpose || copy.purpose);
  const displayedRequestPerson = show(editableRequestPerson || copy.requestPerson);
  const displayedSignatoryName = show(editableSignatoryName || copy.signatoryName);
  const displayedSignatoryTitle = show(editableSignatoryTitle || copy.signatoryTitle);

  return (
    <div style={styles.container}>
      <h1 style={styles.certificationTitle}>CERTIFICATION</h1>

      <div style={styles.bodyText}>
        <p style={styles.toWhom}>TO WHOM IT MAY CONCERN:</p>
        <p style={styles.text}>
          This is to certify that the application for Delayed Registration of Birth in favor of{' '}
          <strong>{show(copy.childName)}</strong> alleged to have been born on{' '}
          <strong>{show(copy.birthDateLine)}</strong> at <strong>{show(copy.placeOfBirth)}</strong> to parents{' '}
          <strong>{show(copy.motherName)}</strong> and <strong>{show(copy.fatherName)}</strong> is{' '}
          <strong>{copy.processStatus}</strong> in this office.
        </p>
        <p style={styles.text}>
          This certification is issued upon the request of{' '}
          {isEditingRequestPerson ? (
            <input
              type="text"
              value={editableRequestPerson}
              onChange={(e) => onRequestPersonChange?.(e.target.value)}
              onBlur={() => setIsEditingRequestPerson(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.currentTarget.blur();
                }
              }}
              placeholder="Type request person"
              list={requestPersonDatalistId}
              autoFocus
              style={styles.purposeInput}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingRequestPerson(true)}
              style={styles.purposeButton}
              title="Click to edit request person"
            >
              {displayedRequestPerson}
            </button>
          )}{' '}
          <datalist id={requestPersonDatalistId}>
            {requestPersonOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>{' '}
          for{' '}
          {isEditingPurpose ? (
            <input
              type="text"
              value={editablePurpose}
              onChange={(e) => onPurposeChange?.(e.target.value)}
              onBlur={() => setIsEditingPurpose(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.currentTarget.blur();
                }
              }}
              placeholder="Type certification purpose"
              list={purposeDatalistId}
              autoFocus
              style={styles.purposeInput}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingPurpose(true)}
              style={styles.purposeButton}
              title="Click to edit certification purpose"
            >
              {displayedPurpose}
            </button>
          )}{' '}
          <datalist id={purposeDatalistId}>
            {purposeOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          requirement purposes.
        </p>
        <p style={styles.text}>
          Issued this <strong>{show(copy.issuedDayOrdinal)}</strong> day of{' '}
          <strong>
            {show(copy.issuedMonthUpper)} {show(copy.issuedYearStr)}
          </strong>{' '}
          in Iligan City, Philippines.
        </p>

        <div style={styles.signatureSection}>
          <select
            value={editableSignatoryName || copy.signatoryName || ''}
            onChange={(e) => onSignatoryChange?.(e.target.value)}
            style={styles.signatorySelect}
            className="print:hidden"
            aria-label="Signatory name"
          >
            {signatoryOptions.map((option) => (
              <option key={option.name} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
          <p className="hidden print:block" style={styles.signatureText}>
            {displayedSignatoryName}
          </p>
          <p style={styles.signatureTitle}>{displayedSignatoryTitle}</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '80%',
    margin: '20px auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    lineHeight: '1.6',
  },
  certificationTitle: {
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '30px',
  },
  bodyText: {
    fontSize: '12px',
  },
  toWhom: {
    fontWeight: 'bold',
    marginBottom: '15px',
  },
  text: {
    marginBottom: '15px',
  },
  purposeButton: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    margin: 0,
    fontSize: 'inherit',
    fontFamily: 'inherit',
    lineHeight: 'inherit',
    fontWeight: 'bold',
    cursor: 'text',
    textTransform: 'uppercase',
  },
  purposeInput: {
    width: '220px',
    maxWidth: '100%',
    fontSize: 'inherit',
    fontFamily: 'inherit',
    lineHeight: 'inherit',
    fontWeight: 'bold',
    border: 'none',
    borderBottom: '1px solid #000',
    outline: 'none',
    backgroundColor: 'transparent',
    textTransform: 'uppercase',
    padding: '0 2px',
  },
  signatureSection: {
    marginTop: '30px',
    textAlign: 'center',
  },
  signatorySelect: {
    minWidth: '260px',
    maxWidth: '100%',
    margin: '0 auto',
    display: 'inline-block',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    border: 'none',
    borderBottom: '1px solid #000',
    borderRadius: 0,
    padding: '0 2px',
    backgroundColor: 'transparent',
  },
  signatureText: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  signatureTitle: {
    fontSize: '12px',
    fontStyle: 'italic',
  },
};
