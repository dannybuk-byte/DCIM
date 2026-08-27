#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const acceptancePath = path.join(root, 'specs/dart-v0.9/acceptance.json');
const tasksPath = path.join(root, 'specs/dart-v0.9/tasks.json');

function load(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (error) { console.error(`FAIL: cannot parse ${p}: ${error.message}`); process.exit(1); }
}

const acceptance = load(acceptancePath);
const tasks = load(tasksPath);
const acceptanceIds = new Set(acceptance.criteria.map(x => x.id));
const taskIds = new Set(tasks.tasks.map(x => x.id));
let failures = [];

if (acceptanceIds.size !== acceptance.criteria.length) failures.push('duplicate acceptance IDs');
if (taskIds.size !== tasks.tasks.length) failures.push('duplicate task IDs');

for (const task of tasks.tasks) {
  for (const dep of task.depends_on) if (!taskIds.has(dep)) failures.push(`${task.id}: missing dependency ${dep}`);
  for (const id of task.acceptance_ids) if (!acceptanceIds.has(id)) failures.push(`${task.id}: missing acceptance criterion ${id}`);
}

const referenced = new Set(tasks.tasks.flatMap(x => x.acceptance_ids));
for (const id of acceptanceIds) if (!referenced.has(id)) failures.push(`unreferenced acceptance criterion ${id}`);

if (failures.length) {
  console.error('FAIL: spec bundle consistency errors:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log(`PASS: ${acceptance.criteria.length} acceptance criteria and ${tasks.tasks.length} tasks are internally consistent.`);
