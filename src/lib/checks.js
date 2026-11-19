// Form checks that give instant feedback in the browser.
// The server repeats every one of these (server/src/validate.js), so they still hold if the form is bypassed.

/** Accepts 07xx, 01xx, +254, 254. Returns 07xxxxxxxx style or null. */
export function cleanPhone(raw) {
  const d = String(raw).replace(/[\s\-()]/g, "");
  const m = d.match(/^(?:\+?254|0)([17]\d{8})$/);
  return m ? "0" + m[1] : null;
}

export function ageFrom(dob) {
  const b = new Date(dob);
  if (Number.isNaN(b.getTime())) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}
