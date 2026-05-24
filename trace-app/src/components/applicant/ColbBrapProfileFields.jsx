import { OutOfTownInformantFields } from './OutOfTownInformantFields';
import {
  COLB_OUT_OF_TOWN_CHECKBOX_LABEL,
  COLB_OUT_OF_TOWN_INFORMANT_INTRO,
  COLB_OUT_OF_TOWN_INFORMANT_LEGEND,
  COLB_OUT_OF_TOWN_INFORMANT_OWNER_LABEL,
  COLB_OUT_OF_TOWN_INFORMANT_REP_LABEL,
  COLB_OUT_OF_TOWN_SECTION_INTRO,
  COLB_OUT_OF_TOWN_SECTION_TITLE,
} from '../../utils/colbOutOfTownCopy';

const checkboxClassName = 'mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500';
const checkboxWrapperClassName =
  'flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50/50';

/** Marriage, parent I.D., Muslim — added to document checklist when checked. */
export function ColbBrapDocumentFlagsFields({ form, onFieldChange }) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
      <legend className="px-1 text-sm font-semibold text-slate-700">Conditional document requirements</legend>
      <p className="mb-4 mt-2 text-sm text-slate-500">
        Choose all that apply. Checked items are added to the document checklist.
      </p>
      <div className="space-y-2">
        <label className={checkboxWrapperClassName}>
          <input
            type="checkbox"
            checked={form.has_marriage_certificate}
            onChange={(e) => onFieldChange('has_marriage_certificate', e.target.checked)}
            className={checkboxClassName}
          />
          <span className="text-sm text-slate-700">Parents are married (marriage contract)</span>
        </label>
        <label className={checkboxWrapperClassName}>
          <input
            type="checkbox"
            checked={form.colb_requires_parent_id}
            onChange={(e) => onFieldChange('colb_requires_parent_id', e.target.checked)}
            className={checkboxClassName}
          />
          <span className="text-sm text-slate-700">Registrant is a Child (parent/s or guardian valid I.D.)</span>
        </label>
        <label className={checkboxWrapperClassName}>
          <input
            type="checkbox"
            checked={form.has_muslim_attachment}
            onChange={(e) => onFieldChange('has_muslim_attachment', e.target.checked)}
            className={checkboxClassName}
          />
          <span className="text-sm text-slate-700">Registrant is a Muslim (Muslim attachment)</span>
        </label>
      </div>
    </fieldset>
  );
}

/** Out of town — Legal Office affidavit only; separate from document checklist. */
export function ColbBrapOutOfTownFields({ form, onFieldChange }) {
  return (
    <fieldset className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5">
      <legend className="px-1 text-sm font-semibold text-slate-700">{COLB_OUT_OF_TOWN_SECTION_TITLE}</legend>
      <p className="mb-4 mt-2 text-sm text-slate-500">{COLB_OUT_OF_TOWN_SECTION_INTRO}</p>
      <div className="space-y-2">
        <label className={checkboxWrapperClassName}>
          <input
            type="checkbox"
            checked={form.out_of_town}
            onChange={(e) => {
              const checked = e.target.checked;
              onFieldChange('out_of_town', checked);
              if (!checked) onFieldChange('out_of_town_informant_is_owner', true);
            }}
            className={checkboxClassName}
          />
          <span className="text-sm text-slate-700">{COLB_OUT_OF_TOWN_CHECKBOX_LABEL}</span>
        </label>
        {form.out_of_town ? (
          <OutOfTownInformantFields
            informantIsOwner={form.out_of_town_informant_is_owner}
            onInformantIsOwnerChange={(value) => onFieldChange('out_of_town_informant_is_owner', value)}
            legend={COLB_OUT_OF_TOWN_INFORMANT_LEGEND}
            description={COLB_OUT_OF_TOWN_INFORMANT_INTRO}
            ownerLabel={COLB_OUT_OF_TOWN_INFORMANT_OWNER_LABEL}
            representativeLabel={COLB_OUT_OF_TOWN_INFORMANT_REP_LABEL}
          />
        ) : null}
      </div>
    </fieldset>
  );
}

export function ColbBrapProfileFields({ form, onFieldChange }) {
  return (
    <div className="space-y-4">
      <ColbBrapDocumentFlagsFields form={form} onFieldChange={onFieldChange} />
      <ColbBrapOutOfTownFields form={form} onFieldChange={onFieldChange} />
    </div>
  );
}
