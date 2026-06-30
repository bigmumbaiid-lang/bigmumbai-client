import api from '../utils/axios';

export const securityApi = {
    getSessions: ({ page = 1, limit = 30, search = '', dateFrom = '', dateTo = '', deviceType = 'all', browser = 'all' } = {}) =>
        api.get('/dashboard/sessions', {
            params: { page, limit, search, dateFrom, dateTo, deviceType, browser },
        }).then((r) => r.data),

    getBlockedIPs: () =>
        api.get('/dashboard/blocked-ips').then((r) => r.data),

    blockIP: ({ ip, reason = '' }) =>
        api.post('/dashboard/blocked-ips', { ip, reason }).then((r) => r.data),

    unblockIP: (ip) =>
        api.post('/dashboard/blocked-ips/unblock', { ip }).then((r) => r.data),
};
