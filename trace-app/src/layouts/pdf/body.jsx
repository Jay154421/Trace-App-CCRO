import React from 'react';

function show(v) {
  const s = (v ?? '').trim();
  return s || '—';
}

export default function Certification({ copy }) {
  if (!copy) return null;

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
          This certification is issued upon the request of <strong>{show(copy.requestPerson)}</strong> for{' '}
          <strong>{copy.purpose}</strong> requirement purposes.
        </p>
        <p style={styles.text}>
          Issued this <strong>{show(copy.issuedDayOrdinal)}</strong> day of{' '}
          <strong>
            {show(copy.issuedMonthUpper)} {show(copy.issuedYearStr)}
          </strong>{' '}
          in Iligan City, Philippines.
        </p>

        <div style={styles.signatureSection}>
          <p style={styles.signatureText}>{copy.signatoryName}</p>
          <p style={styles.signatureTitle}>{copy.signatoryTitle}</p>
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
  signatureSection: {
    marginTop: '30px',
    textAlign: 'center',
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
