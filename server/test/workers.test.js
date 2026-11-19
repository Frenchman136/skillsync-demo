import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { world, goodWorker } from "./helpers.js";

let w;
before(async () => {
  w = await world();
});
after(async () => {
  await w.close();
});

const apply = async () =>
  (await w.api.call("POST", "/workers", { body: goodWorker() })).body;

test("a worker cannot be approved without being verified first", async () => {
  const x = await apply();
  const r = await w.A("PATCH", `/workers/${x.id}`, { status: "Approved" });
  assert.equal(r.status, 409);
  assert.match(r.body.error, /verified/i);
});

test("verifying needs the ID-checked confirmation", async () => {
  const x = await apply();
  assert.equal(
    (await w.A("PATCH", `/workers/${x.id}`, { status: "Verified" })).status,
    400,
  );
  assert.equal(
    (
      await w.A("PATCH", `/workers/${x.id}`, {
        status: "Verified",
        idChecked: "yes",
      })
    ).status,
    400,
  );
  const ok = await w.A("PATCH", `/workers/${x.id}`, {
    status: "Verified",
    idChecked: true,
  });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.verifiedAt);
});

test("worker status must be a real status", async () => {
  const x = await apply();
  assert.equal(
    (await w.A("PATCH", `/workers/${x.id}`, { status: "Hired" })).status,
    400,
  );
  assert.equal((await w.A("PATCH", `/workers/${x.id}`, {})).status, 400);
  assert.equal(
    (await w.A("PATCH", "/workers/999999", { status: "Rejected" })).status,
    404,
  );
});

test("a rejected worker has to go back to Pending before being verified", async () => {
  const x = await apply();
  await w.A("PATCH", `/workers/${x.id}`, { status: "Rejected" });
  assert.equal(
    (
      await w.A("PATCH", `/workers/${x.id}`, {
        status: "Verified",
        idChecked: true,
      })
    ).status,
    409,
  );
  assert.equal(
    (await w.A("PATCH", `/workers/${x.id}`, { status: "Pending" })).status,
    200,
  );
});

test("worker list can be filtered, and bad filters are refused", async () => {
  const id = await w.approvedWorker("welder");
  const list = (
    await w.A("GET", "/workers?status=Approved&trade=welder&available=true")
  ).body;
  assert.ok(list.some((x) => x.id === id));
  assert.ok(list.every((x) => x.status === "Approved" && x.trade === "welder"));
  assert.equal((await w.A("GET", "/workers?status=Bogus")).status, 400);
});

test("a placed worker cannot be deleted or have their status changed", async () => {
  const id = await w.newRequest(undefined, { mason: 1 });
  const worker = await w.approvedWorker("mason");
  await w.place(id, "mason", worker);
  assert.equal((await w.A("DELETE", `/workers/${worker}`)).status, 409);
  assert.equal(
    (await w.A("PATCH", `/workers/${worker}`, { status: "Rejected" })).status,
    409,
  );
});
