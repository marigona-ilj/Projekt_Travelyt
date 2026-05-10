# Travelyt – Handoff Notes (2026-05-10)

## Current Project State

Travelyt is a SvelteKit 5 + MongoDB Atlas travel planning prototype. The app is fully functional and running locally at `http://localhost:5173`.

## What Works

- **Auth** – Register and login with bcryptjs hashing. Session stored as `userId` cookie (HttpOnly, 30-day). Logout clears cookie. Auth gate in `+layout.svelte` redirects unauthenticated users to `/auth`.
- **Trips** – Create, list, view, and delete trips. Each trip has title, destination, start/end dates, description, and a **currency** (default CHF). Currency is selectable from a dropdown (CHF, EUR, USD, GBP, JPY, CAD, AUD, SEK, NOK, DKK).
- **Activities** – Add, check off, and delete activities per trip.
- **Packing List** – Shared items visible to all members. Private items ("Keep private") visible only to creator. Only item creator can delete their item.
- **Budget/Expenses** – Add expenses with description, amount, date, and "Paid by" (dropdown for group trips). Settlement calculation shows who owes whom using a greedy fair-share algorithm. All amounts formatted with selected currency.
- **Members** – Any trip member can invite others by username. Owner sees a "Remove" button. Members tab shows roles (owner/member).
- **Navbar** – Header with My Trips, Profile, Settings. Active page highlighted. Logout button.

## Files Changed (from base)

| File | What changed |
|------|-------------|
| `src/routes/+layout.svelte` | Auth gate + child rendering fix + active nav |
| `src/routes/+page.svelte` | Redirect to /trips |
| `src/routes/auth/+page.svelte` | Removed bad $state import, fixed redirect |
| `src/routes/trips/+page.svelte` | Currency dropdown in new trip form |
| `src/routes/trips/[tripId]/+page.svelte` | Members tab, currentUserId, isOwner, currency prop |
| `src/routes/profile/+page.svelte` | New – shows name + email |
| `src/routes/settings/+page.svelte` | New – placeholder |
| `src/routes/api/auth/+server.js` | Register now sets cookie; GET returns full user |
| `src/routes/api/trips/+server.js` | Currency stored and returned |
| `src/routes/api/trips/[tripId]/+server.js` | Currency returned |
| `src/routes/api/trips/[tripId]/members/+server.js` | Any member can invite (not owner-only) |
| `src/routes/api/trips/[tripId]/packing/+server.js` | isPrivate + createdBy fields |
| `src/routes/api/trips/[tripId]/packing/[itemId]/+server.js` | Only creator can delete; any member can toggle |
| `src/lib/components/Header.svelte` | Full rewrite – navbar |
| `src/lib/components/TripCard.svelte` | onclick prop forwarded |
| `src/lib/components/MemberList.svelte` | New component |
| `src/lib/components/PackingList.svelte` | Shared/private sections, Svelte 5 runes |
| `src/lib/components/ExpenseList.svelte` | Full rewrite – group expenses + settlement |
| `src/lib/components/ActivityList.svelte` | Fixed Svelte 5 runes ($state import removed, $derived) |

## MongoDB

- Cluster: `cluster0.tkieaga.mongodb.net` (existing Atlas M0 free tier)
- Database: `travelyt`
- Collections: `users`, `trips`, `tripMembers`, `activities`, `expenses`, `packingItems`
- Connection string is in `travelyt/.env.local` (direct shard connection, not SRV — required workaround for Windows Node.js DNS issue)
- `.env.local` is NOT committed to git

## Auth Status

- Cookie-based session, `userId` stored in MongoDB ObjectId format
- Two accounts tested: first account is trip owner; second account can be added as member
- To test with two accounts simultaneously: use normal browser + incognito window (same browser overwrites the cookie)

## Known Limitations / Next Steps

1. **Settings page** – currently a placeholder; could add language/theme preferences
2. **Session expiry handling** – if cookie expires, API returns 401 but the UI doesn't redirect; add a 401 interceptor
3. **Old trips have no currency** – trips created before the currency feature was added will always show CHF (no migration done)
4. **Accessibility** – some `<label>` elements in ExpenseList/profile missing `for` attributes
5. **No email invite** – member invite is by username only; no email flow
6. **No trip editing** – PUT endpoint exists in the API but no UI to edit a trip after creation
