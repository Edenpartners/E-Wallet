import { Subscription, Subscriber, Observable } from 'rxjs';

export interface Map<T> {
  [key: string]: T;
}

class ListUtil {
  addItemToList(list, item) {
    let itemExists = false;
    for (let i = 0; i < list.length; i++) {
      if (Object.is(list[i], item)) {
        itemExists = true;
        break;
      }
    }
    if (itemExists === false) {
      list.push(item);
    }
  }

  removeItemFromList(list, item) {
    for (let i = 0; i < list.length; i++) {
      if (Object.is(list[i], item)) {
        list.splice(i, 1);
        break;
      }
    }
  }

  notifyToObservers(list, item?: any) {
    list.forEach((subscriber: Subscriber<any>) => {
      subscriber.next(item);
    });
  }

  removeSubscribers(list: Array<any>) {
    list.forEach((subscriber: Subscriber<any>) => {
      subscriber.complete();
    });
    if (list.length > 0) {
      list.splice(0, list.length);
    }
  }
}

export const listutil = new ListUtil();

export class SubscriptionHandler<T> {
  subscribers: Array<Subscriber<T>> = [];
  onObserverCreated: (observer: Subscriber<T>) => void;

  createObserver(): Observable<T> {
    const thisRef = this;
    return new Observable(observer => {
      listutil.addItemToList(thisRef.subscribers, observer);

      if (this.onObserverCreated) {
        this.onObserverCreated(observer);
      }

      return {
        unsubscribe() {
          listutil.removeItemFromList(thisRef.subscribers, observer);
        }
      };
    });
  }

  notifyToSubscribers(data: T) {
    listutil.notifyToObservers(this.subscribers, data);
  }

  clean() {
    listutil.removeSubscribers(this.subscribers);
  }
}

interface SubscriptionKeyValue {
  key: any;
  subscription: Subscription;
  subscriptionCreator: () => Subscription;
}

export class SubscriptionPack {
  list: Array<SubscriptionKeyValue> = [];

  addSubscription(subscriptionCreator: () => Subscription, key: any = null) {
    this.list.push({
      key: null,
      subscription: subscriptionCreator(),
      subscriptionCreator: subscriptionCreator
    });
  }

  removeSubscription(subscription: Subscription) {
    for (let i = 0; i < this.list.length; i++) {
      const item = this.list[i];
      if (Object.is(item.subscription, subscription)) {
        item.subscription.unsubscribe();
        this.list.splice(i, 1);
        i -= 1;
        break;
      }
    }
  }

  removeSubscriptionsByKey(key: any) {
    for (let i = 0; i < this.list.length; i++) {
      const item = this.list[i];
      if ((item.key !== null && Object.is(item.key, key)) || item.key === key) {
        item.subscription.unsubscribe();
        this.list.splice(i, 1);
        i -= 1;
        console.log('remove subscription by key');
        console.log(key);
      }
    }
  }

  pause() {
    this.list.forEach(item => {
      item.subscription.unsubscribe();
    });
  }

  resume() {
    this.list.forEach(item => {
      item.subscription = item.subscriptionCreator();
    });
  }

  clear() {
    this.list.forEach(item => {
      item.subscription.unsubscribe();
    });

    if (this.list.length > 0) {
      this.list.splice(0, this.list.length);
    }
  }
}
