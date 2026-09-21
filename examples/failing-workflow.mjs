// Purpose: Reproduce a fictional stock-check failure while demonstrating removable tool metadata.
export const tools = { stock: async () => ({ available: 0, warehouse: 'fictional', debug: 'irrelevant metadata', supplierNote: 'synthetic' }) };
export async function run({ input, call }) {
  const stock = await call('stock', { sku: input.sku });
  if (stock.available < 1) throw new Error('No stock available');
  return { reserved: true };
}
