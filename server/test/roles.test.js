import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { query, world, goodRequest } from "./helpers.js";

let w;
before(async () => {
  w = await world();
});
after(async () => {
  await w.close();
});

test("a contractor cannot reach any admin route", async () => {
  const checks = [
    ["GET", "/workers"],
    ["GET", "/users"],
    ["GET", "/stats"],
    ["POST", "/users"],
    ["PATCH", "/workers/1"],
    ["PATCH", "/requests/1"],
    ["DELETE", "/requests/1"],
    ["DELETE", "/workers/1"],
    ["DELETE", "/users/1"],
    ["POST", "/requests/1/lines/1/assignments"],
    ["DELETE", "/assignments/1"],
  ];
  for (const [m, p] of checks) {
    const body = m === "GET" || m === "DELETE" ? undefined : {};
    assert.equal(
      (await w.api.call(m, p, { token: w.jane.token, body })).status,
      403,
      `${m} ${p}`,
    );
  }
});

test("a contractor sees only their own requests", async () => {
  const mine = await w.newRequest(w.jane.token);
  const theirs = await w.newRequest(w.bob.token);
  const walkIn = await w.newRequest(undefined);
  const ids = (
    await w.api.call("GET", "/requests", { token: w.jane.token })
  ).body.map((r) => r.id);
  assert.ok(ids.includes(mine));
  assert.ok(!ids.includes(theirs), "Bob's request leaked to Jane");
  assert.ok(!ids.includes(walkIn), "a walk-in request leaked to Jane");
});

test("another contractor's request is a 404, not a 403 (it does not confirm it exists)", async () => {
  const bobs = await w.newRequest(w.bob.token);
  assert.equal(
    (await w.api.call("GET", `/requests/${bobs}`, { token: w.jane.token }))
      .status,
    404,
  );
});

test("a contractor never sees worker names, phones or contractor details", async () => {
  const id = await w.newRequest(w.jane.token, { mason: 1 });
  const worker = await w.approvedWorker("mason");
  assert.equal((await w.place(id, "mason", worker)).status, 201);
  const r = (
    await w.api.call("GET", `/requests/${id}`, { token: w.jane.token })
  ).body;
  assert.equal(r.status, "Placed");
  assert.equal(r.lines[0].filled, 1);
  const text = JSON.stringify(r);
  assert.ok(!text.includes("Peter Otieno"), "worker name leaked");
  assert.ok(!text.includes("0733000111"), "worker phone leaked");
  assert.ok(!("workers" in r.lines[0]));
  assert.ok(!("contractor" in r));
});

test("a request sent while signed in is saved under that contractor", async () => {
  const id = await w.newRequest(w.jane.token);
  const { rows } = await query(
    "SELECT contractor_id FROM requests WHERE id = $1",
    [id],
  );
  assert.equal(rows[0].contractor_id, w.jane.id);
});

test("an admin posting a request does not become its contractor", async () => {
  const id = await w.newRequest(w.adminToken);
  const { rows } = await query(
    "SELECT contractor_id FROM requests WHERE id = $1",
    [id],
  );
  assert.equal(rows[0].contractor_id, null);
});

test("deleting a contractor keeps their requests and ends their session", async () => {
  const c = await w.A("POST", "/users", {
    email: "temp@c.test",
    name: "Temp",
    password: "Password123",
  });
  const t = (
    await w.api.call("POST", "/auth/login", {
      body: { email: "temp@c.test", password: "Password123" },
    })
  ).body.token;
  const id = await w.newRequest(t);
  assert.equal((await w.A("DELETE", `/users/${c.body.id}`)).status, 204);
  assert.equal((await w.A("GET", `/requests/${id}`)).status, 200);
  assert.equal((await w.api.call("GET", "/auth/me", { token: t })).status, 401);
});

test("contractor account rules: duplicate email, short password, bad phone, bad email", async () => {
  const body = { email: "dup@c.test", name: "Dup", password: "Password123" };
  assert.equal((await w.A("POST", "/users", body)).status, 201);
  assert.equal((await w.A("POST", "/users", body)).status, 409);
  assert.equal(
    (
      await w.A("POST", "/users", {
        ...body,
        email: "x@c.test",
        password: "short",
      })
    ).status,
    400,
  );
  assert.equal(
    (await w.A("POST", "/users", { ...body, email: "y@c.test", phone: "123" }))
      .status,
    400,
  );
  assert.equal(
    (await w.A("POST", "/users", { ...body, email: "not-an-email" })).status,
    400,
  );
});

test("the admin account cannot be deleted through the contractor route", async () => {
  const { rows } = await query("SELECT id FROM users WHERE role = 'admin'");
  assert.equal((await w.A("DELETE", `/users/${rows[0].id}`)).status, 404);
  assert.equal(
    (await w.api.call("GET", "/auth/me", { token: w.adminToken })).status,
    200,
  );
});

test("a contractor request still goes through the same checks", async () => {
  const r = await w.api.call("POST", "/requests", {
    token: w.jane.token,
    body: { ...goodRequest(), trades: { mason: 0 } },
  });
  assert.equal(r.status, 400);
});
