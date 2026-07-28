# Rule 01: Component Architecture & Directory Structure

## Feature-Based Organization
All code must reside within feature modules to maintain high modularity:
src/
  features/
    [feature-name]/
      components/    # UI pieces specific to this feature
      hooks/         # Custom hooks (React Query/Zustand)
      services/      # API communication layer
      types/         # TypeScript interfaces & types
      index.ts       # Public API export for the feature

## Component Conventions
- **Naming:** PascalCase for component files and folders (e.g., `TripCard.tsx`).
- **Function Declaration:** Use standard ES6 arrow functions or regular functions with explicit return types:
  ```tsx
  export interface TripCardProps {
    id: string;
    title: string;
    destination: string;
  }

  export function TripCard({ id, title, destination }: TripCardProps) {
    return (...);
  }