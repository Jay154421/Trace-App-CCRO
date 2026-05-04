const inputClassName = 'mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200';
const checkboxClassName = 'mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500';
const checkboxWrapperClassName = 'flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50/50';

export function ApplicantFormFields({
  form,
  onFieldChange,
  hideCoreIdentityFields = false,
  hideConditionalRequirements = false,
}) {
  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Applicant information</h2>
          {!hideCoreIdentityFields ? (
            <p className="mt-1 text-sm text-slate-500">Provide the basic details for the applicant profile.</p>
          ) : null}
        </div>
        {!hideCoreIdentityFields ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">First name *</span>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => onFieldChange('first_name', e.target.value)}
                className={inputClassName}
                autoComplete="given-name"
                aria-required="true"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Middle name</span>
              <input
                type="text"
                value={form.middle_name}
                onChange={(e) => onFieldChange('middle_name', e.target.value)}
                className={inputClassName}
                autoComplete="additional-name"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Last name *</span>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => onFieldChange('last_name', e.target.value)}
                className={inputClassName}
                autoComplete="family-name"
                aria-required="true"
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className={`grid gap-4 ${hideCoreIdentityFields ? '' : 'sm:grid-cols-2'}`}>
        {!hideCoreIdentityFields ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Date of birth *</span>
            <input
              type="date"
              required
              value={form.date_of_birth}
              onChange={(e) => onFieldChange('date_of_birth', e.target.value)}
              className={inputClassName}
              aria-required="true"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Contact no.</span>
          <input
            type="text"
            value={form.contact_no}
            onChange={(e) => onFieldChange('contact_no', e.target.value)}
            className={inputClassName}
          />
        </label>
      </div>

      {!hideCoreIdentityFields ? (
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Place of birth</span>
          <input
            type="text"
            value={form.place_of_birth}
            onChange={(e) => onFieldChange('place_of_birth', e.target.value)}
            className={inputClassName}
          />
        </label>
      ) : null}

      {!hideConditionalRequirements ? (
        <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <legend className="px-1 text-sm font-semibold text-slate-700">Conditional document requirements</legend>
          <p className="mb-4 mt-2 text-sm text-slate-500">Choose all that apply and required supporting documents will be added to the checklist.</p>
          <div className="space-y-2">
            <label className={checkboxWrapperClassName}>
              <input
                type="checkbox"
                checked={form.out_of_town}
                onChange={(e) => onFieldChange('out_of_town', e.target.checked)}
                className={checkboxClassName}
              />
              <span className="text-sm text-slate-700">Out of Town</span>
            </label>
            <label className={checkboxWrapperClassName}>
              <input
                type="checkbox"
                checked={form.registrant_deceased}
                onChange={(e) => onFieldChange('registrant_deceased', e.target.checked)}
                className={checkboxClassName}
              />
              <span className="text-sm text-slate-700">Registrant is deceased (attach death certificate)</span>
            </label>
            <label className={checkboxWrapperClassName}>
              <input
                type="checkbox"
                checked={form.parent_foreigner}
                onChange={(e) => onFieldChange('parent_foreigner', e.target.checked)}
                className={checkboxClassName}
              />
              <span className="text-sm text-slate-700">One parent is foreigner (attach passport or Bureau of Immigration cert.)</span>
            </label>
          </div>
        </fieldset>
      ) : null}
    </>
  );
}
