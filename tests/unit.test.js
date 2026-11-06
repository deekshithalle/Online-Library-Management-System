const test=require("node:test");const assert=require("node:assert/strict");
function fine(due,returned,rate=5){const days=Math.max(0,Math.ceil((new Date(returned)-new Date(due))/86400000));return {days,amount:days*rate}}
test("no fine when returned on due date",()=>assert.deepEqual(fine("2026-11-01","2026-11-01"),{days:0,amount:0}));
test("fine calculated for overdue days",()=>assert.deepEqual(fine("2026-11-01","2026-11-04",5),{days:3,amount:15}));
test("configured daily fine rate is applied",()=>assert.deepEqual(fine("2026-11-01","2026-11-08",10),{days:7,amount:70}));
