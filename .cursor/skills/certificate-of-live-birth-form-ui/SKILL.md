---
name: certificate-of-live-birth-form-ui
description: Replicate the Philippines Certificate of Live Birth (Municipal Form No. 102) layout and structure in code. Use when building or updating the COLB form UI to match the official design, or when the user shares the COLB form screenshot and wants the same layout implemented.
---

# Certificate of Live Birth Form UI

Recreate the **Republic of the Philippines – Certificate of Live Birth** (Municipal Form No. 102, Revised January 2007) so the UI matches the official form. The form is in quadruplicate style: clean, structured, with green accents and shaded section labels.

## Reference

- **Screenshot**: Use the COLB form image provided by the user or stored in project assets when matching layout and sections.
- **Existing implementation**: `trace-app/src/pages/CertificateOfLiveBirth.jsx` – align any new or changed UI with this page and the spec below.

## Visual Style

- **Background**: Predominantly white; green accent lines and shaded labels for major sections.
- **Sections**: Use a **green vertical bar** on the left of section headers for **CHILD**, **MOTHER**, and **FATHER**.
- **Layout**: Grid-like; distinct labels and input lines; black ink style (dark text on light backgrounds).
- **Typography**: Clear labels, official-document feel; consistent hierarchy (title > section headers > field labels).

## Form Structure (Top to Bottom)

### 1. Header

- Top left: "Municipal Form No. 102 (Revised January 2007)".
- Top right: "(To be accomplished in quadruplicate using black ink)".
- Centered: "Republic of the Philippines", "OFFICE OF THE CIVIL REGISTRAR GENERAL", **"CERTIFICATE OF LIVE BIRTH"**.
- Below title: **Registry No.** (single line).
- **Province** and **City/Municipality** (each with a line for input).

### 2. CHILD (green left bar)

| # | Label | Fields / Notes |
|---|--------|----------------|
| 1 | NAME | (First), (Middle), (Last) |
| 2 | SEX | Male/Female – single field |
| 3 | DATE OF BIRTH | (Day), (Month), (Year) |
| 4 | PLACE OF BIRTH | Name of Hospital/Clinic/Institution/House No., St., Barangay; City/Municipality; Province |
| 5a | TYPE OF BIRTH | Single, Twin, Triplet, etc. |
| 5b | IF MULTIPLE BIRTH, CHILD WAS | First, Second, Third, etc. |
| 5c | BIRTH ORDER | Order of this birth in total live births by mother |
| 6 | WEIGHT AT BIRTH | Value + "grams" |

### 3. MOTHER (green left bar)

| # | Label | Fields / Notes |
|---|--------|----------------|
| 7 | MAIDEN NAME | (First), (Middle), (Last) |
| 8 | CITIZENSHIP | Single field |
| 9 | RELIGION/RELIGIOUS SECT | Single field |
| 10a | Total number of children born alive | Single field |
| 10b | No. of children still living including this birth | Single field |
| 10c | No. of children born alive but are now dead | Single field |
| 11 | OCCUPATION | Single field |
| 12 | AGE at the time of this birth (completed years) | Single field |
| 13 | RESIDENCE | House No., St., Barangay; City/Municipality; Province; Country |

### 4. FATHER (green left bar)

| # | Label | Fields / Notes |
|---|--------|----------------|
| 14 | NAME | (First), (Middle), (Last) |
| 15 | CITIZENSHIP | Single field |
| 16 | RELIGION/RELIGIOUS SECT | Single field |
| 17 | OCCUPATION | Single field |
| 18 | AGE at the time of this birth (completed years) | Single field |
| 19 | RESIDENCE | House No., St., Barangay; City/Municipality; Province; Country |

### 5. Marriage of Parents

- Note: "(if not married, accomplish Affidavit of Acknowledgement/Admission of Paternity at the back.)"
- **20a. DATE**: (Month), (Day), (Year)
- **20b. PLACE**: (City/Municipality), (Province), (Country)

### 6. Certifications and Signatures (lower half)

- **21a. ATTENDANT**: 1 Physician, 2 Nurse, 3 Midwife, 4 Hilot (Traditional Birth Attendant), 5 Others (Specify) – with selection/input.
- **21b. CERTIFICATION OF ATTENDANT AT BIRTH**: Time (am/pm), date; then lines for Signature, Name in Print, Title or Position, Address, Date.
- **22. CERTIFICATION OF INFORMANT**: Statement; then Signature, Name in Print, Relationship to the Child, Address, Date.
- **23. PREPARED BY**: Signature, Name in Print, Title or Position, Date (to the right of 22).
- **24. RECEIVED BY**: Signature, Name in Print, Title or Position, Date (below 22).
- **25. REGISTERED BY THE CIVIL REGISTRAR**: Signature, Name in Print, Title or Position, Date (to the right of 24).

### 7. Remarks / Footer

- **REMARKS/ANNOTATIONS (For LCRO/OCRG Use Only)**: Large free-text area.
- Footer: "TO BE FILLED-UP AT THE OFFICE OF THE CIVIL REGISTRAR" and small numbered boxes (e.g. 8, 9, 11, 13, 15, 16, 17, 19) for office use.

## Implementation Notes

- Use **Tailwind** (and existing theme in `trace-app`) for layout, spacing, and colors. Keep green accents and section bars consistent with the spec.
- Preserve **section order and numbering** (1–25) so the form reads like the official document.
- Keep **responsive** behavior: readable on desktop; consider stacking or simplified layout on small screens if needed.
- Map each listed field to existing state/API in `CertificateOfLiveBirth.jsx` where applicable; add only missing fields and labels to match this spec.
- For **accessibility**: proper labels, grouping (e.g. fieldset), and focus order following the section order above.
