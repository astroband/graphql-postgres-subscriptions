import { isAsyncIterable } from "iterall";
import { Client } from "pg";
import PostgresPubSub from "../src";
import {
  SQL_DB,
  SQL_HOST,
  SQL_PASSWORD,
  SQL_PORT,
  SQL_USER
} from "./testHelper";

describe("Index", () => {
  let pgClient: Client;

  beforeEach(async () => {
    pgClient = new Client({
      user: SQL_USER,
      database: SQL_DB,
      password: SQL_PASSWORD,
      port: +SQL_PORT,
      host: SQL_HOST
    });
    await pgClient.connect();
  });

  it("should create an instance of the PubSubEngine", () => {
    expect(PostgresPubSub).toBeDefined();
    const pgPubSub = new PostgresPubSub(pgClient);
    expect(pgPubSub).toBeInstanceOf(PostgresPubSub);
  });

  describe("PostgresPubSub", () => {
    it("should subscribe and be called when events are published", async done => {
      expect.assertions(2);
      const eventName = "testSubscribe";
      const pgPubSub = new PostgresPubSub(pgClient);
      await pgPubSub
        .subscribe(eventName, payload => {
          expect(payload).toEqual({ foo: "bar", baz: 1 });
          done();
        })
        .then(() => {
          expect(pgPubSub.publish(eventName, { foo: "bar", baz: 1 })).toBe(
            true
          );
        });
    });

    it("should unsubscribe from events", async done => {
      expect.assertions(1);
      const eventName = "testUnsubscribe";
      const pgPubSub = new PostgresPubSub(pgClient);
      await pgPubSub
        .subscribe(eventName, payload => {
          expect(payload).toBeUndefined();
        })
        .then(subId => {
          pgPubSub.unsubscribe(subId);
          expect(pgPubSub.publish(eventName, { foo: 1 })).toBe(true);
        })
        .then(done);
    });
  });

  describe("PostgresIPC", () => {
    it("should allow custom JSON reviver", async done => {
      expect.assertions(2);
      const dateReviver = (key: any, value: any) => {
        const isISO8601Z = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/;
        if (typeof value === "string" && isISO8601Z.test(value)) {
          const tempDateNumber = Date.parse(value);
          if (!isNaN(tempDateNumber)) {
            return new Date(tempDateNumber);
          }
        }
        return value;
      };

      const eventName = "testCustomReviver";
      const pgPubSub = new PostgresPubSub(pgClient, dateReviver);
      const goodDate = new Date();
      const badDate = "2018-13-01T12:00:00Z";
      await pgPubSub
        .subscribe(eventName, payload => {
          expect(payload).toEqual({ goodDate, badDate });
          done();
        })
        .then(() => {
          expect(pgPubSub.publish(eventName, { goodDate, badDate })).toBe(true);
        });
    });

    it("should handle reviver exceptions", async done => {
      expect.assertions(2);
      const eventName = "testBadReviver";
      const pgPubSub = new PostgresPubSub(pgClient, (key: any, value: any) => {
        throw new Error();
      });
      await pgPubSub
        .subscribe(eventName, payload => {
          expect(payload).toEqual('{"reviver":"Test"}'); // stringified JSON
          done();
        })
        .then(() => {
          expect(pgPubSub.publish(eventName, { reviver: "Test" })).toBe(true);
        });
    });

    it("should allow null payload", async done => {
      expect.assertions(2);
      const eventName = "testNullPayload";
      const pgPubSub = new PostgresPubSub(pgClient);
      await pgPubSub
        .subscribe(eventName, payload => {
          expect(payload).toEqual(null);
          done();
        })
        .then(() => {
          expect(pgPubSub.publish(eventName, null)).toBe(true);
        });
    });
  });

  describe("PubSubAsyncIterator", () => {
    it("should expose a valid asyncIterator", () => {
      expect.assertions(2);
      const eventName = "testValidAsyncIterator";
      const pgPubSub = new PostgresPubSub(pgClient);
      const iterator = pgPubSub.asyncIterator(eventName);
      expect(iterator).toBeDefined();
      expect(isAsyncIterable(iterator)).toBe(true);
    });

    it("should trigger event on asyncIterator when published", done => {
      expect.assertions(1);
      const eventName = "testAsyncIteratorTrigger";
      const pgPubSub = new PostgresPubSub(pgClient);
      const iterator = pgPubSub.asyncIterator(eventName);
      iterator.next().then(result => {
        expect(result).toEqual({ done: false, value: "string payload" });
        done();
      });
      pgPubSub.publish(eventName, "string payload");
    });

    it("should not trigger event on asyncIterator when publishing other event", done => {
      expect.assertions(1);
      const eventName = "testAsyncIteratorMistrigger";
      const pgPubSub = new PostgresPubSub(pgClient);
      const iterator = pgPubSub.asyncIterator(eventName);
      const spy = jest.fn();
      iterator.next().then(spy);
      pgPubSub.publish(eventName, true);
      expect(spy).not.toHaveBeenCalled();
      done();
    });

    it("should register to multiple events", async done => {
      expect.assertions(3);
      const eventName = "testAsyncIteratorMultiple";
      const eventName2 = "testAsyncIteratorMultiple2";
      const pgPubSub = new PostgresPubSub(pgClient);
      const iterator = pgPubSub.asyncIterator([eventName, eventName2]);
      pgPubSub.publish(eventName2, 2);
      pgPubSub.publish(eventName, 1);
      pgPubSub.publish(eventName2, 40);
      let iteration = 1;
      while (true) {
        const result = await iterator.next();
        if (result.done) {
          break;
        }
        if (iteration === 1) {
          expect(result).toEqual({ done: false, value: 2 });
        } else if (iteration === 2) {
          expect(result).toEqual({ done: false, value: 1 });
        } else if (iteration === 3) {
          expect(result).toEqual({ done: false, value: 40 });
          iterator.return();
        }
        iteration += 1;
      }
      done();
    });

    it("should not trigger event on asyncIterator already returned", done => {
      expect.assertions(1);
      const eventName = "testNoTriggerReturned";
      const pgPubSub = new PostgresPubSub(pgClient);
      const iterator = pgPubSub.asyncIterator(eventName);
      iterator.return();
      iterator.next().then(result => {
        expect(result).toEqual({ done: true, value: undefined });
        done();
      });
      pgPubSub.publish(eventName, { test: true });
    });

    it("should throw an error", () => {
      expect.assertions(1);
      const eventName = "testAsyncIteratorThrow";
      const pgPubSub = new PostgresPubSub(pgClient);
      const iterator = pgPubSub.asyncIterator(eventName);
      return expect(iterator.throw("Test Error")).rejects.toBe("Test Error");
    });
  });
});
