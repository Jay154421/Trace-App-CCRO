import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { childrenApi } from '../../services/api';

const DEFAULT_PROVINCE = 'LANAO DEL NORTE';
const DEFAULT_CITY_MUNICIPALITY = 'ILIGAN CITY';

const EMPTY_FORM = {
  province: DEFAULT_PROVINCE,
  cityMunicipality: DEFAULT_CITY_MUNICIPALITY,
  registryNo: '',
  childFirstName: '',
  childMiddleName: '',
  childLastName: '',
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  hijrahDay: '',
  hijrahMonth: '',
  hijrahYear: '',
  fatherEthnicity: '',
  motherEthnicity: '',
  informantSignature: '',
  informantAddress: '',
  informantNameInPrint: '',
  informantRelationship: '',
  informantDate: '',
};

export function MuslimAttachment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const printPath = `${basePath}/${id}/muslim-attachment/print`;

  const updateField = useCallback((field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  }, []);

  const handleSave = useCallback(
    async (e) => {
      e.preventDefault();
      setSaving(true);
      try {
        await childrenApi.updateMuslimAttachment(id, form);
        toast.success('Muslim Attachment saved.');
      } catch (err) {
        toast.error(err?.message || 'Failed to save Muslim Attachment.');
      } finally {
        setSaving(false);
      }
    },
    [id, form]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    childrenApi
      .get(id)
      .then((data) => {
        if (!cancelled) {
          const ma = data.muslim_attachment || {};
          setForm((f) => ({
            ...f,
            ...ma,
            province: ma.province || DEFAULT_PROVINCE,
            cityMunicipality: ma.cityMunicipality || DEFAULT_CITY_MUNICIPALITY,
          }));
        }
      })
      .catch((err) => {
        if (!cancelled) toast.error(err?.message || 'Failed to load record.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="muslim-attachment-root">
      <style>{`
      .muslim-attachment-root {
        font-family: Arial, Helvetica, sans-serif;
        color: #000;
        background: #fff;
        padding: 24px;
      }
      .muslim-attachment-root .sheet {
        max-width: 850px;
        margin: 0 auto;
      }
      .muslim-attachment-root .location-lines {
        text-align: center;
        font-size: 13px;
        font-weight: bold;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
        text-transform: uppercase;
      }
      .muslim-attachment-root .header {
        text-align: center;
        margin-bottom: 10px;
      }
      .muslim-attachment-root .header-logo {
        text-align: center;
        margin-bottom: 4px;
      }
      .muslim-attachment-root .header-logo img {
        height: 70px;
        width: auto;
      }
      .muslim-attachment-root .arabic-calligraphy {
        font-size: 28px;
        line-height: 1.2;
        font-weight: bold;
        direction: rtl;
        margin-bottom: 2px;
      }
      .muslim-attachment-root .header-caption {
        font-size: 11px;
        font-weight: bold;
        letter-spacing: 0.5px;
      }
      .muslim-attachment-root table.form {
        width: 100%;
        border-collapse: collapse;
        border: 1.5px solid #000;
        margin-top: 10px;
      }
      .muslim-attachment-root table.form td,
      .muslim-attachment-root table.form th {
        border: 1px solid #000;
        vertical-align: top;
        padding: 6px 8px;
        font-size: 12.5px;
      }
      .muslim-attachment-root .label {
        font-weight: bold;
      }
      .muslim-attachment-root .row-tall {
        height: 56px;
      }
      .muslim-attachment-root .no-border-bottom td {
        border-bottom: none !important;
      }
      .muslim-attachment-root .no-border-top td {
        border-top: none !important;
      }
      .muslim-attachment-root .inline-fields {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
        margin-top: 2px;
      }
      .muslim-attachment-root .inline-two {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-top: 10px;
      }
      .muslim-attachment-root .calendar-row {
        display: grid;
        grid-template-columns: 150px 80px 90px 90px 90px;
        gap: 10px;
        align-items: center;
        margin-top: 8px;
      }
      .muslim-attachment-root .informant-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        row-gap: 10px;
        column-gap: 20px;
        align-items: center;
        margin-top: 8px;
      }
      .muslim-attachment-root .field-line {
        display: block;
        width: 100%;
        border: none;
        border-bottom: 1px solid #000;
        background: transparent;
        font-size: 12.5px;
        font-family: Arial, Helvetica, sans-serif;
        padding: 2px 0;
        outline: none;
        color: #000;
      }
      .muslim-attachment-root .field-line:focus {
        border-bottom-width: 2px;
      }
      .muslim-attachment-root .field-full {
        width: 100%;
        box-sizing: border-box;
      }
      .muslim-attachment-root .actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 18px;
        gap: 12px;
      }
      .muslim-attachment-root .no-print {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .muslim-attachment-root .empty-label {
        white-space: nowrap;
      }
      @media print {
        .muslim-attachment-root .no-print {
          display: none !important;
        }
        .muslim-attachment-root {
          padding: 0;
        }
        .muslim-attachment-root .sheet {
          max-width: none;
        }
      }
    `}</style>

      <div className="sheet">
        <div className="header">
          <div className="header-logo">
            <img src="/muslim logo.png" alt="" />
          </div>
        </div>

        <form onSubmit={handleSave}>
          <table className="form" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '50%' }} />
              <col style={{ width: '50%' }} />
            </colgroup>
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
                    <input
                      className="field-line"
                      type="text"
                      value={form.province}
                      onChange={(e) => updateField('province', e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>City/Municipality</span>
                    <input
                      className="field-line"
                      type="text"
                      value={form.cityMunicipality}
                      onChange={(e) => updateField('cityMunicipality', e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Registry No.</span>
                    <input
                      className="field-line"
                      type="text"
                      value={form.registryNo}
                      onChange={(e) => updateField('registryNo', e.target.value)}
                      style={{ flex: 1 }}
                    />
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
                        <input
                          className="field-line field-full"
                          type="text"
                          value={form.childFirstName}
                          onChange={(e) => updateField('childFirstName', e.target.value)}
                          style={{ textAlign: 'center' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', marginBottom: 4 }}>(Middle)</span>
                        <input
                          className="field-line field-full"
                          type="text"
                          value={form.childMiddleName}
                          onChange={(e) => updateField('childMiddleName', e.target.value)}
                          style={{ textAlign: 'center' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', marginBottom: 4 }}>(Last)</span>
                        <input
                          className="field-line field-full"
                          type="text"
                          value={form.childLastName}
                          onChange={(e) => updateField('childLastName', e.target.value)}
                          style={{ textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td colSpan={2} style={{ padding: '8px 12px 12px 12px' }}>
                   {/* Header Row */}
                   <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 4 }}>
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
                      <input
                        className="field-line"
                        type="text"
                        value={form.birthDay}
                        onChange={(e) => updateField('birthDay', e.target.value)}
                        style={{ width: '20%', textAlign: 'center', borderBottom: 'none' }}
                      />
                      <input
                        className="field-line"
                        type="text"
                        value={form.birthMonth}
                        onChange={(e) => updateField('birthMonth', e.target.value)}
                        style={{ width: '50%', textAlign: 'center', borderBottom: 'none' }}
                      />
                      <input
                        className="field-line"
                        type="text"
                        value={form.birthYear}
                        onChange={(e) => updateField('birthYear', e.target.value)}
                        style={{ width: '30%', textAlign: 'center', borderBottom: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Hijrah Calendar Row */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                    <div style={{ width: '150px', fontSize: '12.5px' }}>Hijrah Calendar</div>
                    <div style={{ flex: 1, display: 'flex', borderBottom: '1px solid #000' }}>
                      <input
                        className="field-line"
                        type="text"
                        value={form.hijrahDay}
                        onChange={(e) => updateField('hijrahDay', e.target.value)}
                        style={{ width: '20%', textAlign: 'center', borderBottom: 'none' }}
                      />
                      <input
                        className="field-line"
                        type="text"
                        value={form.hijrahMonth}
                        onChange={(e) => updateField('hijrahMonth', e.target.value)}
                        style={{ width: '50%', textAlign: 'center', borderBottom: 'none' }}
                      />
                      <input
                        className="field-line"
                        type="text"
                        value={form.hijrahYear}
                        onChange={(e) => updateField('hijrahYear', e.target.value)}
                        style={{ width: '30%', textAlign: 'center', borderBottom: 'none' }}
                      />
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td style={{ width: '50%', padding: '8px 12px 16px 12px' }}>
                  <div className="label" style={{ marginBottom: 8 }}>3. ETHNICITY OF THE FATHER</div>
                  <input
                    className="field-line field-full"
                    type="text"
                    value={form.fatherEthnicity}
                    onChange={(e) => updateField('fatherEthnicity', e.target.value)}
                    style={{ textAlign: 'center' }}
                  />
                </td>
                <td style={{ width: '50%', padding: '8px 12px 16px 12px' }}>
                  <div className="label" style={{ marginBottom: 8 }}>4. ETHNICITY OF THE MOTHER</div>
                  <input
                    className="field-line field-full"
                    type="text"
                    value={form.motherEthnicity}
                    onChange={(e) => updateField('motherEthnicity', e.target.value)}
                    style={{ textAlign: 'center' }}
                  />
                </td>
              </tr>

              <tr>
                <td colSpan={2} style={{ padding: '8px 12px 12px 12px' }}>
                  <div className="label">5. INFORMANT</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginTop: 12 }}>
                    {/* Signature */}
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Signature</span>
                      <input
                        className="field-line"
                        type="text"
                        value={form.informantSignature}
                        onChange={(e) => updateField('informantSignature', e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                    {/* Address */}
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Address</span>
                      <input
                        className="field-line"
                        type="text"
                        value={form.informantAddress}
                        onChange={(e) => updateField('informantAddress', e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                    {/* Name in Print */}
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Name in Print</span>
                      <input
                        className="field-line"
                        type="text"
                        value={form.informantNameInPrint}
                        onChange={(e) => updateField('informantNameInPrint', e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                    {/* Blank line under Address (aligned with Address line using visibility hidden label) */}
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ marginRight: 8, whiteSpace: 'nowrap', visibility: 'hidden' }}>Address</span>
                      <span className="field-line" style={{ borderBottom: '1px solid #000', minHeight: '24px', flex: 1 }}>&nbsp;</span>
                    </div>
                    {/* Relationship to the Child */}
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Relationship to the Child</span>
                      <input
                        className="field-line"
                        type="text"
                        value={form.informantRelationship}
                        onChange={(e) => updateField('informantRelationship', e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                    {/* Date */}
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Date</span>
                      <input
                        className="field-line"
                        type="text"
                        value={form.informantDate}
                        onChange={(e) => updateField('informantDate', e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="actions no-print">
            <Link
              to={applicantDetailPath(basePath, id)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </Link>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                to={printPath}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View document
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}