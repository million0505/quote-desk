import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, units, validateDraft} from './money.js';

test('decimal input stays exact rather than accumulating binary fractions', () => {
  assert.equal(calculate([{qty:'3', price:'0.10'}]).total, 30n);
  assert.equal(calculate([{qty:'0.125', price:'12.34'}]).total, 154n);
  assert.equal(calculate([{qty:'1', price:'0.05'}], '10').discount, 1n);
});
test('discount is applied before tax, with half-up rounding at each step', () => {
  const result = calculate([{qty:'1',price:'180'}, {qty:'1',price:'45'}, {qty:'2',price:'25'}], '10', '20');
  assert.equal(result.subtotal, 27500n);
  assert.equal(result.discount, 2750n);
  assert.equal(result.tax, 4950n);
  assert.equal(result.total, 29700n);
});
test('malformed values, unsupported precision and out-of-range percentages reject', () => {
  for (const value of ['-1','1e3','Infinity','1,20','01','', '1.001']) assert.throws(() => units(value, 2, 'Price'));
  assert.throws(() => calculate([{qty:'0', price:'10'}]));
  assert.throws(() => calculate([{qty:'1',price:'10'}], '101'));
  assert.throws(() => calculate([{qty:'1',price:'10'}], '0', '100.01'));
});
test('import validates the whole draft and discards unknown properties', () => {
  const draft={version:1,seller:'Example',client:'Sample',project:'Demo',reference:'Q1',notes:'',currency:'USD',discount:'0',tax:'0',items:[{description:'Work',qty:'1',price:'25'}], untrusted:'ignored'};
  const parsed=validateDraft(draft);
  assert.equal('untrusted' in parsed, false);
  assert.equal(calculate(parsed.items).total, 2500n);
  assert.throws(() => validateDraft({...draft,version:2}));
  assert.throws(() => validateDraft({...draft,items:[{description:'Work',qty:'1',price:'NaN'}]}));
});
