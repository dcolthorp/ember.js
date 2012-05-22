require('ember-states/state');
require('ember-states/route_matcher');
require('ember-states/routable');

var get = Ember.get;

Ember.Router = Ember.StateManager.extend({
  route: function(path) {
    var state = get(this, 'currentState');

    if (path.charAt(0) === '/') {
      path = path.substr(1);

      var parent;
      while (get(state, 'route') && (parent = get(state, 'parentState'))) { 
        state = parent; 
      }
    }


    state.routePath(this, path);
  }
});
