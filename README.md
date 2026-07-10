# Relay Maintenance Dispatcher

AI maintenance dispatch for small landlords.

Relay helps small landlords stop acting as the manual middleman between tenants and contractors. Tenants submit requests through a property-specific link, AI triages the issue, the landlord approves dispatch, contractors propose appointment times, and tenants confirm from a public status page.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- OpenAI for structured ticket analysis
- Twilio for SMS notifications
- Resend for optional contractor emails

## Features

- Property-specific tenant maintenance request links
- File uploads for maintenance tickets
- AI-generated title, urgency, trade, summaries, missing info, recommended contractor, confidence, and next step
- Landlord login and dashboard
- Property/unit onboarding
- Ticket detail view with tenant info, photos, AI triage, dispatch controls, scheduling, status, and activity timeline
- Contractor management
- Landlord-approved contractor dispatch
- Contractor job page with Accept, Decline, Request More Info, Propose Time, and Mark Complete actions
- Tenant status page with appointment confirmation

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Start the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

Required for end-to-end Supabase flows:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional for AI and email:

```env
OPENAI_API_KEY=
RESEND_API_KEY=
EMAIL_FROM=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` is your Supabase project URL, for example `https://your-project-ref.supabase.co`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` can use the Supabase publishable/anon key.
- `SUPABASE_SERVICE_ROLE_KEY` should use the Supabase secret/service-role key and must stay server-side.
- `OPENAI_API_KEY` is optional. If it is blank or the API call fails, the app uses fallback ticket analysis.
- `TWILIO_*` variables are optional for local testing. If they are blank, workflow actions still work, but no real SMS is sent.
- `RESEND_API_KEY` and `EMAIL_FROM` are optional. If they are blank, contractor dispatch still works, but no real email is sent.
- `EMAIL_FROM` generally needs to be an address on a verified Resend sending domain.

## Supabase Setup

Create a Supabase project, then run the SQL in:

```text
supabase/schema.sql
```

If you are rebuilding from an older local/test schema, run this first:

```text
supabase/dev-reset.sql
```

That reset file deletes existing Relay app data and should only be used for development.
Supabase does not allow direct SQL deletion from Storage tables, so remove old files from the `ticket-files` bucket in the Storage dashboard if you need a completely clean file store.

That creates:

- `landlords`
- `properties`
- `units`
- `tenants`
- `contractors`
- `maintenance_tickets`
- `ticket_files`
- `ticket_messages`
- `ticket_events`
- `appointment_proposals`
- private Storage bucket: `ticket-files`

Create at least one Supabase Auth user for landlord login:

1. Open the Supabase dashboard.
2. Go to Authentication.
3. Add a user with email and password.
4. Use that account at `/login`.

The app upserts a matching `landlords` row after login.

## Main Routes

```text
/                       Home
/request/[propertySlug] Property tenant request form
/request/success        Tenant request confirmation
/status/[token]         Tenant status and scheduling page
/login                  Landlord login
/dashboard              Landlord ticket dashboard
/dashboard/contractors  Contractor management
/dashboard/properties   Property setup and request links
/dashboard/tickets/[id] Ticket detail
/contractor/job/[token] Public contractor job page
```

## Testing The MVP Flow

1. Log in and create a property at `/dashboard/properties`.
2. Open the generated `/request/[propertySlug]` link.
3. Submit a maintenance request.
4. Add contractors at `/dashboard/contractors`.
5. Open `/dashboard` and view the ticket.
6. Open the ticket detail page.
7. Approve dispatch to a contractor.
8. Open the contractor job link at `/contractor/job/[token]`.
9. Test Accept, Decline, Request More Info, Propose Time, and Mark Complete.
10. Open the tenant status page at `/status/[token]` and confirm a proposed time.

If SMS/email is not configured, inspect the ticket's `contractor_token` in Supabase and manually open:

```text
http://localhost:3000/contractor/job/YOUR_CONTRACTOR_TOKEN
```

## Quality Checks

Run:

```bash
npm run qa
```

This runs linting and a production build.

## Security Notes

- Do not commit `.env.local`.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client components or browser code.
- Public contractor links use a random `contractor_token`; treat those URLs as bearer links.
- Tenant status links use random bearer tokens.
- This is an MVP. Before production, tighten RLS policies, add stronger role ownership checks, improve email delivery/error handling, and add rate limiting on public forms.
