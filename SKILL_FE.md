# SKILL_FE — Ragger Frontend Engineering

## Purpose

Build modern, production-ready UI for the **Ragger** frontend.

The frontend uses:

- Next.js `16.3.3`
- React `19.2.8`
- TypeScript `5.x`
- Tailwind CSS `4.x`
- `@base-ui/react`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `tw-animate-css`
- `lucide-react`
- `framer-motion`
- `react-markdown`
- `remark-gfm`
- `zod`
- Jest `30`
- React Testing Library

Primary goals:

- Fast implementation
- Modern UI
- Minimal code
- Strong TypeScript
- Reusable components
- Responsive design
- Accessibility
- Fewer bugs
- Easy maintenance

---

# 1. Core Rules

Before coding:

1. Inspect the existing project.
2. Check `package.json`.
3. Check the existing `app/` or `src/app/` structure.
4. Check existing components and styles.
5. Reuse existing components and utilities.
6. Follow existing naming conventions.
7. Do not introduce unnecessary libraries.
8. Do not replace the existing architecture without a reason.

Prefer the **smallest clean solution**.

---

# 2. Stack Rules

Use the existing Ragger stack.

Do not install another library when the current dependencies already solve the problem.

### Framework

Use:

```text
Next.js 16
React 19
TypeScript
```

Prefer Server Components.

Use `"use client"` only when required for:

- `useState`
- `useEffect`
- event handlers
- browser APIs
- client-only libraries
- interactive behavior

Do not make entire pages Client Components unnecessarily.

---

# 3. Styling

Use:

```text
Tailwind CSS 4
```

Use:

```text
clsx
tailwind-merge
class-variance-authority
```

when useful.

Use the existing design tokens and component patterns.

Avoid large custom CSS files for simple UI.

Avoid unnecessary inline styles.

Prefer:

```tsx
className="flex items-center gap-4"
```

over arbitrary values such as:

```tsx
className="gap-[17px]"
```

unless the exact value is required.

---

# 4. Modern UI

The UI should feel:

- Clean
- Modern
- Professional
- Minimal
- Premium
- Responsive
- Easy to scan

Prefer:

- Clear typography
- Consistent spacing
- Subtle borders
- Moderate rounded corners
- Small shadows where useful
- Clear hierarchy
- Meaningful icons
- Subtle hover states
- Good loading states
- Good empty states
- Good error states

Avoid:

- Excessive gradients
- Excessive shadows
- Excessive animations
- Excessive glassmorphism
- Too many colors
- Decorative UI without purpose
- Giant rounded containers everywhere

---

# 5. Responsive Design

Build mobile-first.

Every important screen must work on:

```text
Mobile
Tablet
Desktop
Large Desktop
```

Prefer responsive Tailwind classes:

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
```

Avoid unnecessary fixed widths.

Prefer:

```text
w-full
max-w-*
min-w-0
flex-1
```

for flexible layouts.

Always consider:

- Long text
- Small screens
- Horizontal overflow
- Large content
- Empty states
- Loading states

---

# 6. Component Architecture

Prefer simple reusable components.

Recommended structure:

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── layout/
│   └── features/
├── lib/
├── hooks/
├── types/
└── ...
```

### `components/ui`

Generic components:

```text
Button
Input
Card
Dialog
Badge
Tabs
Tooltip
Dropdown
```

### `components/layout`

Layout components:

```text
Header
Navbar
Sidebar
PageContainer
```

### `components/features`

Business-specific components:

```text
DocumentUpload
SearchResult
ChatMessage
SourceList
RagQuery
```

Do not create a component only to move a few JSX lines into another file.

---

# 7. Component Design

Components should have one clear responsibility.

Avoid giant components containing:

- API calls
- Complex state
- Business logic
- Validation
- Formatting
- Large JSX

all together.

Separate responsibilities when complexity requires it.

Do not over-engineer simple UI.

---

# 8. TypeScript

Use strong TypeScript.

Avoid:

```tsx
any
```

unless genuinely unavoidable.

Prefer:

```tsx
type SearchResult = {
  id: string;
  title: string;
  content: string;
  score: number;
};
```

Use explicit types for:

- API responses
- Component props
- Form data
- Shared state
- Utility functions

Do not duplicate types unnecessarily.

---

# 9. Props

Use clear props.

Example:

```tsx
type SearchResultProps = {
  title: string;
  content: string;
  score: number;
};
```

Avoid:

```tsx
type Props = any;
```

Do not pass huge objects when only a few values are needed unless it improves maintainability.

---

# 10. Icons

Use:

```text
lucide-react
```

Example:

```tsx
import { Search, Upload, FileText } from "lucide-react";
```

Do not manually create SVG icons when an appropriate Lucide icon exists.

Use icons consistently.

Do not use icons purely for decoration when they add no meaning.

---

# 11. Animation

Use:

```text
framer-motion
```

only when animation improves UX.

Good use cases:

- Dialog entrance
- Sidebar transitions
- Message appearance
- Expand/collapse
- Loading transitions
- Subtle page transitions

Avoid animating everything.

Animations should be:

- Short
- Subtle
- Functional

Respect reduced-motion preferences for substantial animations.

---

# 12. Markdown

Use:

```text
react-markdown
remark-gfm
```

for Markdown rendering.

Support:

- Headings
- Paragraphs
- Lists
- Links
- Code
- Tables
- Blockquotes
- Inline code

Do not manually parse Markdown.

---

# 13. Forms

Use `zod` for validation.

Example:

```tsx
const schema = z.object({
  query: z.string().min(1),
});
```

For simple forms, do not add unnecessary form libraries.

For complex forms, use an existing project solution if one exists.

Forms should provide:

- Label
- Input
- Validation
- Loading state
- Error state
- Success feedback when appropriate

---

# 14. API Integration

Keep API communication separate from UI when practical.

Prefer:

```text
Component
   ↓
API function
   ↓
Backend
```

Example:

```tsx
const results = await searchDocuments(query);
```

Instead of repeating raw `fetch()` logic across components.

Create reusable API functions when an endpoint is used in multiple places.

---

# 15. API Types

Type API boundaries.

Example:

```tsx
type SearchRequest = {
  query: string;
  top_k?: number;
};

type SearchResponse = {
  results: SearchResult[];
};
```

Do not assume API responses are correct.

Validate external/untrusted data when appropriate.

Use `zod` when runtime validation is needed.

---

# 16. API States

Every API-driven UI should consider:

```text
Loading
Success
Empty
Error
```

Example:

```text
Loading → Skeleton

Success → Results

Empty → Helpful empty state

Error → User-friendly error message
```

Never leave the UI blank while an important request is loading.

Do not show backend stack traces to users.

---

# 17. Loading States

Use skeletons for content-heavy screens.

Use spinners for short actions.

Example:

```text
Search → Searching...
Upload → Uploading...
Generate → Generating...
```

Prevent duplicate submissions when necessary.

Do not freeze unrelated parts of the UI.

---

# 18. Empty States

Use meaningful empty states.

Bad:

```text
No data.
```

Better:

```text
No documents found

Upload a document to start searching your knowledge base.
```

Provide an action when useful.

---

# 19. Error States

Errors should be understandable.

Bad:

```text
Error 500
```

Better:

```text
Something went wrong

We couldn't load your documents. Please try again.
```

Log technical details appropriately, but do not expose internal implementation details to users.

---

# 20. Accessibility

Use semantic HTML.

Prefer:

```html
button
nav
main
header
section
form
label
```

Do not use `div` for every interactive element.

Interactive elements must be keyboard accessible.

Inputs must have labels.

Provide visible focus states.

Do not rely only on color to communicate state.

Images need appropriate `alt` text.

---

# 21. Next.js App Router

Use the App Router.

Prefer:

```text
Server Component
```

by default.

Use Client Components only when needed.

Use Next.js features appropriately:

- `Link`
- `Image`
- Metadata
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`

Avoid unnecessary client-side JavaScript.

---

# 22. Routing

Keep routes predictable.

Example:

```text
app/
├── page.tsx
├── documents/
│   └── page.tsx
├── search/
│   └── page.tsx
└── chat/
    └── page.tsx
```

Use Next.js routing.

Do not manually manipulate URLs when Next.js routing utilities can handle it.

---

# 23. State Management

Do not introduce global state unnecessarily.

Prefer:

```text
Local UI state → useState
URL state → searchParams
Server data → Server Components / API
Shared client state → only when genuinely necessary
```

Do not introduce a state-management library unless the project actually needs one.

---

# 24. Security

Never expose secrets in frontend code.

Never put these in Client Components:

```text
OPENAI_API_KEY
COHERE_API_KEY
DATABASE_URL
REDIS_URL
PRIVATE_API_KEY
SECRET_KEY
```

The frontend should communicate with the backend through safe API boundaries.

Only intentionally public environment variables should be exposed to the browser.

---

# 25. Environment Variables

Do not hard-code production configuration.

Avoid:

```tsx
const API_URL = "http://localhost:8000";
```

Prefer environment configuration:

```text
NEXT_PUBLIC_API_URL
```

Use `NEXT_PUBLIC_` only for values safe to expose to browsers.

---

# 26. Performance

Prioritize:

- Server Components
- Minimal Client Components
- Small client bundles
- Optimized images
- Lazy loading where useful
- Avoiding unnecessary re-renders
- Avoiding unnecessary dependencies

Use `framer-motion` and `three` carefully because they can increase client-side work.

Do not use Three.js unless the UI genuinely requires 3D.

Do not optimize prematurely.

---

# 27. Three.js

The project contains:

```text
three
@types/three
```

Use Three.js only for intentional 3D experiences.

If 3D is not required, do not add it.

Keep 3D code isolated from ordinary UI components.

Prefer lazy loading for large 3D experiences.

---

# 28. Base UI

The project contains:

```text
@base-ui/react
```

Prefer existing Base UI primitives when they match the required interaction.

Do not introduce another component library for dialogs, popovers, menus, etc. when the existing stack can provide them.

---

# 29. Code Reuse

Before creating a new component, search for an existing one.

Before creating a utility, search `lib/` and existing helpers.

Before creating a type, search existing types.

Avoid duplicate:

- Buttons
- Modals
- API functions
- Formatting functions
- Validation logic
- Types
- Layouts

---

# 30. Code Generation

When generating code:

1. Inspect the existing code first.
2. Reuse existing components.
3. Reuse existing utilities.
4. Reuse existing types.
5. Keep the implementation small.
6. Avoid unnecessary dependencies.
7. Avoid unnecessary files.
8. Avoid duplicate logic.
9. Use strong TypeScript.
10. Handle loading/error/empty states.
11. Make the UI responsive.
12. Follow the existing project style.

Prefer one clean implementation over multiple abstraction layers.

---

# 31. Fast Edit Rule

When modifying an existing feature:

```text
Find
  ↓
Understand
  ↓
Edit the smallest required area
  ↓
Validate
```

Do not rewrite the entire file when a small change is enough.

Do not refactor unrelated code during a feature fix.

Keep diffs focused.

---

# 32. Error Prevention

Before completing a change, check:

```text
TypeScript
ESLint
Build
Tests when relevant
```

Use:

```bash
npm run lint
npm run build
npm test
```

when appropriate.

Fix the root cause.

Avoid:

```tsx
// @ts-ignore
```

unless absolutely necessary.

Do not disable ESLint rules just to make the build pass.

---

# 33. Testing

Use:

```text
Jest
React Testing Library
```

Test user behavior.

Prioritize:

- Form submission
- Validation
- Important interactions
- Loading states
- Error states
- Empty states
- Critical rendering behavior

Avoid testing implementation details unnecessarily.

---

# 34. UI Quality Checklist

Before completing a UI task:

- [ ] Desktop layout works
- [ ] Mobile layout works
- [ ] Typography hierarchy is clear
- [ ] Spacing is consistent
- [ ] Buttons have proper states
- [ ] Inputs have proper states
- [ ] Loading state exists
- [ ] Error state exists
- [ ] Empty state exists
- [ ] Hover state works
- [ ] Focus state works
- [ ] Keyboard interaction works
- [ ] Long text does not break layout
- [ ] No unnecessary horizontal overflow
- [ ] No console errors

---

# 35. Final Principle

Build the **simplest UI that looks modern, works correctly, and is easy to maintain**.

Optimize for:

```text
Less code
+
Better components
+
Strong TypeScript
+
Consistent UI
+
Responsive design
+
Fewer bugs
```

Avoid:

```text
Unnecessary libraries
+
Duplicate components
+
Huge components
+
Unnecessary client state
+
Unnecessary animations
+
Hard-coded configuration
+
Over-engineering
```

The goal is not to generate more code.

The goal is to generate **the right code with the fewest moving parts**.
