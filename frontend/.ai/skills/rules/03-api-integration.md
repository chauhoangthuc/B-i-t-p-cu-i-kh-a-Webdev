# Rule 03: API Integration & Data Fetching Standards

## 1. Service Layer Structure
- Every feature must isolate its API calls inside a dedicated `services/` or `api/` folder.
- Never hardcode fetch URLs inside UI components. Use a centralized HTTP client (e.g., Axios instance or fetch wrapper with base URL configured).

## 2. Data Fetching & State Management
- Use modern data fetching patterns (e.g., React Query / TanStack Query or native custom hooks) to handle loading states, caching, error handling, and data mutations.
- Define strict TypeScript interfaces for request payloads and response objects matching the Prisma database schema and backend endpoints.

## 3. Mock vs. Real API Transition
- During initial UI conversion from Stitch mockups, if the backend route is not yet active, use structured mock data structured identically to the expected API response.
- Clearly annotate placeholders where real endpoints (e.g., matching `architecture.md` routes) should be plugged in.