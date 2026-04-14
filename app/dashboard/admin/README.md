# Admin Dashboard

## How to add a new tab
1. Copy `/tabs/_template.tsx` → rename to `/tabs/your-tab.tsx`
2. Follow the STEP comments inside the file
3. Add one line to `ADMIN_TABS` in `page.tsx`:
   ```ts
   { id: 'my-tab', label: 'My Tab', component: MyTab }
   ```

## How to add a stat card
Add one object to `STAT_CARDS` in `overview.tsx`. No other file changes.

## How to add a table column
Add one object to `COLUMNS` in the relevant tab file. No other file changes.

## File map
| File | Purpose |
|---|---|
| `page.tsx` | Tab shell only — no business logic |
| `tabs/overview.tsx` | Stat cards |
| `tabs/users.tsx` | Users table |
| `tabs/properties.tsx` | Properties table |
| `tabs/jobs.tsx` | Jobs table |
| `tabs/_shared.tsx` | Shared types, DataTable, badges, utilities |
| `tabs/_template.tsx` | Copy-paste starting point for new tabs |

## Database tables
- `profiles` — user accounts (`role`: host | cleaner | admin)
- `properties` — rental properties (`owner_id` → profiles)
- `jobs` — cleaning jobs (`property_id` → properties, `cleaner_id` → profiles)
