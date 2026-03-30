// Vercel auto-detects functions in the repo-root `api/` directory.
// This wrapper re-exports the actual handler so Vercel can find it.
export { default } from "../artifacts/cashbook/api/cashbooks";
