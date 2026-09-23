# Admin panel: what to add next

Your panel already covers bookings, day sheet, payments, reconciliation, commission, inbox, tours, content, reviews, lead finder, push alerts and team roles. These are the gaps that would help most, starting with the biggest win.

## 1. Reports page (high value)
- Revenue by month, by tour, and by booking source (website, WhatsApp, partner, walk-in)
- Top tours, average group size, busiest days and times
- Guide performance: tours run, cash collected, commission owed
- Export to CSV or PDF for your accountant

## 2. Automatic review requests (high value)
- 2 hours after a tour ends, the guest gets an email or WhatsApp link asking for a review
- The review arrives in Reviews for you to approve, with a one-tap link to also post on Google or TripAdvisor

## 3. Guest messages before the tour (high value)
- Automatic reminder the day before, with the meeting point, map pin, guide name and phone
- One-tap "Driver is here" and "Running late" messages from the booking
- Weather alert with a free rebooking option

## 4. Availability and blocked dates
- Block days, times or vehicles for holidays, repairs or private events
- Cap how many tuk tuks can go out per time slot so you never overbook

## 5. Guide mobile view
- Guides log in and see only their own tours for today, the pickup point and guest phone
- They mark "Started", "Finished" and "Cash collected", which goes straight into reconciliation

## 6. Recovering unfinished bookings
- A list of guests who started checkout but didn't pay
- One-tap follow-up by email or WhatsApp with an optional small discount

## 7. Smaller clean-ups
- Merge "Messages" and "Leads & chats" into one Inbox
- Global search at the top: find any booking, guest or phone number from any page
- Dashboard shows this week vs last week

## Suggested order
1. Reports  2. Review requests  3. Guest reminders  4. Availability  5. Guide view  6. Unfinished bookings  7. Clean-ups

Approve this, then tell me which numbers to build first. If you don't choose, I'll start with 1 to 3.

## Technical notes
- Reports: server functions aggregating bookings, booking_payments, orders and ops_staff; charts with recharts.
- Review requests and reminders: a scheduled endpoint under /api/public with a secret check, sending through the existing email queue plus wa.me links; tokenised review links.
- Availability: new blackout/capacity tables with grants and RLS, checked in checkout and the public bookings API.
- Guide view: a "staff" role scoped to their assigned bookings through RLS.
