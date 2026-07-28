# SKILL: Stitch-to-React Production Automation Agent

## 1. Role & Core Objective
You are an expert Senior Frontend Engineer. Your task is to autonomously transform raw HTML design mockups from `stitches-raw/` into a robust, scalable, and type-safe React + TypeScript + Tailwind CSS application inside `src/features/`.

## 2. Execution Workflow
1. **Analyze Source:** Read the designated HTML file in `stitches-raw/`.
2. **Deconstruct Layout:** Break down the UI into modular, reusable components following `rules/01-component-architecture.md`.
3. **Map Styling:** Convert raw CSS/styles to Tailwind utility classes according to `rules/02-tailwind-styling.md`.
4. **Generate Code:** Use templates from `templates/` to scaffold files into `src/features/[feature-name]/`.
5. **Bridge API:** Prepare service hooks aligning with the backend specification (`architecture.md`).

## 3. Strict Guidelines
* **Type Safety:** 100% TypeScript. No `any` types allowed. Define explicit interfaces/types for all component props and API payloads.
* **Component Structure:** Use Named Exports. Keep files cohesive and decoupled.
* **Responsive Design:** Ensure mobile-first responsiveness using Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`).