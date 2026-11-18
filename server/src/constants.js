// Keep these in step with src/lib/data.js and the status lists in the React app.
export const TRADES = [
  { id: 'mason', name: 'Masons' },
  { id: 'plumber', name: 'Plumbers' },
  { id: 'electrician', name: 'Electricians' },
  { id: 'carpenter', name: 'Carpenters' },
  { id: 'painter', name: 'Painters' },
  { id: 'tiler', name: 'Tilers' },
  { id: 'welder', name: 'Welders' },
  { id: 'roofer', name: 'Roofers' },
  { id: 'steel', name: 'Steel fixers' },
  { id: 'labour', name: 'Site labourers' },
]
export const TRADE_IDS = TRADES.map((t) => t.id)
export const tradeName = (id) => TRADES.find((t) => t.id === id)?.name ?? id

export const COUNTIES = ['Nairobi', 'Kiambu', 'Machakos', 'Kajiado', 'Nakuru', 'Uasin Gishu', 'Mombasa', 'Kisumu', 'Other']
export const LENGTHS = ['1 to 3 months', '3 months or more', '6 months or more', 'Not sure yet']
export const KINDS = ['skilled', 'general']

export const REQUEST_STATUS = ['New', 'Contacted', 'Quoted', 'Placed', 'Closed']
export const WORKER_STATUS = ['Pending', 'Verified', 'Approved', 'Rejected']

// Which worker status may follow which. A worker must be Verified before Approved.
export const WORKER_TRANSITIONS = {
  Pending: ['Verified', 'Rejected'],
  Verified: ['Approved', 'Rejected'],
  Approved: ['Rejected'],
  Rejected: ['Pending'],
}
