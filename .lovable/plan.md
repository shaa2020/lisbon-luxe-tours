# Cleaner booking card: fewer buttons, clear groups

Right now each booking shows about 12 buttons of different colours and sizes stacked on top of each other, with some doing the same job (WhatsApp appears 3 times, review requests twice). The goal is one clear main action, with everything else tucked into tidy menus.

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

### 1. Three action menus instead of 12 buttons
- **Message guest** (WhatsApp): chat, tomorrow reminder, guide on the way, driver is here, running late, weather alert, review request. This replaces the separate "WhatsApp customer" and "Review via WhatsApp" buttons.
- **Email**: send confirmation, send reminder, ask for review, payment request, and all other email templates. This replaces the blue confirmation button, reminder, review and the "Other email + Send" row.
- **More (...)**: copy message, copy payment link, edit / changes, delete (shown in red, with a confirmation).

### 2. One status control
- A single "Status" dropdown (New, Confirmed, Completed, No show, Cancelled) instead of both "Mark as confirmed" and the separate row of status pills lower down.
- "Settle €X" appears next to it only when money is still due.

### 3. Tour day details folded away
- Pickup, guide, vehicle and message history sit in one collapsible "Tour day details" section, closed by default, with a one-line summary when closed (for example "Pousada Alfama · Bayazid · TukTuk-Lion").
- The long pickup address is shortened to the hotel name with a "Map" link.

### 4. Consistent look
- Every button is the same height and style. Only the main action is filled, and colour is used only for money due (amber) and delete (red).
- On phones, the three menus sit side by side in one row that is easy to tap.

Nothing about how bookings, emails, payments or messages actually work changes. Only the layout changes.

## Technical notes
- Refactor the action area of `src/routes/admin.bookings.tsx` (lines ~700–970) into a `BookingActions` component that uses shadcn `DropdownMenu` for the Message, Email and More menus, reusing the existing `sendDirect`, `sendPaymentRequest`, `generatePaymentLink`, `toggleExpanded` and `remove` handlers.
- Merge the WhatsApp templates from `GuestMessageMenu` into the Message menu, with "Open chat" as its first item.
- Tour stage pills in `BookingOpsPanel` become a `Select`, and the status select merges into it. Both still write to the same fields as today.
- Wrap `BookingOpsPanel`, `BookingManagePanel` and `GuestMessageHistory` in a shadcn `Collapsible` with a summary line.
