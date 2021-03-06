require('ember-runtime/system/object');

var get = Ember.get,
    set = Ember.set,
    defineProperty = Ember.defineProperty,
    addBeforeObserver = Ember.addBeforeObserver,
    addObserver = Ember.addObserver,
    removeBeforeObserver = Ember.removeBeforeObserver,
    removeObserver = Ember.removeObserver,
    suspendBeforeObserver = Ember._suspendBeforeObserver,
    suspendObserver = Ember._suspendObserver,
    propertyWillChange = Ember.propertyWillChange,
    propertyDidChange = Ember.propertyDidChange,
    getMeta = Ember.getMeta,
    delegateDesc;

function addDelegateObservers(proxy, key) {
  var delegateKey = 'content.' + key,
      willChangeKey = key + 'WillChange',
      didChangeKey = key + 'DidChange';
  proxy[willChangeKey] = function () {
    propertyWillChange(this, key);
  };
  proxy[didChangeKey] = function () {
    propertyDidChange(this, key);
  };
  // have to use target=null method=string so if
  // willWatchProperty is call with prototype it will still work
  addBeforeObserver(proxy, delegateKey, null, willChangeKey);
  addObserver(proxy, delegateKey, null, didChangeKey);
}

function removeDelegateObservers(proxy, key) {
  var delegateKey = 'content.' + key,
      willChangeKey = key + 'WillChange',
      didChangeKey = key + 'DidChange';
  removeBeforeObserver(proxy, delegateKey, null, willChangeKey);
  removeObserver(proxy, delegateKey, null, didChangeKey);
  delete proxy[willChangeKey];
  delete proxy[didChangeKey];
}

function suspendDelegateObservers(proxy, key, fn) {
  var delegateKey = 'content.' + key,
      willChangeKey = key + 'WillChange',
      didChangeKey = key + 'DidChange';
  suspendBeforeObserver(proxy, delegateKey, null, willChangeKey, function () {
    suspendObserver(proxy, delegateKey, null, didChangeKey, function () {
      fn.call(proxy);
    });
  });
}

function isDelegateDesc(proxy, key) {
  var descs = getMeta(proxy, 'descs');
  return descs[key] === delegateDesc;
}

function undefineProperty(proxy, key) {
  var descs = getMeta(proxy, 'descs');
  descs[key].teardown(proxy, key);
  delete descs[key];
  delete proxy[key];
}

function delegate(key, value) {
  if (arguments.length === 1) {
    return this.delegateGet(key);
  } else {
    // CP set notifies, so if we don't suspend
    // will be notified again
    suspendDelegateObservers(this, key, function () {
      this.delegateSet(key, value);
    });
  }
}

delegateDesc = Ember.computed(delegate).volatile();

Ember.ObjectProxy = Ember.Object.extend({
  content: null,
  delegateGet: function (key) {
    var content = get(this, 'content');
    if (content) {
      return get(content, key);
    }
  },
  delegateSet: function (key, value) {
    var content = get(this, 'content');
    if (content) {
      return set(content, key, value);
    }
  },
  willWatchProperty: function (key) {
    if (key in this) return;
    defineProperty(this, key, delegateDesc);
    addDelegateObservers(this, key);
  },
  didUnwatchProperty: function (key) {
    if (isDelegateDesc(this, key)) {
      removeDelegateObservers(this, key);
      undefineProperty(this, key);
    }
  },
  unknownProperty: function (key) {
    return this.delegateGet(key);
  },
  setUnknownProperty: function (key, value) {
    this.delegateSet(key, value);
  }
});
