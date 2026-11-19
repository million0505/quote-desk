export function units(value, decimals, label) {
  if (typeof value !== 'string') throw new Error(`${label} must be text`);
  const match = value.trim().match(new RegExp(`^(0|[1-9][0-9]{0,8})(?:\\.([0-9]{1,${decimals}}))?$`));
  if (!match) throw new Error(`${label}: use a nonnegative decimal with at most ${decimals} decimal places`);
  return BigInt(match[1]) * 10n ** BigInt(decimals) + BigInt((match[2] || '').padEnd(decimals, '0') || '0');
}

const rounded = (numerator, denominator) => (numerator + denominator / 2n) / denominator;

export function calculate(items, discount = '0', tax = '0') {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw new Error('Use 1 to 50 line items');
  const lines = items.map(item => {
    const quantity = units(item.qty, 3, 'Quantity');
    const price = units(item.price, 2, 'Unit price');
    if (quantity === 0n) throw new Error('Quantity must be greater than zero');
    return rounded(quantity * price, 1000n);
  });
  const subtotal = lines.reduce((sum, amount) => sum + amount, 0n);
  if (subtotal > 9_000_000_000_000n) throw new Error('Quote exceeds the supported amount');
  const discountRate = units(discount, 2, 'Discount');
  const taxRate = units(tax, 2, 'Tax');
  if (discountRate > 10000n || taxRate > 10000n) throw new Error('Percentages must be between 0 and 100');
  const reduction = rounded(subtotal * discountRate, 10000n);
  const taxable = subtotal - reduction;
  const taxAmount = rounded(taxable * taxRate, 10000n);
  return {lines, subtotal, discount:reduction, tax:taxAmount, total:taxable + taxAmount};
}

export function validateDraft(value) {
  if (!value || typeof value !== 'object' || value.version !== 1) throw new Error('Unsupported draft version');
  const result = {version:1};
  const fields = {seller:120, client:120, project:160, reference:50, notes:2000, currency:3, discount:12, tax:12};
  for (const [name, limit] of Object.entries(fields)) {
    if (typeof value[name] !== 'string' || value[name].length > limit) throw new Error(`Invalid ${name}`);
    result[name] = value[name];
  }
  if (!['USD','EUR','UAH'].includes(value.currency)) throw new Error('Unsupported currency');
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 50) throw new Error('Use 1 to 50 items');
  result.items = value.items.map(item => {
    if (!item || typeof item.description !== 'string' || item.description.length > 300) throw new Error('Invalid line description');
    return {description:item.description, qty:item.qty, price:item.price};
  });
  calculate(result.items, result.discount, result.tax);
  return result;
}
