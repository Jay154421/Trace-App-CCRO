---
name: replicate-ui-from-screenshot
description: Recreates UI layouts and components to match a provided screenshot. Use when the user shares or attaches a screenshot and wants the same design implemented in code (same layout, colors, typography, spacing).
---

# Replicate UI From Screenshot

When the user provides a screenshot and wants the UI to match it, follow this workflow so the implementation looks the same.

## 1. Analyze the Screenshot

Before writing code, extract from the image:

- **Layout**: Rows/columns, sidebar vs main content, card grid, list, form layout.
- **Spacing**: Padding and gaps (estimate in multiples of 4px: 8, 16, 24, 32).
- **Typography**: Headings vs body, approximate sizes (text-sm, text-base, text-lg, etc.), weight (font-medium, font-semibold).
- **Colors**: Backgrounds, text, borders, buttons, accents. Map to Tailwind classes or theme (e.g. brand-500, slate-700).
- **Components**: Buttons, inputs, cards, tables, nav, modals. Prefer Shadcn-style components when they fit.
- **Borders and shadows**: Rounded corners (rounded-md, rounded-lg), borders (border, border-slate-200), shadows (shadow-sm, shadow).

## 2. Match the Project Stack

- **Styling**: Tailwind CSS utility classes. Use existing theme (e.g. `brand-500`, `slate-*`) from `tailwind.config.js` when colors in the screenshot align.
- **Components**: Shadcn UI patterns and conventions. Responsive and accessible.
- **Structure**: React components, clear hierarchy; avoid inline styles unless necessary to match the screenshot exactly.

## 3. Implementation Steps

1. **Structure first**: Build the DOM/layout (sections, flex/grid) so the skeleton matches the screenshot.
2. **Spacing**: Apply padding/margin/gap to match the screenshot; use consistent scale (e.g. p-4, gap-6).
3. **Typography**: Set font sizes and weights to match visual hierarchy.
4. **Colors**: Apply background, text, and border colors; use semantic or theme classes where possible.
5. **Components**: Buttons, inputs, cards, etc. Style them to match the screenshot (size, radius, shadows).
6. **Details**: Borders, dividers, icons, alignment. Adjust until the result visually matches.

## 4. Verification

- Describe what was matched (layout, colors, key components).
- If the user says something is off, adjust that element (spacing, color, size) and re-check.
- For subtle differences, offer one concrete change (e.g. "Increase the gap to gap-8") and apply it.

## Tips

- **No screenshot in message**: Ask the user to attach or paste the screenshot they want replicated.
- **Partial match**: If only one section or component should match, implement that part and keep the rest consistent with the app.
- **Approximation**: Exact pixel match is not required; aim for same structure, proportions, and feel. Prefer Tailwind’s scale over arbitrary values.
