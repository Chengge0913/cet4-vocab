const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

test('upgrading from v1 keeps the old cache until activation and serves every new asset offline', async () => {
  const root = path.join(__dirname, '..', 'dist');
  const scope = 'https://example.test/practice/';
  const oldCache = 'ciyu-cet4-/practice/-v1';
  const unrelated = 'another-app-cache';
  const stores = new Map([[oldCache, new Map()], [unrelated, new Map()]]);
  const events = {};
  let online = true;

  async function network(request) {
    assert.ok(online, 'request escaped the offline cache: ' + request.url);
    const name = request.url.slice(scope.length) || 'index.html';
    return new Response(await fs.readFile(path.join(root, name)));
  }
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async addAll(requests) {
          for (const request of requests) entries.set(request.url, await network(request));
        },
        async match(request, options) {
          const key = new URL(request.url || request, scope);
          if (options?.ignoreSearch) key.search = '';
          return entries.get(key.href)?.clone();
        }
      };
    }
  };
  const context = vm.createContext({
    caches, URL, fetch: network,
    Request: class extends Request {
      constructor(url, options) { super(new URL(url, scope), options); }
    },
    self: {
      registration: {scope},
      addEventListener(type, listener) { events[type] = listener; },
      clients: {async claim() {}}
    }
  });
  vm.runInContext(await fs.readFile(path.join(root, 'service-worker.js'), 'utf8'), context);
  async function runLifecycle(name) {
    let completion;
    events[name]({waitUntil(task) { completion = task; }});
    await completion;
  }
  async function load(name, mode) {
    let response;
    events.fetch({
      request: {url: new URL(name, scope).href, method: 'GET', mode},
      respondWith(task) { response = task; }
    });
    return response;
  }
  await runLifecycle('install');
  assert.ok(stores.has(oldCache));
  assert.equal(stores.size, 3);
  await runLifecycle('activate');
  assert.ok(!stores.has(oldCache));
  assert.ok(stores.has(unrelated));
  online = false;
  assert.match(await (await load('./', 'navigate')).text(), /刷词工作台/);
  for (const name of await fs.readdir(root, {recursive:true})) {
    if (name === 'service-worker.js' || !(await fs.stat(path.join(root, name))).isFile()) continue;
    const response = await load(name + '?offline-check', 'cors');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await fs.readFile(path.join(root, name)), name);
  }
});
