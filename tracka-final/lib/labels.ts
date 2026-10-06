export const CL: Record<string, string> = { draft: 'Draft', payment_submitted: 'Checking payment', review: 'Song in review', changes: 'New version needed', active: 'On the road', completed: 'Done' };
export const BL: Record<string, string> = {
  pending_payment: 'Waiting', booked: 'Booked', scheduled: 'Scheduled', live: 'Live', proof_submitted: 'Proof sent', disputed: 'Problem reported',
  approved: 'Approved', paid_out: 'Paid', declined: 'Declined', refunded: 'Refunded',
};
export const TONE: Record<string, string> = {
  draft: 'p-muted', payment_submitted: 'p-sky', review: 'p-yellow', changes: 'p-red', active: 'p-sky', completed: 'p-green',
  pending_payment: 'p-muted', booked: 'p-sky', scheduled: 'p-sky', live: 'p-yellow', proof_submitted: 'p-yellow', disputed: 'p-red',
  approved: 'p-green', paid_out: 'p-green', declined: 'p-red', refunded: 'p-muted',
};
export const fee = (total: number, pct: number) => Math.round((total * (Number(pct) || 0)) / 100);
