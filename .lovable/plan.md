# Quick Booking flexibility upgrade

## What will change
- Restyle the Quick Booking popup to match the cleaner booking panel shown in the second reference: cancellation notice, full-width date field, time grid, traveler stepper, optional hotel pickup, and clear price summary.
- Add an “Other time” choice with an accessible time input so guests can request any valid start time, while retaining the common preset times.
- Remove the seven-person booking ceiling across both booking experiences and their server validation, while keeping the existing two-person minimum for per-person tours.
- Keep all current duration pricing, discounts, pickup pricing, WhatsApp reservation, PayPal checkout, availability checks, and booking snapshots working.

## Safety and validation
- Use a high technical safety limit to prevent abusive input, without presenting a customer-facing maximum.
- Validate custom times in 24-hour `HH:MM` format and save/send the chosen time everywhere the current preset time is used.
- Check mobile layout, totals for larger groups, preset/custom time switching, and checkout validation.

## Technical details
- Update both `BookingModal` and `TourBookingPanel` so quick and full booking stay consistent.
- Update shared pricing and server validators so guest totals are not silently clamped back to seven.
- Adapt availability checks for custom times without exposing customer booking data.
