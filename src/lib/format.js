import { tradeName } from "./data.js";

export const fmt = (iso) =>
  new Date(iso).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export const fmtDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const REQUEST_STATUS = [
  "New",
  "Contacted",
  "Quoted",
  "Placed",
  "Closed",
];
export const WORKER_STATUS = ["Pending", "Verified", "Approved", "Rejected"];

export const refNo = (id) => `R-${id}`;

/** "2 masons, 3 site labourers" */
export const linesText = (lines) =>
  lines
    .map((l) => `${l.quantity} ${tradeName(l.trade).toLowerCase()}`)
    .join(", ");
export const filledText = (lines) => {
  const need = lines.reduce((n, l) => n + l.quantity, 0);
  const got = lines.reduce((n, l) => n + l.filled, 0);
  return `${got} of ${need} placed`;
};
