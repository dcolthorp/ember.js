module("Ember.Routable");

var locationStub = {
  getURL: function() {},
  setURL: function() {}
};

test("it should have its updateRoute method called when it is entered", function() {
  expect(2);


  var state = Ember.State.create({
    route: 'foo',
    updateRoute: function(manager, location) {
      ok(true, "updateRoute was called");
      strictEqual(location, locationStub);
    }
  });

  var router = Ember.Router.create({
    location: locationStub,
    start: Ember.State.create({
      ready: function(manager) {
        manager.goToState('initial');
      },

      initial: state
    })
  });

  router.send('ready');
});

test("when you call `route` on the Router with an absolute path, it calls it on the topmost routable State", function() {
  expect(2);

  var router = Ember.Router.create({
    location: locationStub,
    start: Ember.State.create({
      ready: function(manager) {
        manager.goToState('parent.child');
      },

      parent: Ember.State.create({
        route: "/",

        child: Ember.State.create({
          route: "/child"
        })
      }),

      routePath: function(manager, path) {
        equal(path, 'hookers/and/blow', "correct path is passed to router");
      }
    })

  });

  router.send('ready');
  router.route('/hookers/and/blow');
  router.route('/hookers/and/blow');
});

test("when you call `route` on the Router with a relative path, it calls it on the current state", function() {
  expect(2);

  var router = Ember.Router.create({
    location: locationStub,
    start: Ember.State.create({
      ready: function(manager) {
        manager.goToState('parent.child');
      },

      parent: Ember.State.create({
        route: "/",

        child: Ember.State.create({
          route: "/child",
          routePath: function(manager, path) {
            equal(path, 'hookers/and/blow', "correct path is passed to router");
          }
        })
      })
    })

  });

  router.send('ready');
  router.route('hookers/and/blow');
  router.route('hookers/and/blow');
});

test("a RouteMatcher matches routes", function() {
  var match;

  var matcher = Ember._RouteMatcher.create({
    route: "foo"
  });

  match = matcher.match('foo');
  equal(match.remaining, "");
  deepEqual(match.hash, {});

  match = matcher.match('foo/bar');
  equal(match.remaining, "/bar");
  deepEqual(match.hash, {});

  match = matcher.match('bar');
  equal(match, undefined);
});

test("a RouteMatcher matches routes with dynamic segments", function() {
  var match;

  var matcher = Ember._RouteMatcher.create({
    route: "foo/:id/:name/:ok_tom"
  });

  match = matcher.match('foo/bar/baz/sigh');
  equal(match.remaining, "");
  deepEqual(match.hash, {"id": "bar", "name": "baz", "ok_tom": "sigh"});

  match = matcher.match('foo/bar/baz/common/bro');
  equal(match.remaining, "/bro");
  deepEqual(match.hash, {"id": "bar", "name": "baz", "ok_tom": "common"});

  match = matcher.match('foo/bar');
  equal(match, undefined);
});

test("a RouteMatcher generates routes with dynamic segments", function() {
  var url;

  var matcher = Ember._RouteMatcher.create({
    route: "foo/:id/:first_name"
  });

  url = matcher.generate({ id: 1, first_name: "Yehuda" });
  equal(url, "foo/1/Yehuda");
});

test("route repeatedly descends into a nested hierarchy", function() {
  var state = Ember.State.create({
    fooChild: Ember.State.create({
      route: 'foo',

      barChild: Ember.State.create({
        route: 'bar',

        bazChild: Ember.State.create({
          route: 'baz'
        })
      })
    })
  });

  var router = Ember.Router.create({
    start: state
  });

  router.route("/foo/bar/baz");

  equal(router.getPath('currentState.path'), 'start.fooChild.barChild.bazChild');
});

test("when you descend into a state, the route is set", function() {
  var state = Ember.State.create({
    ready: function(manager) {
      manager.transitionTo('fooChild.barChild.bazChild');
    },

    fooChild: Ember.State.create({
      route: 'foo',

      barChild: Ember.State.create({
        route: 'bar',

        bazChild: Ember.State.create({
          route: 'baz'
        })
      })
    })
  });

  var count = 0;

  var router = Ember.Router.create({
    start: state,
    location: {
      setURL: function(url) {
        if (count === 0) {
          equal(url, '/foo/bar/baz', "The current URL should be passed in");
          count++;
        } else {
          ok(false, "Should not get here");
        }
      }
    }
  });

  router.send('ready');
});

var router;
var Post = {
  find: function(id) {
    return { isPerson: true, id: parseInt(id, 10) };
  }
};

var setURL;
var locationMock = {
  setURL: function(url) {
    setURL = url;
  }
};

module("Routing Serialization and Deserialization", {
  setup: function() {
    router = Ember.Router.create({
      location: locationMock,
      start: Ember.State.create({
        ready: function(manager, post) {
          manager.transitionTo('post.show', { post: post });
        },

        showIndex: function(manager) {
          manager.transitionTo('post.index');
        },

        post: Ember.State.create({
          route: '/posts',

          index: Ember.State.create({
            route: '/',

            showPost: function(manager, post) {
              manager.transitionTo('post.show', { post: post });
            }
          }),

          show: Ember.State.create({
            route: "/:post_id",

            connectOutlets: function(manager, context) {
              equal(context.post.id, 2, "should be the same value regardless of entry point");
            },

            deserialize: function(manager, params) {
              return { post: Post.find(params['post_id']) };
            },

            serialize: function(manager, hash) {
              return { post_id: hash.post.id };
            },

            showIndex: function(manager) {
              manager.transitionTo('index');
            }
          })
        })
      })
    });
  }
});

test("should invoke the deserialize method on a state when it is entered via a URL", function() {
  expect(1);

  router.route('/posts/2');
});

test("should invoke the serialize method on a state when it is entered programmatically (initially deep)", function() {
  expect(3);

  router.send('ready', Post.find(2));
  equal(setURL, '/posts/2', "The post is serialized");

  router.send('showIndex');
  equal(setURL, '/posts');
});

test("should invoke the serialize method on a state when it is entered programmatically (initially shallow)", function() {
  expect(3);

  router.send('showIndex');
  equal(setURL, '/posts', "The post is serialized");

  router.send('showPost', Post.find(2));
  equal(setURL, '/posts/2');
});

var url, firstPost, firstUser;

module("default serialize and deserialize with modelType", {
  setup: function() {
    window.TestApp = Ember.Namespace.create();
    window.TestApp.Post = Ember.Object.extend();
    window.TestApp.Post.find = function(id) {
      if (id === "1") { return firstPost; }
    };

    window.TestApp.User = Ember.Object.extend();
    window.TestApp.User.find = function(id) {
      if (id === "1") { return firstUser; }
    };

    firstPost = window.TestApp.Post.create({ id: 1 });
    firstUser = window.TestApp.User.create({ id: 1 });

    router = Ember.Router.create({
      location: {
        setURL: function(passedURL) {
          url = passedURL;
        }
      },

      initialState: 'root',
      root: Ember.State.extend({
        post: Ember.State.extend({
          route: '/posts/:post_id',
          modelType: 'TestApp.Post',

          connectOutlets: function(router, post) {
            equal(post, firstPost, "the post should have deserialized correctly");
          }
        }),

        user: Ember.State.extend({
          route: '/users/:user_id',
          modelType: window.TestApp.User,

          connectOutlets: function(router, user) {
            equal(user, firstUser, "the post should have deserialized correctly");
          }
        })
      })
    });
  },

  teardown: function() {
    window.TestApp = undefined;
  }
});

test("should use a specified String `modelType` in the default `serialize`", function() {
  router.transitionTo('post', firstPost);
  equal(url, "/posts/1");
});

test("should use a specified String `modelType` in the default `deserialize`", function() {
  expect(1);

  router.route("/posts/1");
});

test("should use a specified class `modelType` in the default `serialize`", function() {
  router.transitionTo('user', firstUser);
  equal(url, "/users/1");
});

test("should use a specified class `modelType` in the default `deserialize`", function() {
  expect(1);

  router.route("/users/1");
});

module("default serialize and deserialize without modelType", {
  setup: function() {
    window.TestApp = Ember.Namespace.create();
    window.TestApp.Post = Ember.Object.extend();
    window.TestApp.Post.find = function(id) {
      if (id === "1") { return firstPost; }
    };

    window.TestApp.User = Ember.Object.extend();
    window.TestApp.User.find = function(id) {
      if (id === "1") { return firstUser; }
    };

    firstPost = window.TestApp.Post.create({ id: 1 });
    firstUser = window.TestApp.User.create({ id: 1 });

    router = Ember.Router.create({
      namespace: window.TestApp,

      location: {
        setURL: function(passedURL) {
          url = passedURL;
        }
      },

      initialState: 'root',
      root: Ember.State.extend({
        post: Ember.State.extend({
          route: '/posts/:post_id',

          connectOutlets: function(router, post) {
            equal(post, firstPost, "the post should have deserialized correctly");
          }
        })
      })
    });
  },

  teardown: function() {
    window.TestApp = undefined;
  }
});

test("should use a specified String `modelType` in the default `serialize`", function() {
  router.transitionTo('post', firstPost);
  equal(url, "/posts/1");
});

test("should use a specified String `modelType` in the default `deserialize`", function() {
  expect(1);

  router.route("/posts/1");
});
