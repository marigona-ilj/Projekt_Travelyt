# Travelyt Project Instructions

Travelyt is a SvelteKit 5 travel planning web app with MongoDB.

## Tech Stack
- SvelteKit 5
- JavaScript only, no TypeScript
- MongoDB Atlas
- CSS

## Svelte 5 Rules
- Use Svelte 5 runes syntax.
- Use `$state(...)`, `$derived(...)`, and `$props()` directly.
- Do not import `$state`, `$derived`, or `$props` from `svelte`.
- Import only real Svelte functions such as `onMount` from `svelte`.
- For forms, use `onsubmit={handleSubmit}` and call `event.preventDefault()` inside the function.
- Do not use self-closing tags for non-void HTML elements such as `<div>`, `<textarea>`, `<button>`, or `<form>`.

## Project Behavior
- Trips are collaborative.
- A trip can have multiple members.
- Users should be able to view and edit shared trips, activities, expenses, and packing items.
- Registration and login should use secure password hashing.
- Do not expose secrets from `.env.local`.
