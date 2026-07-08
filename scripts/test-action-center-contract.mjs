#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const captureHandler = require('../api/capture.js');

function makeResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function callCapture(body) {
  const res = makeResponse();
  await captureHandler({ method: 'POST', headers: {}, socket: {}, body }, res);
  return res;
}

class FakeElement {
  constructor(id) {
    this.id = id;
    this.value = '';
    this.checked = false;
    this.textContent = '';
    this.innerHTML = '';
    this.disabled = false;
    this.hidden = false;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.resetCount = 0;
    this.classList = {
      add() {},
      remove() {},
    };
  }

  addEventListener(event, handler) {
    this.listeners[event] = handler;
  }

  setAttribute(key, value) {
    this.attributes[key] = String(value ?? '');
  }

  getAttribute(key) {
    return this.attributes[key] ?? null;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  focus() {
    this.focused = true;
  }

  reset() {
    this.resetCount += 1;
  }
}

function buildRsvpHarness(fetchImpl) {
  const elements = new Map();
  const ids = [
    'pp-rsvp-form',
    'pp-rsvp-hearing',
    'pp-rsvp-first',
    'pp-rsvp-email',
    'pp-rsvp-consent',
    'pp-rsvp-status',
    'pp-rsvp-ics',
  ];
  for (const id of ids) elements.set(id, new FakeElement(id));

  const doc = {
    readyState: 'complete',
    body: new FakeElement('body'),
    getElementById(id) {
      return elements.get(id) || null;
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    addEventListener() {},
    execCommand() {
      return true;
    },
  };

  const win = {
    location: { href: 'https://protect30a.org/' },
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    p30aLoadContent(name) {
      assert.equal(name, 'meetings');
      return Promise.resolve({
        meetings: [
          {
            id: 'bcc-regular-cadence',
            title: 'Walton County Board of County Commissioners - Regular Meeting',
            start: '2026-07-14T16:00:00',
            end: '2026-07-14T18:00:00',
            status: 'noticed',
          },
        ],
      });
    },
    p30aCivicAction() {},
    p30aTrack() {},
  };

  const context = {
    document: doc,
    window: win,
    navigator: {},
    fetch: fetchImpl,
    Blob: class {},
    URL: {
      createObjectURL() {
        return 'blob:test';
      },
      revokeObjectURL() {},
    },
  };

  return { context, elements };
}

async function loadActionCenter(harness) {
  const source = await readFile(new URL('../assets/action-center.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, harness.context, { filename: 'assets/action-center.js' });
  await flushPromises();
}

async function flushPromises() {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}

async function submitRsvp(fetchImpl) {
  const harness = buildRsvpHarness(fetchImpl);
  await loadActionCenter(harness);

  harness.elements.get('pp-rsvp-hearing').value = 'bcc-regular-cadence';
  harness.elements.get('pp-rsvp-first').value = 'Sam';
  harness.elements.get('pp-rsvp-email').value = 'sam@example.com';
  harness.elements.get('pp-rsvp-consent').checked = true;

  const submit = harness.elements.get('pp-rsvp-form').listeners.submit;
  assert.equal(typeof submit, 'function', 'RSVP submit handler should be registered');
  submit({ preventDefault() {} });
  await flushPromises();

  return harness;
}

async function testCaptureAcceptsRsvpFields() {
  const res = await callCapture({
    formType: 'rsvp',
    fields: {
      hearingId: 'bcc-regular-cadence',
      hearingTitle: 'Walton County Board of County Commissioners - Regular Meeting',
      first: 'Sam',
      email: 'sam@example.com',
      consentReminder: true,
    },
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, formType: 'rsvp', receivedCount: 5 });
}

async function testRsvpPostsApiContractFields() {
  let postBody = null;
  await submitRsvp((url, options) => {
    assert.equal(url, '/api/capture');
    postBody = JSON.parse(options.body);
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
  });

  assert.deepEqual(Object.keys(postBody.fields).sort(), [
    'consentReminder',
    'email',
    'first',
    'hearingId',
    'hearingTitle',
  ]);
}

async function testRsvpRejectResponseShowsError() {
  const harness = await submitRsvp(() =>
    Promise.resolve({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ ok: false, error: 'records_consent_required' }),
    })
  );

  const status = harness.elements.get('pp-rsvp-status');
  assert.equal(status.getAttribute('data-tone'), 'err');
  assert.match(status.textContent, /could not/i);
  assert.equal(harness.elements.get('pp-rsvp-form').resetCount, 0);
}

await testCaptureAcceptsRsvpFields();
await testRsvpPostsApiContractFields();
await testRsvpRejectResponseShowsError();

console.log('action-center contract tests passed');
