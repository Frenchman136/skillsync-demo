export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

/** Route params like /requests/12. Anything else is a 404. */
export function parseId(v) {
  if (!/^\d{1,9}$/.test(String(v))) throw new HttpError(404, 'Not found.')
  return Number(v)
}
