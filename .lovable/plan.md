## Scope

Preserve existing design system, tokens, and component styles. All data stays in `localStorage`/`sessionStorage`. Reuse `PageHeader`, `Card`, `Badge`, `Button`, `DataTable`, `StatusPill`.

## Admin

### Courses (`admin.courses.tsx`)
- Remove "New course" button and dialog; remove `onEdit` from DataTable.
- `onView` → `navigate({ to: "/admin/courses/$id", params: { id } })`.
- New route `admin.courses.$id.tsx`: read-only detail (cover banner, title, category/level badges, instructor, price, students, rating, hours, lessons, status pill, description, updated date). Back link to `/admin/courses`.

### Categories (`admin.categories.tsx`)
- Add `image?: string` (data URL) to `Category` type in `mock-data.ts`.
- Form: add `<input type="file" accept="image/*">` with FileReader → base64 preview. Save into row and persist to `localStorage` via new keys in `lms-storage.ts` (`lms.admin.categories`).
- Table: first column shows uploaded image thumbnail when present, else existing colored tag icon fallback.

### Subscriptions (`admin.subscriptions.tsx`)
- Add `onView` navigating to new route `admin.subscriptions.$id.tsx`.
- Detail page: customer, plan badge, status pill, amount/mo, renews date, plan features list, billing summary card — all read-only.

### Payments (`admin.payments.tsx`)
- Add `onView` navigating to new route `admin.payments.$id.tsx`.
- Extend `Payment` mock with derived `course` and `teacher` (map by index from courses list). Add simulated `transactionId` and readable `method` detail (e.g. "Visa •••• 4242").
- Detail page card grid: Payment ID, Student, Course, Teacher, Amount, Status pill, Date, Method, Transaction Details.

## Client / Course purchase flow

### `courses.$id.tsx`
- "Enroll now" → if free, enroll and go to `/orders/$id/confirmation`; if paid, navigate to `/checkout/$courseId`.
- "Add to wishlist" → toggle via existing `toggleWishlist`; toast feedback.

### New storage helpers (`lms-storage.ts`)
- `orders`: `{ id, courseId, amount, status: 'paid'|'failed', method, txId, date, invoice }[]` in `localStorage` (`lms.orders`).
- `sessionStorage` key `lms.checkout` holds in-progress `{ courseId, method, cardLast4 }`.
- Helpers: `getOrders`, `addOrder`, `getOrder(id)`, `setCheckout`, `getCheckout`, `clearCheckout`.

### New routes (SiteLayout, reuse existing components)
- `checkout.$courseId.tsx` — order summary card (course + price + tax placeholder) and "Continue to payment" → `/payment/$courseId`.
- `payment.$courseId.tsx` — simulated form (name on card, number, expiry, CVC) with method radio (Card/PayPal). "Pay now" simulates: 90% success → create order, enroll, navigate `/orders/$id/success`; failure path via secondary "Simulate failure" → `/orders/$id/failed`.
- `orders.$id.success.tsx` — success card, order summary, buttons to "View receipt", "Go to my courses".
- `orders.$id.failed.tsx` — failure card, "Retry payment" back to `/payment/$courseId`, "Back to course".
- `orders.$id.confirmation.tsx` — enrollment + order summary combined (used for free courses and as post-payment landing linked from success).
- `orders.$id.receipt.tsx` — printable-styled invoice/receipt card (invoice #, date, buyer, line items, total, method, txId). Print button uses `window.print()`.
- `dashboard.student.orders.tsx` — "My orders / Purchase history" table (invoice, course, amount, status, date) with row view → receipt. Add sidebar link in student dashboard nav.

### Client button audit
- Sweep `courses.index.tsx`, `pricing.tsx`, `about.tsx`, `contact.tsx`, `index.tsx`, Navbar/Footer for inert buttons; wire each to a `Link` or toast/action. Contact form submit → toast + reset. Pricing "Choose plan" → toast "Coming soon" or link to `/register`.

## Technical Notes

- Only frontend; no backend, no new deps.
- Reuse `PageHeader`, `Card`, `Badge`, `Button`, `StatusPill`, `DataTable`, `EmptyState`.
- Image uploads: FileReader → data URL, stored in localStorage under `lms.admin.categories`. Add a size guard (~500KB) with toast if exceeded.
- All new routes register in file-based routing; `createFileRoute` paths match filenames exactly.
- Each new client route sets its own `head()` with title + description; dashboard routes stay `noindex`.
- Responsive: all detail pages use the same 1-col mobile → 2-col md grid pattern already used across dashboard/detail pages.
