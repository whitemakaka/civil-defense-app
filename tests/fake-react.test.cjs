const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createFakeReact, loadTs } = require('./fake-react.cjs');

const root = path.resolve(__dirname, '..');

test('useState counter with value and functional updates', () => {
  const { React, render, rerender } = createFakeReact();
  let inits = 0;
  const useCounter = start => {
    const [count, setCount] = React.useState(() => { inits++; return start; });
    return { count, setCount };
  };
  const first = render(useCounter, 5);
  assert.equal(first.count, 5);
  first.setCount(c => c + 1);
  first.setCount(c => c + 1);
  assert.equal(rerender().count, 7);
  const second = rerender();
  assert.equal(second.setCount, first.setCount);
  second.setCount(1);
  assert.equal(rerender().count, 1);
  assert.equal(inits, 1);
});

test('useRef keeps the same object across renders', () => {
  const { React, render, rerender } = createFakeReact();
  const useBox = () => React.useRef(0);
  const ref = render(useBox);
  ref.current = 42;
  assert.equal(rerender(), ref);
  assert.equal(ref.current, 42);
});

test('useEffect runs cleanup on deps change and on unmount', () => {
  const { React, render, rerender, unmount } = createFakeReact();
  const log = [];
  const useLogger = dep => {
    React.useEffect(() => {
      log.push(`effect:${dep}`);
      return () => log.push(`cleanup:${dep}`);
    }, [dep]);
  };
  render(useLogger, 'a');
  assert.deepEqual(log, ['effect:a']);
  rerender();
  assert.deepEqual(log, ['effect:a']);
  render(useLogger, 'b');
  assert.deepEqual(log, ['effect:a', 'cleanup:a', 'effect:b']);
  unmount();
  assert.deepEqual(log, ['effect:a', 'cleanup:a', 'effect:b', 'cleanup:b']);
});

test('useEffect deps driven by state; no deps runs every render', () => {
  const { React, render, rerender, unmount } = createFakeReact();
  const log = [];
  const useThing = () => {
    const [n, setN] = React.useState(0);
    React.useEffect(() => { log.push(`n=${n}`); return () => log.push(`un=${n}`); }, [n]);
    React.useEffect(() => { log.push('always'); });
    return setN;
  };
  const setN = render(useThing);
  rerender();
  setN(1);
  rerender();
  unmount();
  assert.deepEqual(log, ['n=0', 'always', 'always', 'un=0', 'n=1', 'always', 'un=1']);
});

test('useMemo and useCallback keep identity for same deps and change for new deps', () => {
  const { React, render, rerender } = createFakeReact();
  let computed = 0;
  const useThings = dep => {
    const memo = React.useMemo(() => { computed++; return { dep }; }, [dep]);
    const cb = React.useCallback(() => dep, [dep]);
    return { memo, cb };
  };
  const a = render(useThings, 1);
  const b = rerender();
  assert.equal(b.memo, a.memo);
  assert.equal(b.cb, a.cb);
  assert.equal(computed, 1);
  const c = render(useThings, 2);
  assert.notEqual(c.memo, a.memo);
  assert.notEqual(c.cb, a.cb);
  assert.equal(c.cb(), 2);
  assert.equal(computed, 2);
});

test('loadTs transpiles a TS module and honours mocks', () => {
  const { formatNoteText } = loadTs(root, 'src/features/search/utils/displayText.ts');
  assert.equal(formatNoteText(['a', 'b']), '• a\n• b');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-react-'));
  try {
    fs.writeFileSync(path.join(dir, 'useToggle.ts'), [
      "import React, { useCallback, useState } from 'react';",
      'export function useToggle(initial: boolean) {',
      '  const [on, setOn] = useState<boolean>(initial);',
      '  const toggle = useCallback(() => setOn(v => !v), []);',
      '  return { on, toggle, same: React.useState === useState };',
      '}',
    ].join('\n'));
    const { React, render, rerender } = createFakeReact();
    const { useToggle } = loadTs(dir, 'useToggle.ts', { react: React });
    const first = render(useToggle, false);
    assert.equal(first.on, false);
    assert.equal(first.same, true);
    first.toggle();
    assert.equal(rerender().on, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
