import { PubSubEngine } from "graphql-subscriptions";
import { $$asyncIterator } from "iterall";

export default class PubSubAsyncIterator<T> implements AsyncIterator<T> {
  private pullQueue: Array<(payload: IteratorResult<T>) => void>;
  private pushQueue: T[];
  private eventsArray: string[];
  private listening: boolean;
  private pubsub: PubSubEngine;
  private allSubscribed: Promise<number[]>;

  constructor(pubsub: PubSubEngine, eventNames: string | string[]) {
    this.pubsub = pubsub;
    this.pullQueue = [];
    this.pushQueue = [];
    this.listening = true;
    this.eventsArray =
      typeof eventNames === "string" ? [eventNames] : eventNames;
    this.allSubscribed = this.subscribeAll();
  }

  public async next(value?: any) {
    await this.allSubscribed;
    return this.listening ? this.pullValue() : this.return();
  }

  public async return(value?: any) {
    this.emptyQueue(await this.allSubscribed, value);
    return { value, done: true };
  }

  public async throw(e?: any) {
    this.emptyQueue(await this.allSubscribed, e);
    return Promise.reject(e);
  }

  public [$$asyncIterator]() {
    return this;
  }

  private async pushValue(event: T) {
    await this.allSubscribed;
    if (this.pullQueue.length > 0) {
      const fn = this.pullQueue.shift();
      if (fn) {
        fn({ value: event, done: false });
      }
    } else {
      this.pushQueue.push(event);
    }
  }

  private pullValue(): Promise<IteratorResult<T>> {
    return new Promise(resolve => {
      if (this.pushQueue.length > 0) {
        const value = this.pushQueue.shift();
        if (value) {
          resolve({ value, done: false });
        }
      } else {
        this.pullQueue.push(resolve);
      }
    });
  }

  private emptyQueue(subscriptionIds: number[], value: T) {
    if (this.listening) {
      this.listening = false;
      this.unsubscribeAll(subscriptionIds);
      this.pullQueue.forEach(resolve => resolve({ value, done: true }));
      this.pullQueue = [];
      this.pushQueue = [];
    }
  }

  private subscribeAll() {
    return Promise.all(
      this.eventsArray.map(eventName =>
        this.pubsub.subscribe(eventName, this.pushValue.bind(this), {})
      )
    );
  }

  private unsubscribeAll(subscriptionIds: number[]) {
    for (const subscriptionId of subscriptionIds) {
      this.pubsub.unsubscribe(subscriptionId);
    }
  }
}
