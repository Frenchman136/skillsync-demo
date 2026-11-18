# Skill Sync (React demo for submission)

A small React + Vite site for a Nairobi construction staffing agency. It has no server: forms save in the visitor's browser (localStorage), so it deploys on Vercel as a static site.

## Pages
| Path | What it does |
|---|---|
| `/` | Landing page: pick trades, how it works, FAQ |
| `/request` | Contractors request workers (trades, site, dates, contact). Checks the form, saves it |
| `/join` | Workers apply (Kenyan phone, ID number, age 18 to 35, trade). Checks the form, saves it |
| `/admin` | Demo admin. Password: `skillsync`. Lists requests and applications, change status, delete, add sample data |

## Run on your computer
```
npm install
npm run dev
```
Open the address it prints.

## Put it on Vercel
1. Upload this folder to a GitHub repository (do not upload `node_modules` or `dist`).
2. On vercel.com choose Add New, Project, pick the repository. Vercel detects Vite. Press Deploy.
3. `vercel.json` makes direct links like `/request` work.

Or from the terminal: `npx vercel`.

## Limits (say this in your report)
- Data stays in each visitor's own browser. The admin page only shows what was submitted in the same browser. A real system needs a backend and database.
- The admin password is in the code. It is a demo, not security.
- No SMS, payments, or worker and contractor logins. The full system (Laravel and MySQL) has those and is a separate project.
- Photos are third-party and must be replaced with your own or licensed ones before real use.

## Files
`src/pages` the four pages, `src/lib/store.js` browser storage and phone/age checks, `src/lib/data.js` trades, steps and FAQ, `src/styles.css` all styling.
