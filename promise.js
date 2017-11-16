'use strict';

const STATES = {
  PENDING: 'pending',
  FULFILLED: 'fulfilled',
  REJECTED: 'rejected',
};

class MyPromise {
  constructor(executor) {
    const self = this;

    self._state = STATES.PENDING;
    self._thens = [];

    if (executor) {
      executor(self.resolve.bind(self), self.reject.bind(self));
    }
  }

  then(onFulfilled, onRejected) {
    const self = this;

    if (self._state === STATES.PENDING) {
      let resultingPromise = new MyPromise();
      self._thens.push({
        onFulfilled: onFulfilled,
        onRejected: onRejected,
        promise: resultingPromise,
      });
      return resultingPromise;
    } else if (self._state === STATES.FULFILLED) {
      return self._nextPromise(onFulfilled, self._value, true);
    } else {
      /* STATES.REJECTED */ return self._nextPromise(
        onRejected,
        self._reason,
        false,
      );
    }
  }

  resolve(value) {
    const self = this;
    if (self._state === STATES.PENDING) {
      self._changeState(STATES.FULFILLED, value);
    }
  }

  reject(reason) {
    const self = this;
    if (self._state === STATES.PENDING) {
      self._changeState(STATES.REJECTED, reason);
    }
  }

  _nextPromise(onFulfilledOrRejected, valueOrReason, fulfilled) {
    if (!isFunction(onFulfilledOrRejected)) {
      if (fulfilled === true) {
        return MyPromise.resolved(valueOrReason);
      } else {
        return MyPromise.rejected(valueOrReason);
      }
    }

    return new MyPromise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(onFulfilledOrRejected(valueOrReason));
        } catch (reason) {
          reject(reason);
        }
      }, 0);
    });
  }

  _changeState(newState, valueOrReason) {
    const self = this;

    if (newState === STATES.FULFILLED) {
      // check for reasonable thenable implementations;
      // if it is one, resolve this promise to that promise's
      // resolved value (which we may need to wait for)
      if (valueOrReason === self) {
        // don't allow for a promise that resolves to itself
        self.reject(new TypeError('Promise resolves to itself'));
        return;
      } else if (valueOrReason instanceof MyPromise) {
        // MyPromise is the most reasonable implementation :)
        valueOrReason.then(
          value => self.resolve(value),
          reason => self.reject(reason),
        );
        return;
      } else if (
        valueOrReason !== null &&
        (typeof valueOrReason === 'object' ||
          typeof valueOrReason === 'function')
      ) {
        // in this case we just have an object or function with a 'then'
        // method. Let's force it to be reasonable (i.e. it only calls
        // resolve or reject once)
        let resolveOrRejectCalled = false;

        try {
          let then = valueOrReason.then;
          if (typeof then === 'function') {
            then.call(
              valueOrReason,
              value => {
                if (!resolveOrRejectCalled) {
                  resolveOrRejectCalled = true;
                  self.resolve(value);
                }
              },
              reason => {
                if (!resolveOrRejectCalled) {
                  resolveOrRejectCalled = true;
                  self.reject(reason);
                }
              },
            );
            return;
          }
        } catch (reason) {
          if (!resolveOrRejectCalled) {
            self.reject(reason);
          }
          return;
        }
      }
    }

    // now we resolve normally
    self._state = newState;

    if (newState === STATES.FULFILLED) {
      self._value = valueOrReason;
    } else {
      /* STATES.REJECTED */ self._reason = valueOrReason;
    }
    setTimeout(() => {
      self._resolveAwaitingPromises();
    }, 0);
  }

  _resolveAwaitingPromises() {
    const self = this;

    self._thens.forEach(then => {
      const promise = then.promise;
      let func;
      let valueOrReason;

      if (self._state === STATES.FULFILLED) {
        func = then.onFulfilled;
        valueOrReason = self._value;
      } else {
        /* STATES.REJECTED */ func = then.onRejected;
        valueOrReason = self._reason;
      }

      try {
        if (isFunction(func)) {
          promise.resolve(func(valueOrReason));
        } else {
          if (self._state === STATES.FULFILLED) {
            promise.resolve(valueOrReason);
          } else {
            promise.reject(valueOrReason);
          }
        }
      } catch (reason) {
        promise.reject(reason);
      }
    });
  }

  static resolved(value) {
    return new MyPromise(resolve => resolve(value));
  }

  static rejected(reason) {
    return new MyPromise((resolve, reject) => reject(reason));
  }

  static deferred() {
    const p = new MyPromise();
    return {
      promise: p,
      resolve: p.resolve.bind(p),
      reject: p.reject.bind(p),
    };
  }
}

function isFunction(func) {
  return typeof func === 'function';
}

module.exports = MyPromise;
