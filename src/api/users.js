import api from '../utils/axios';

// All user-related endpoints in one place. The axios interceptor handles auth,
// so callers no longer pass tokens/headers. Each method returns response.data.
export const usersApi = {
  list: ({ page, limit, search, filter, sort }) =>
    api.get('/user', { params: { page, limit, search, filter, sort } }).then((r) => r.data),

  toggleWithdrawal: (userId) =>
    api.patch(`/user/${userId}/toggle-withdrawal`).then((r) => r.data),

  transferBalance: ({ userId, amount, transferType, remark, password, deductFull, percentage }) =>
    api
      .post('/dashboard/transfer-balance', { userId, amount, transferType, remark, password, deductFull, percentage })
      .then((r) => r.data),

  resetPassword: ({ userId, type, newPassword }) =>
    api.post(`/user/${userId}/reset-password`, { type, newPassword }).then((r) => r.data),

  getBankCard: (userId) =>
    api.get(`/user/${userId}/bank-card`).then((r) => r.data),

  updateBankCard: (userId, payload) =>
    api.put(`/user/${userId}/bank-card`, payload).then((r) => r.data),

  deleteBankCard: (userId) =>
    api.delete(`/user/${userId}/bank-card`).then((r) => r.data),

  toggleBetting: (userId) =>
    api.patch(`/user/${userId}/toggle-betting`).then((r) => r.data),

  toggleAccountStatus: (userId) =>
    api.patch(`/user/${userId}/toggle-status`).then((r) => r.data),

  toggleRole: (userId) =>
    api.patch(`/user/${userId}/toggle-role`).then((r) => r.data),

  toggleRoyalSpin: (userId) =>
    api.patch(`/user/${userId}/toggle-royalspin`).then((r) => r.data),

  toggleRoyalSpinLogin: (userId) =>
    api.patch(`/user/${userId}/toggle-royalspin-login`).then((r) => r.data),

  listBankCards: (params) =>
    api.get('/user/bank-cards', { params }).then((r) => r.data),

  verifyBankCard: (userId) =>
    api.put(`/user/${userId}/bank-card`, { isVerified: true }).then((r) => r.data),
};
