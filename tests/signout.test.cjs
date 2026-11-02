const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('More page stops moving Sign Out once it is last', () => {
  const code = source('advanced-features.js').split('const addMoreOptions = () => {')[1].split('\n  };')[0];
  const button = {};
  let moves = 0;
  const card = {
    lastElementChild: {},
    querySelector: selector => selector === '[data-signout]' ? button : null,
    append(node) { moves++; this.lastElementChild = node; }
  };
  const context = {location: {hash: '#more'}, document: {querySelector: () => card}};
  for (let i = 0; i < 5; i++) vm.runInNewContext(`(()=>{${code}})()`, context);
  assert.equal(moves, 1);
});

for (const fails of [false, true]) {
  test(`confirmed sign-out ${fails ? 'reports failure and allows retry' : 'clears session and shows login'}`, async () => {
    let listener, calls = 0, removed = false;
    const button = {disabled: false, textContent: 'Yes, Logout'};
    const state = {signedIn: true, currentUserId: 'test-user', role: 'Admin'};
    const routes = [], messages = [];
    const context = {
      document: {
        addEventListener(type, callback) { if (type === 'click') listener = callback; },
        querySelector: () => ({remove() { removed = true; }})
      },
      window: {firebaseHub: {auth: {signOut() {
        calls++;
        return fails ? Promise.reject(new Error('Sign-out failed')) : Promise.resolve();
      }}}},
      state, save() {}, location: {hash: '#more'},
      render: route => routes.push(route), toast: message => messages.push(message)
    };
    const code = source('app.js').split("document.addEventListener('click',event=>{")[1].split('\nconst sample=')[0];
    vm.runInNewContext("document.addEventListener('click',event=>{" + code, context);
    const event = {
      target: {closest: selector => selector === '[data-confirm-signout]' ? button : null},
      preventDefault() {}, stopImmediatePropagation() {}
    };
    listener(event);
    listener(event);
    assert.equal(button.disabled, true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 1);
    assert.equal(state.signedIn, fails);
    assert.equal(removed, !fails);
    if (fails) {
      assert.equal(button.disabled, false);
      assert.match(messages[0], /Could not sign out/);
      assert.equal(routes.length, 0);
    } else {
      assert.equal(state.currentUserId, '');
      assert.equal(context.location.hash, 'login');
      assert.deepEqual(routes, ['login']);
    }
  });
}
