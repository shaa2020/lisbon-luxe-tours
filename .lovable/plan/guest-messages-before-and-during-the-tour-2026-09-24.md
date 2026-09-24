# Guest messages before and during the tour

Goal: every guest knows exactly where to go, who is picking them up and when, without you typing the same message again and again.

## What gets added

### 1. Automatic reminder the day before
- Sent at 6pm Lisbon time the evening before the tour, by email (automatic) and as a ready-to-send WhatsApp message
- Includes: tour name, date and time, meeting point with a Google Maps link, guide name and phone, balance still due, and what to bring
- Only goes to confirmed bookings. If a booking is cancelled, the reminder isn't sent

### 2. One-tap messages from each booking
Inside every booking (and on today's departure board) you get buttons that open WhatsApp with the message already written:
- "Your guide is on the way"
- "Your driver is here" (with the meeting point pin)
- "Running about 10 minutes late"
- "Thank you, here's your review link" (after the tour)
The guest's name, tour, time, guide and place are filled in for you.

### 3. Rain / weather message
- A "Weather alert" button on the booking sends a friendly message offering a free date change or a covered tuk tuk option, with a link to reply

### 4. Edit the wording yourself
- New "Guest messages" area under Inbox → Emails where you can change the text of each message in English (and add Portuguese, Spanish or French versions)
- Placeholders like {guest_name}, {tour}, {time}, {meeting_point}, {guide_name}, {guide_phone}, {balance_due}

### 5. History on the booking
- Each booking shows which messages went out, when, and by whom, so the team doesn't send the same thing twice

## How you'll use it
1. Assign a guide and meeting point to the booking (as you do now)
2. The day-before reminder goes out by itself
3. On tour day, tap "Driver is here" or "Running late" from the day sheet

## Worth knowing
- WhatsApp messages open in your WhatsApp with the text ready, and you press send. Sending WhatsApp fully automatically needs a WhatsApp Business API account (paid, from Meta). That can be added later.
- Emails are fully automatic using your existing email setup.

## Technical notes
- New table `guest_message_templates` (key, language, subject, body) and `guest_message_log` (booking_id, template, channel, sent_by, sent_at), with grants and admin-only RLS.
- Day-before reminder: a daily scheduled call (once a day at 17:00 UTC) to a protected `/api/public/cron/tour-reminders` route that picks tomorrow's confirmed bookings with no reminder logged and queues emails through the existing email queue. Once a day means almost no extra running cost.
- WhatsApp buttons build `wa.me` links from the template with placeholders filled from booking, ops_staff and meetup_points, and write a log row on tap.
- Buttons added to the booking details, the bookings list row actions, and DashboardToday.
