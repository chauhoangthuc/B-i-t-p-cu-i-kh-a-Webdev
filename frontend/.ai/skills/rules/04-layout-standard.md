# Rule 04: Base Layout & Screen Dimension Standard

## Standard Reference (Home / Dashboard Baseline)
- **Primary Canvas Width:** All feature pages must follow the master dimension of the **Home/Dashboard** layout (Standard container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` or full-screen flex shell).
- **Height & Scrolling Rules:** 
  - Prevent erratic vertical stretching. Main page wrappers must use a controlled viewport layout (`min-h-screen bg-slate-50 flex flex-col`).
  - Content sections must use standard inner wrappers with proper padding, avoiding unconstrained vertical growth unless explicitly designed as a continuous scroll feed.
- **Grid / Flex Balance:** Maintain a balanced grid system (e.g., sidebar + main content area or 12-column grid) consistent with the Dashboard baseline, rather than letting raw Stitch exports stretch elements arbitrarily.