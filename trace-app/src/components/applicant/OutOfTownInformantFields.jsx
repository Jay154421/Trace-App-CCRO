const radioClassName = 'mt-0.5 h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500';
const optionClassName =
  'flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50/50';

/**
 * Shown when "Out of Town" is checked: who is filing as informant.
 */
export function OutOfTownInformantFields({
  informantIsOwner,
  onInformantIsOwnerChange,
  legend = 'Informant role',
  description = 'Choose which affidavit template to use for the out-of-town requirement.',
  ownerLabel = 'Informant is the document owner (applicant) — Affidavit for Out-of-Town Applicant',
  representativeLabel = 'Informant is not the document owner (representative) — Affidavit for Out-of-Town 2nd Person',
}) {
  return (
    <fieldset className="ml-7 space-y-2 border-l-2 border-emerald-200 pl-4">
      <legend className="text-sm font-medium text-slate-700">{legend}</legend>
      <p className="text-sm text-slate-500">{description}</p>
      <label className={optionClassName}>
        <input
          type="radio"
          name="out_of_town_informant_is_owner"
          checked={informantIsOwner === true}
          onChange={() => onInformantIsOwnerChange(true)}
          className={radioClassName}
        />
        <span className="text-sm text-slate-700">{ownerLabel}</span>
      </label>
      <label className={optionClassName}>
        <input
          type="radio"
          name="out_of_town_informant_is_owner"
          checked={informantIsOwner === false}
          onChange={() => onInformantIsOwnerChange(false)}
          className={radioClassName}
        />
        <span className="text-sm text-slate-700">{representativeLabel}</span>
      </label>
    </fieldset>
  );
}
