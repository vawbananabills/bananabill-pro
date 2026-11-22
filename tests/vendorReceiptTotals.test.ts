import { describe, expect, it } from 'bun:test';
import { getVendorReceiptPayableBreakdown } from '../src/utils/vendorReceiptTotals';

describe('vendor receipt payable breakdown', () => {
  it('adds included previous balance and current receipt, then subtracts amount received', () => {
    const breakdown = getVendorReceiptPayableBreakdown({
      previousBalance: 250,
      currentReceiptAmount: 1000,
      amountReceived: 300,
      includePreviousBalance: true,
    });

    expect(breakdown).toEqual({
      previousBalance: 250,
      currentReceiptAmount: 1000,
      amountReceived: 300,
      finalPayable: 950,
    });
  });

  it('leaves previous balance out when it is not included', () => {
    const breakdown = getVendorReceiptPayableBreakdown({
      previousBalance: 250,
      currentReceiptAmount: 1000,
      amountReceived: 300,
      includePreviousBalance: false,
    });

    expect(breakdown.finalPayable).toBe(700);
    expect(breakdown.previousBalance).toBe(0);
  });
});