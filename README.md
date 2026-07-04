# Relay Maintenance Coordinator

AI-assisted maintenance coordination for landlords, tenants, and contractors.

This is a Next.js TypeScript MVP that lets tenants submit maintenance requests, landlords triage and assign tickets, and contractors update job status from a public job link.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- OpenAI for structured ticket analysis
- Resend for contractor emails

## Features

- Public tenant maintenance request form
- File uploads for maintenance tickets
- AI-generated ticket title, category, urgency, summary, missing info, tenant follow-up, and contractor message
- Landlord login and dashboard
- Ticket detail view with tenant info, files, AI triage, status, and activity timeline
- Contractor management
- Send-to-contractor workflow
- Public contractor job page with Accept, Decline, Request More Info, and Mark Complete actions

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
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` is your Supabase project URL, for example `https://your-project-ref.supabase.co`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` can use the Supabase publishable/anon key.
- `SUPABASE_SERVICE_ROLE_KEY` should use the Supabase secret/service-role key and must stay server-side.
- `OPENAI_API_KEY` is optional. If it is blank or the API call fails, the app uses fallback ticket analysis.
- `RESEND_API_KEY` and `EMAIL_FROM` are optional. If they are blank, contractor assignment still works, but no real email is sent.
- `EMAIL_FROM` generally needs to be an address on a verified Resend sending domain.

## Supabase Setup

Create a Supabase project, then run the SQL in:

```text
supabase/schema.sql
```

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
/request                Public tenant request form
/request/success        Tenant request confirmation
/login                  Landlord login
/dashboard              Landlord ticket dashboard
/dashboard/contractors  Contractor management
/dashboard/tickets/[id] Ticket detail
/jobs/[token]           Public contractor job page
```

## Testing The MVP Flow

1. Go to `/request`.
2. Submit a maintenance request.
3. Log in at `/login` with a Supabase Auth user.
4. Open `/dashboard` and view the ticket.
5. Add a contractor at `/dashboard/contractors`.
6. Open the ticket detail page.
7. Click `Send to Contractor`.
8. Open the contractor job link at `/jobs/[token]`.
9. Test Accept, Decline, Request More Info, and Mark Complete.

If email is not configured, inspect the ticket's `public_token` in Supabase and manually open:

```text
http://localhost:3000/jobs/YOUR_PUBLIC_TOKEN
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
- Public contractor links use a random `public_token`; treat those URLs as bearer links.
- This is an MVP. Before production, tighten RLS policies, add stronger role ownership checks, improve email delivery/error handling, and add rate limiting on public forms.
