/**
 * Shared fake React for hook tests (contract K9). Not a test file itself
 * (no `.test.cjs` suffix), so `node --test tests/*.test.cjs` skips it.
 *
 * API:
 *   const { createFakeReact, loadTs } = require('./fake-react.cjs');
 *   const { React, render, rerender, unmount } = createFakeReact();
 *
 *   React: useState, useRef, useCallback, useMemo, useEffect, createElement.
 *     Hooks are slot-based: call order must be stable between renders, as in React.
 *     - useState(initial | () => initial) -> [value, setValue]; setValue accepts a
 *       value or an updater fn (prev => next). The setter is identity-stable and
 *       only stores the state; the test calls rerender() itself.
 *     - useRef(initial) -> stable { current } object.
 *     - useMemo(factory, deps) / useCallback(fn, deps): recomputed only when deps
 *       change (Object.is per item; missing deps -> every render).
 *     - useEffect(effect, deps): runs synchronously after each render when deps
 *       changed (or on mount / no deps); previous cleanup runs first.
 *   render(hook, ...args) -> hook output. Mounts the hook and runs effects.
 *     If the same hook is already mounted, re-renders it with the new args and
 *     keeps its state (like new props); a different hook unmounts the old one.
 *   rerender() -> hook output, re-run with the last args, then effects.
 *   unmount() -> runs all pending effect cleanups (in slot order) and resets.
 *
 *   loadTs(root, relFile, mocks = {}) -> module.exports of a TS/TSX file
 *     transpiled with the repo's typescript (CommonJS, ES2022, jsx React,
 *     esModuleInterop). `require(spec)` returns mocks[spec] when the specifier is
 *     an own key of `mocks` (exact match), else falls back to Node require.
 *     Pass `{ react: React }` to inject the fake. Other .ts/.tsx imports must be
 *     supplied through `mocks` (e.g. via another loadTs call).
 */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function depsChanged(prev, next) {
  if (!prev || !next) return true;
  if (prev.length !== next.length) return true;
  for (let i = 0; i < next.length; i++) {
    if (!Object.is(prev[i], next[i])) return true;
  }
  return false;
}

function createFakeReact() {
  let slots = [];
  let index = 0;
  let pendingEffects = [];
  let mounted = false;
  let currentHook = null;
  let currentArgs = [];
  let rendering = false;

  function nextSlot(init) {
    if (!rendering) throw new Error('fake-react: hook called outside render');
    const i = index++;
    if (i >= slots.length) slots[i] = init();
    return slots[i];
  }

  function useState(initial) {
    const slot = nextSlot(() => {
      const s = { value: typeof initial === 'function' ? initial() : initial };
      s.set = update => {
        if (!mounted) return;
        s.value = typeof update === 'function' ? update(s.value) : update;
      };
      return s;
    });
    return [slot.value, slot.set];
  }

  function useRef(initial) {
    return nextSlot(() => ({ ref: { current: initial } })).ref;
  }

  function useMemo(factory, deps) {
    const slot = nextSlot(() => ({ deps: undefined, value: undefined, init: false }));
    if (!slot.init || depsChanged(slot.deps, deps)) {
      slot.value = factory();
      slot.deps = deps;
      slot.init = true;
    }
    return slot.value;
  }

  function useCallback(fn, deps) {
    return useMemo(() => fn, deps);
  }

  function useEffect(effect, deps) {
    const slot = nextSlot(() => ({ deps: undefined, cleanup: undefined, init: false }));
    if (!slot.init || depsChanged(slot.deps, deps)) {
      slot.init = true;
      slot.deps = deps;
      pendingEffects.push({ slot, effect });
    }
  }

  function createElement(type, props, ...children) {
    return { type, props: { ...(props || {}), children } };
  }

  const React = { useState, useRef, useCallback, useMemo, useEffect, createElement };

  function runRender() {
    index = 0;
    pendingEffects = [];
    rendering = true;
    let output;
    try {
      output = currentHook(...currentArgs);
    } finally {
      rendering = false;
    }
    mounted = true;
    const effects = pendingEffects;
    pendingEffects = [];
    for (const { slot, effect } of effects) {
      if (typeof slot.cleanup === 'function') slot.cleanup();
      slot.cleanup = undefined;
      const cleanup = effect();
      slot.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
    }
    return output;
  }

  function render(hook, ...args) {
    if (mounted && currentHook !== hook) unmount();
    currentHook = hook;
    currentArgs = args;
    return runRender();
  }

  function rerender() {
    if (!currentHook) throw new Error('fake-react: rerender() before render()');
    if (!mounted) throw new Error('fake-react: rerender() after unmount()');
    return runRender();
  }

  function unmount() {
    if (!mounted) return;
    mounted = false;
    for (const slot of slots) {
      if (slot && typeof slot.cleanup === 'function') {
        const cleanup = slot.cleanup;
        slot.cleanup = undefined;
        cleanup();
      }
    }
    slots = [];
    index = 0;
  }

  return { React, render, rerender, unmount };
}

function loadTs(root, relFile, mocks = {}) {
  const filename = path.join(root, relFile);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const localRequire = Module.createRequire(filename);
  mod.require = name => (Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name));
  mod._compile(compiled, filename);
  return mod.exports;
}

module.exports = { createFakeReact, loadTs };
