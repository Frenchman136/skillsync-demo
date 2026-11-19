import { TRADE_IDS, COUNTIES, LENGTHS, KINDS } from "./constants.js";
import { HttpError } from "./errors.js";

// These are the same rules as the React forms (src/pages/Request.jsx, Join.jsx).
// The server repeats them so they hold even if someone skips the form.

/** Today in Nairobi as YYYY-MM-DD. */
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });

/** Accepts 07xx, 01xx, +254, 254. Returns 07xxxxxxxx or null. */
export function cleanPhone(raw) {
  const d = String(raw ?? "").replace(/[\s\-()]/g, "");
  const m = d.match(/^(?:\+?254|0)([17]\d{8})$/);
  return m ? "0" + m[1] : null;
}

/** True only for a real calendar date written YYYY-MM-DD. */
export function isIsoDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function ageFrom(dob) {
  if (!isIsoDate(dob)) return null;
  const [by, bm, bd] = dob.split("-").map(Number);
  const [ty, tm, td] = today().split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age;
}

const str = (v) => (typeof v === "string" ? v.trim() : "");
const optional = (v, max) => {
  const s = str(v);
  return s ? s.slice(0, max) : null;
};
const EMAIL = /^\S+@\S+\.\S+$/;

function finish(errors, values) {
  if (Object.keys(errors).length)
    throw new HttpError(400, "Please fix the highlighted fields.", errors);
  return values;
}

export function validateRequest(body = {}) {
  const e = {};
  const name = str(body.name);
  if (!name) e.name = "Please enter your name.";
  else if (name.length > 120) e.name = "That name is too long.";

  const phone = cleanPhone(body.phone);
  if (!phone) e.phone = "Enter a Kenyan mobile number, like 0712 345 678.";

  const email = str(body.email);
  if (email && (!EMAIL.test(email) || email.length > 200))
    e.email = "That email does not look right.";

  const site = str(body.site);
  if (!site) e.site = "Tell us where the site is.";
  else if (site.length > 200)
    e.site = "That is too long. Keep it under 200 characters.";

  const start = str(body.start);
  if (!start) e.start = "Choose a start date.";
  else if (!isIsoDate(start)) e.start = "That date does not look right.";
  else if (start < today()) e.start = "The start date cannot be in the past.";

  const length = str(body.length) || "3 months or more";
  if (!LENGTHS.includes(length)) e.length = "Choose one of the listed lengths.";

  const lines = [];
  const trades = body.trades;
  if (!trades || typeof trades !== "object" || Array.isArray(trades)) {
    e.trades = "Choose at least one trade and how many workers.";
  } else {
    for (const [trade, qty] of Object.entries(trades)) {
      if (!TRADE_IDS.includes(trade)) {
        e.trades = `Unknown trade: ${trade.slice(0, 30)}.`;
        break;
      }
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
        e.trades = "Each trade needs a whole number from 1 to 99.";
        break;
      }
      lines.push({ trade, quantity: qty });
    }
    if (!e.trades && !lines.length)
      e.trades = "Choose at least one trade and how many workers.";
  }

  return finish(e, {
    name,
    phone,
    site,
    start,
    length,
    lines,
    company: optional(body.company, 120),
    email: email || null,
    notes: optional(body.notes, 1000),
  });
}

export function validateWorker(body = {}) {
  const e = {};
  const name = str(body.name);
  if (name.split(/\s+/).filter(Boolean).length < 2)
    e.name = "Please enter your full name (first and last).";
  else if (name.length > 120) e.name = "That name is too long.";

  const phone = cleanPhone(body.phone);
  if (!phone) e.phone = "Enter a Kenyan mobile number, like 0712 345 678.";

  const nationalId = str(body.nationalId);
  if (!/^\d{7,8}$/.test(nationalId))
    e.nationalId = "A national ID number is 7 or 8 numbers.";

  const dob = str(body.dob);
  const age = ageFrom(dob);
  if (age === null) e.dob = "Enter your date of birth.";
  else if (age < 18 || age > 35) e.dob = "We take workers aged 18 to 35.";

  const county = str(body.county) || "Nairobi";
  if (!COUNTIES.includes(county)) e.county = "Choose a county from the list.";

  const trade = str(body.trade);
  if (!TRADE_IDS.includes(trade)) e.trade = "Choose a trade from the list.";

  const kind = str(body.kind);
  if (!KINDS.includes(kind)) e.kind = "Choose skilled or general.";

  if (body.consent !== true)
    e.consent = "Please agree so we can check your details.";

  return finish(e, {
    name,
    phone,
    nationalId,
    dob,
    county,
    trade,
    kind,
    experience: optional(body.experience, 1000),
  });
}

export function validateLogin(body = {}) {
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || password.length > 200)
    throw new HttpError(400, "Enter your email and password.");
  return { email, password };
}

export function validateContractor(body = {}) {
  const e = {};
  const name = str(body.name);
  if (!name) e.name = "Please enter a name.";
  else if (name.length > 120) e.name = "That name is too long.";

  const email = str(body.email).toLowerCase();
  if (!EMAIL.test(email) || email.length > 200)
    e.email = "Enter a valid email address.";

  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8)
    e.password = "The password must be at least 8 characters.";
  else if (password.length > 72)
    e.password = "The password must be 72 characters or fewer.";

  let phone = null;
  if (str(body.phone)) {
    phone = cleanPhone(body.phone);
    if (!phone) e.phone = "Enter a Kenyan mobile number, like 0712 345 678.";
  }
  return finish(e, {
    name,
    email,
    password,
    phone,
    company: optional(body.company, 120),
  });
}
