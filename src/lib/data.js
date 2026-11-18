export const TRADES = [
  { id: 'mason', name: 'Masons', img: 'mason', alt: 'A mason in orange work gloves laying a hollow clay block on a wall', task: 'Walling, blockwork and plastering.' },
  { id: 'plumber', name: 'Plumbers', img: 'plumber', alt: 'A plumber in red overalls repairing a sink waste pipe with a wrench', task: 'Water supply, drainage and fittings.' },
  { id: 'electrician', name: 'Electricians', img: 'electrician', alt: 'An electrician fitting a wall switch with a screwdriver', task: 'Wiring, conduit and distribution boards.' },
  { id: 'carpenter', name: 'Carpenters', img: 'carpenter', alt: 'A carpenter sawing a plank on trestles in a workshop', task: 'Formwork, roof timber and finishing.' },
  { id: 'painter', name: 'Painters', img: 'painter', alt: 'A painter in a hard hat and mask rolling paint onto a wall', task: 'Interior and exterior finishing.' },
  { id: 'tiler', name: 'Tilers', img: 'tiler', alt: 'A tiler in a blue hard hat laying floor tiles with a spirit level', task: 'Floors, walls and waterproofing.' },
  { id: 'welder', name: 'Welders', task: 'Frames, gates and steel fabrication.' },
  { id: 'roofer', name: 'Roofers', task: 'Sheeting, trusses and flashing.' },
  { id: 'steel', name: 'Steel fixers', task: 'Reinforcement cutting and fixing.' },
  { id: 'labour', name: 'Site labourers', img: 'labour', alt: 'Site workers in hi-vis vests and hard hats on a building site', task: 'General site work and support.' },
]
export const tradeName = (id) => TRADES.find((t) => t.id === id)?.name ?? id

export const STEPS = [
  ['Tell us the work', 'Describe the site, the trades and how many people you need.'],
  ['We check it', 'Our admin reviews what needs doing, so the request fits the job.'],
  ['We agree the price', 'Per worker per week, or one price for the whole contract.'],
  ['Workers on site', 'Our supervisor confirms attendance every day. You get one invoice.'],
]

export const FAQ = [
  ['Do you place workers for short jobs?', 'No. We supply workers for longer assignments, so your crew stays the same and learns your site.'],
  ['Who employs the workers?', 'We do. We handle their contracts, pay and statutory deductions. You deal with one invoice.'],
  ['How do you check workers?', 'Every worker is checked against their national ID, and we keep their documents up to date.'],
  ['How is attendance recorded?', 'Our own supervisor records it daily and you approve it. If something is wrong, you tell us within 72 hours.'],
  ['How fast will you reply?', 'Within one working day.'],
]

export const COUNTIES = ['Nairobi', 'Kiambu', 'Machakos', 'Kajiado', 'Nakuru', 'Uasin Gishu', 'Mombasa', 'Kisumu', 'Other']
