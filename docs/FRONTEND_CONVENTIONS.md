# Frontend Conventions

High-level objectives and defaults for frontend work. Prefer these over one-off custom solutions unless there is a clear reason to deviate.

## Styling

- Use Tailwind v4 utility classes.
- Use the project's conditional class helper for dynamic classes.
- Use the project's design tokens for colors, surfaces, and borders.

## Components

- Prefer the project's UI components over custom HTML primitives.
- Keep components self-contained and colocated with their routes or pages when possible.

## Icons

- Use the project's icon set through the shared icon exports.

## Routing and navigation

- Use the project's file-based routing convention.
- Use the router's navigation primitives for links, redirects, and route matching instead of native links or manual URL manipulation.

## State

- Use the project's server-state hooks for data fetching and mutations.
- Use shared contexts only for cross-cutting client state that does not belong in server cache.
- Invalidate server state after successful mutations.

## Auth

- Rely on the existing auth query/mechanism; do not re-implement session checks.

## PWA

- Use the existing PWA update prompt; do not add custom service worker logic.

## Testing

- Use the project's provider wrapper for component tests.
- Keep tests close to the code they test.
