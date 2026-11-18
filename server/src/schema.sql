-- Skill Sync schema. Safe to run on every start (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS users (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  company       text,
  phone         text,
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN ('admin', 'contractor')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requests (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contractor_id integer REFERENCES users(id) ON DELETE SET NULL,
  name          text NOT NULL,
  company       text,
  phone         text NOT NULL,
  email         text,
  site          text NOT NULL,
  start_date    date NOT NULL,
  length        text NOT NULL,
  notes         text,
  status        text NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Quoted', 'Placed', 'Closed')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS request_lines (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id integer NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  trade      text NOT NULL,
  quantity   integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  UNIQUE (request_id, trade)
);

CREATE TABLE IF NOT EXISTS workers (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL,
  phone       text NOT NULL,
  national_id text NOT NULL UNIQUE,
  dob         date NOT NULL,
  county      text NOT NULL,
  trade       text NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('skilled', 'general')),
  experience  text,
  status      text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Approved', 'Rejected')),
  verified_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- A worker fills one position on one request line. UNIQUE (worker_id): one placement at a time.
CREATE TABLE IF NOT EXISTS assignments (
  id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_line_id integer NOT NULL REFERENCES request_lines(id) ON DELETE CASCADE,
  worker_id       integer NOT NULL UNIQUE REFERENCES workers(id),
  assigned_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS requests_contractor_idx ON requests(contractor_id);
CREATE INDEX IF NOT EXISTS request_lines_request_idx ON request_lines(request_id);
CREATE INDEX IF NOT EXISTS assignments_line_idx ON assignments(request_line_id);
