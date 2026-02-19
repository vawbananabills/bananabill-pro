import { useState, useEffect } from 'react';
import { VendorReceiptDialog } from './VendorReceiptDialog';
import { OPEN_VENDOR_RECEIPT_DIALOG_EVENT } from '@/components/GlobalKeyboardShortcuts';

export function GlobalVendorReceiptDialog() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handleOpen = () => setOpen(true);
        window.addEventListener(OPEN_VENDOR_RECEIPT_DIALOG_EVENT, handleOpen);
        return () => window.removeEventListener(OPEN_VENDOR_RECEIPT_DIALOG_EVENT, handleOpen);
    }, []);

    return <VendorReceiptDialog open={open} onOpenChange={setOpen} />;
}
