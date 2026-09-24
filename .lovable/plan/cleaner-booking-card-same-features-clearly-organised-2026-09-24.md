# Cleaner booking card: same features, clearly organised

Right now each booking shows about 12 buttons of different colours and sizes stacked on top of each other. Every feature stays: nothing is removed, only grouped into tidy, labelled menus so each one is still one or two taps away.

## New layout of each booking

```text
+------------------------------------------------+
| Maria Silva            Confirmed   Due €40     |
| Belém Tour · Fri 26 Sep · 10:00 · 4 guests     |
|                                                |
| [ Message guest v ]  [ Email v ]  [ ... More ] |
|                                                |
| Status: [ Confirmed v ]    [ Settle €40 ]      |
|                                                |
| > Tour day details (pickup, guide, vehicle)    |
+------------------------------------------------+
```

### 1. Three labelled menus holding every existing button
- **Message guest** (WhatsApp): WhatsApp customer, Review via WhatsApp, plus the ready-written guest messages.
- **Email**: Send confirmation, Send reminder, Ask for review, payment request, and every "Other email" template.
- **More (...)**: Copy message, Copy link, Edit / changes, Delete (in red, with a confirmation).

### 2. Status kept, just placed together
- The booking status dropdown ("Mark as confirmed") and the tour-day stage buttons (Upcoming, Confirmed, In progress, Completed, No show) both stay. They sit side by side under a small "Status" heading instead of being far apart.
- "Settle €X" appears next to them when money is still due.

### 3. Tour day details folded away
- Pickup, guide, vehicle and message history sit in one collapsible "Tour day details" section, closed by default, with a one-line summary when closed (for example "Pousada Alfama · Bayazid · TukTuk-Lion").
- The full pickup address and pickup fee stay visible inside the section, with an added "Map" link.

### 4. Consistent look
- Every button is the same height and style. Only the main action is filled, and colour is used only for money due (amber) and delete (red).
- On phones, the three menus sit side by side in one row that is easy to tap.

Nothing about how bookings, emails, payments or messages actually work changes. Only the layout changes.

## Technical notes
- Refactor the action area of `src/routes/admin.bookings.tsx` (lines ~700–970) into a `BookingActions` component that uses shadcn `DropdownMenu` for the Message, Email and More menus, reusing the existing `sendDirect`, `sendPaymentRequest`, `generatePaymentLink`, `toggleExpanded` and `remove` handlers.
- Merge the WhatsApp templates from `GuestMessageMenu` into the Message menu, with "Open chat" as its first item.
- Tour stage pills in `BookingOpsPanel` become a `Select`, and the status select merges into it. Both still write to the same fields as today.
- Wrap `BookingOpsPanel`, `BookingManagePanel` and `GuestMessageHistory` in a shadcn `Collapsible` with a summary line.
