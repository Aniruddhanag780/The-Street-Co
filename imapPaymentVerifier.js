export async function verifyUpiPaymentViaImap({
  user = '',
  pass = '',
  amount = 0,
  orderId = '',
  sinceEpoch = 0
} = {}) {
  return {
    verified: false,
    reason: 'not_configured',
    message: 'UPI payment verification is disabled in this build. Configure IMAP support or disable the feature to keep the app running.',
    checkedCount: 0,
    amount,
    orderId,
    sinceEpoch,
    user: user || null,
    pass: pass ? '[redacted]' : null
  };
}

export default {
  verifyUpiPaymentViaImap
};
