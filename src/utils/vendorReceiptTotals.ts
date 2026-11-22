export interface VendorReceiptPayableBreakdown {
  previousBalance: number;
  currentReceiptAmount: number;
  amountReceived: number;
  finalPayable: number;
}

export function getVendorReceiptPayableBreakdown({
  previousBalance,
  currentReceiptAmount,
  amountReceived,
  includePreviousBalance,
}: {
  previousBalance: number;
  currentReceiptAmount: number;
  amountReceived: number;
  includePreviousBalance: boolean;
}): VendorReceiptPayableBreakdown {
  const includedPreviousBalance = includePreviousBalance ? previousBalance : 0;

  return {
    previousBalance: includedPreviousBalance,
    currentReceiptAmount,
    amountReceived,
    finalPayable: includedPreviousBalance + currentReceiptAmount - amountReceived,
  };
}