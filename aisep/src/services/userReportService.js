import { apiClient } from './apiClient';

/**
 * User Report Service (Complaints/Violations)
 * 
 * UserReportResponse: {
 *   userReportId, reporterId, reporterName, targetUserId?, targetUserName?,
 *   bookingId?, category, description, evidenceImages?, videoEvidenceUrl?,
 *   status (Pending, Valid, False), resolvedAt?, resolvedBy?, createdAt
 * }
 */
const userReportService = {
  /**
   * Tạo báo cáo vi phạm mới (Startup/Investor).
   * POST /api/UserReports
   * @param {FormData} formData - category, description, bookingId?, evidenceImages?, videoEvidenceUrl?
   */
  createReport: async (formData) => {
    const response = await apiClient.post('/api/UserReports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response?.data ?? response;
  },

  /**
   * Lấy danh sách tất cả báo cáo (Staff/Admin).
   * GET /api/UserReports
   */
  getAllReports: async (params = { pageSize: 100 }) => {
    const response = await apiClient.get('/api/UserReports', { params });
    return response?.data ?? response;
  },

  /**
   * Đánh dấu báo cáo là hợp lệ (Staff/Admin).
   * PATCH /api/UserReports/{id}/resolve-valid
   * @param {number} reportId
   * @param {string} note - (Optional) Ghi chú xử lý
   */
  resolveValid: async (reportId, note = "") => {
    const response = await apiClient.patch(`/api/UserReports/${reportId}/resolve-valid`, {
      resolutionNote: note
    });
    return response?.data ?? response;
  },

  /**
   * Đánh dấu báo cáo là sai lệch (Staff/Admin).
   * PATCH /api/UserReports/{id}/resolve-false
   * @param {number} reportId
   * @param {string} note - (Optional) Ghi chú xử lý
   */
  resolveFalse: async (reportId, note = "") => {
    const response = await apiClient.patch(`/api/UserReports/${reportId}/resolve-false`, {
      resolutionNote: note
    });
    return response?.data ?? response;
  },
  /**
   * Lấy danh sách báo cáo do bản thân tạo (Reporter).
   * GET /api/UserReports/me/reporter
   */
  getMyReportsAsReporter: async () => {
    const response = await apiClient.get('/api/UserReports/me/reporter');
    return response?.data ?? response;
  },

  /**
   * Lấy danh sách báo cáo cáo buộc bản thân (Reported).
   * GET /api/UserReports/me/reported
   */
  getMyReportsAsReported: async () => {
    const response = await apiClient.get('/api/UserReports/me/reported');
    return response?.data ?? response;
  },
};

export default userReportService;
