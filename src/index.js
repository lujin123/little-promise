/**
 * 了解下promise的原理，实现(chao)了一个简易版的😆
 *
 * test:
 * > npm test
 *
 * refs:
 * 1. https://malcolmyu.github.io/2015/06/12/Promises-A-Plus/#note-4
 * 2. https://www.jianshu.com/p/459a856c476f
 * 3. https://cnodejs.org/topic/5603cb8a152fdd025f0f5014
 *
 */
const asyncCall = process ? process.nextTick : setTimeout

class Promise {
  constructor(executor) {
    this._status = 0
    this._value = undefined
    this._onResolvedCallbacks = []
    this._onRejectedCallbacks = []
    try {
      executor(this.resolve.bind(this), this.reject.bind(this))
    } catch (e) {
      this.reject(e)
    }
  }

  _complete(state, value) {
    // 只能执行一次
    if (!this._status) {
      this._status = state
      this._value = value
      asyncCall(() => {
        const handlers = state === 1 ? this._onResolvedCallbacks : this._onRejectedCallbacks
        handlers.map(handler => {
          handler(value)
        })

        this._onRejectedCallbacks = null
        this._onResolvedCallbacks = null
      })
    }
  }

  resolve(value) {
    this._complete(1, value)
  }

  reject(reason) {
    this._complete(2, reason)
  }

  then(onResolved, onRejected) {
    let promise

    onResolved = typeof onResolved === 'function' ? onResolved : value => value
    onRejected = typeof onRejected === 'function' ? onRejected : reason => {
      throw reason
    }

    function callback(type, value) {
      try {
        const handler = type === 1 ? onResolved : onRejected
        const x = handler(value)
        Promise.resolvePromise(promise, x)
      } catch (e) {
        promise.reject(e)
      }
    }
    if (this._status === 0) {
      promise = new Promise((resolve, reject) => {
        this._onResolvedCallbacks.push(value => {
          callback(1, value)
        })

        this._onRejectedCallbacks.push(reason => {
          callback(2, reason)
        })
      })
    } else {
      promise = new Promise((resolve, reject) => {
        asyncCall(() => {
          callback(this._status, this._value)
        })
      })
    }
    return promise
  }

  catch (onRejected) {
    return this.then(null, onRejected)
  }

  /**
   *  写个注释防止格式化换行，艹
   * @param {*} onFinally
   */
  finally(onFinally) {
    return this.then(onFinally, onFinally)
  }

  static resolvePromise(promise, x) {
    if (promise === x) {
      return promise.reject(new TypeError('The promise and its value refer to the same object'))
    }
    if (x && (typeof x === 'function' || typeof x === 'object')) {
      let called = false
      try {
        let then = x.then
        if (typeof then === 'function') {
          then.call(x, y => {
            if (!called) {
              called = true
              Promise.resolvePromise(promise, y)
            }
          }, r => {
            if (!called) {
              called = true
              promise.reject(r)
            }
          })
        } else {
          promise.resolve(x)
        }
      } catch (e) {
        if (!called) {
          called = true
          promise.reject(e)
        }
      }
    } else {
      promise.resolve(x)
    }
  }

  static all(promises) {
    const gen = (length, resolve) => {
      let count = 0
      let results = []
      return (index, value) => {
        results[index] = value
        if (++count === length) {
          resolve(results)
        }
      }
    }
    return new Promise((resolve, reject) => {
      const done = gen(promises.length, resolve)
      promises.map((promise, index) => {
        // 简单处理下不是Promise的参数
        if (!(promise instanceof Promise)) {
          promise = Promise.resolve(promise)
        }
        promise.then(value => {
          done(index, value)
        }, reject)
      })
    })
  }

  static race(promises) {
    return new Promise((resolve, reject) => {
      promises.map(promise => {
        promise.then(resolve, reject)
      })
    })
  }


  static resolve(value) {
    return new Promise((resolve, reject) => {
      resolve(value)
    })
  }

  static reject(reason) {
    return new Promise((resolve, reject) => {
      reject(reason)
    })
  }

  static deferred() {
    let defer = {}
    defer.promise = new Promise((resolve, reject) => {
      defer.resolve = resolve
      defer.reject = reject
    })
    return defer
  }
}

try {
  module.exports = Promise
} catch (e) {}
