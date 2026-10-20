// Guard against the dashboard's most expensive class of bug: a reference to a
// variable that is not in scope.
//
// The Analytics tab once shipped with `analyticsLoading is not defined` and
// crashed for every admin. `next build` does not catch it -- the reference only
// resolves when React renders that branch -- and the repo has no ESLint config,
// so nothing did. This walks app/dashboard/page.js and fails if any identifier
// is referenced that is not declared in an enclosing scope and is not a known
// browser/JS global.
//
// Run: node scripts/test-dashboard-scope.mjs
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const parser = require('next/dist/compiled/babel/parser');

// Identifiers that exist without being declared in this file.
const GLOBALS = new Set([
  'undefined', 'NaN', 'Infinity', 'globalThis',
  'Object', 'Array', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt',
  'Math', 'JSON', 'Date', 'RegExp', 'Error', 'TypeError', 'RangeError',
  'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Proxy', 'Reflect',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent',
  'decodeURIComponent', 'encodeURI', 'decodeURI', 'structuredClone',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask',
  'window', 'document', 'navigator', 'location', 'history', 'localStorage',
  'sessionStorage', 'console', 'alert', 'confirm', 'prompt', 'fetch',
  'URL', 'URLSearchParams', 'Blob', 'File', 'FormData', 'Headers',
  'Request', 'Response', 'AbortController', 'TextEncoder', 'TextDecoder',
  'Intl', 'process', 'arguments', 'require', 'module', 'exports',
]);

const isFn = (t) => /Function/.test(t);
const isScope = (t) => t === 'Program' || t === 'BlockStatement'
  || isFn(t) || t === 'CatchClause' || t === 'StaticBlock';

// Names a binding pattern introduces.
function patternNames(node, out) {
  if (!node) return;
  switch (node.type) {
    case 'Identifier': out.add(node.name); break;
    case 'ObjectPattern':
      for (const p of node.properties) {
        if (p.type === 'RestElement') patternNames(p.argument, out);
        else patternNames(p.value, out);
      }
      break;
    case 'ArrayPattern':
      for (const el of node.elements) patternNames(el, out);
      break;
    case 'AssignmentPattern': patternNames(node.left, out); break;
    case 'RestElement': patternNames(node.argument, out); break;
    default: break;
  }
}

// Bindings a single statement introduces into its enclosing scope. A whole
// scope's declarations are collected up front so hoisting and ordering cannot
// produce a false positive.
function statementNames(stmt, out) {
  if (!stmt) return;
  switch (stmt.type) {
    case 'VariableDeclaration':
      for (const d of stmt.declarations) patternNames(d.id, out);
      break;
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
      if (stmt.id) out.add(stmt.id.name);
      break;
    case 'ImportDeclaration':
      for (const s of stmt.specifiers) out.add(s.local.name);
      break;
    case 'ExportNamedDeclaration':
    case 'ExportDefaultDeclaration':
      if (stmt.declaration) statementNames(stmt.declaration, out);
      break;
    // `for (const x of xs)` / `for (let i = 0; ...)` bind in the loop's own
    // scope, which is not a scope body, so collect them here.
    case 'ForStatement':
      if (stmt.init) statementNames(stmt.init, out);
      break;
    case 'ForInStatement':
    case 'ForOfStatement':
      statementNames(stmt.left, out);
      break;
    default: break;
  }
}

function ownBindings(node) {
  const out = new Set();
  if (node.type === 'Program' || node.type === 'BlockStatement'
      || node.type === 'StaticBlock') {
    for (const s of node.body) statementNames(s, out);
  } else if (isFn(node.type)) {
    for (const p of node.params) patternNames(p, out);
    if (node.id) out.add(node.id.name);
    if (node.body && node.body.type === 'BlockStatement') {
      for (const s of node.body.body) statementNames(s, out);
    }
  } else if (node.type === 'CatchClause') {
    patternNames(node.param, out);
  }
  return out;
}

// Keys whose Identifier value is a name, not a reference to a variable.
function isNameSlot(node, key) {
  switch (node.type) {
    case 'MemberExpression':
    case 'OptionalMemberExpression':
      return key === 'property' && !node.computed;
    // Babel emits ObjectProperty/ObjectMethod, not ESTree's Property.
    case 'ObjectProperty':
    case 'ObjectMethod':
    case 'ClassProperty':
    case 'ClassMethod':
    case 'ClassPrivateProperty':
    case 'ClassPrivateMethod':
    case 'PropertyDefinition':
    case 'MethodDefinition':
      return key === 'key' && !node.computed;
    case 'ImportSpecifier': return key === 'imported';
    case 'ImportDefaultSpecifier':
    case 'ImportNamespaceSpecifier': return key === 'local';
    case 'ExportSpecifier': return key === 'exported';
    case 'LabeledStatement':
    case 'BreakStatement':
    case 'ContinueStatement': return key === 'label';
    case 'JSXAttribute': return key === 'name';
    case 'JSXMemberExpression': return key === 'property';
    default: return false;
  }
}

// Keys that hold a binding pattern (bound by the declaration, not read).
function isBindingSlot(node, key) {
  if (node.type === 'VariableDeclarator' && key === 'id') return true;
  if (isFn(node.type) && key === 'params') return true;
  if (node.type === 'CatchClause' && key === 'param') return true;
  if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
    return key === 'id';
  }
  if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
    return key === 'id';
  }
  return false;
}

function walk(node, scopes, findings) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const x of node) walk(x, scopes, findings); return; }
  if (typeof node.type !== 'string') return;

  const next = isScope(node.type)
    ? new Set([...scopes, ...ownBindings(node)])
    : scopes;

  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'range') continue;
    const v = node[key];
    if (!v || typeof v !== 'object') continue;
    if (isNameSlot(node, key) || isBindingSlot(node, key)) continue;

    if (v.type === 'Identifier') {
      if (!next.has(v.name) && !GLOBALS.has(v.name)) {
        findings.push({ name: v.name, line: v.loc?.start?.line });
      }
      continue;
    }
    walk(v, next, findings);
  }
}

const findings = [];
const target = process.argv[2] || 'app/dashboard/page.js';
const targetPath = target.startsWith('/') ? target : join(ROOT, target);
walk(parser.parse(readFileSync(targetPath, 'utf8'),
  { sourceType: 'module', plugins: ['jsx'] }), new Set(), findings);

const seen = new Set();
const unique = findings.filter((f) => {
  const k = `${f.name}:${f.line}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

console.log('Dashboard scope');
console.log('---------------');
if (unique.length === 0) {
  console.log('  [PASS] every identifier in app/dashboard/page.js is in scope');
} else {
  for (const f of unique) {
    console.log(`  [FAIL] '${f.name}' is referenced but never declared (line ${f.line})`);
  }
  console.log(`\n  ${unique.length} undefined identifier(s) -- the dashboard throws when it renders that branch.`);
}
process.exit(unique.length === 0 ? 0 : 1);
