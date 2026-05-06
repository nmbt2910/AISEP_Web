import { apiClient } from './apiClient';

/**
 * User Service
 * Wraps the /api/Users endpoints for reading and updating user account data.
 */
export const userService = {
  /**
   * Get a user by their ID
   * @param {string|number} id
   * @returns {Promise<any>} UserResponse
   */
  getUserById: async (id) => {
    const response = await apiClient.get(`/api/Users/${id}`);
    return response;
  },

  /**
   * Update user account information
   * @param {string|number} id
   * @param {{ fullName?: string, userName?: string, dateOfBirth?: string }} data
   * @returns {Promise<any>} Updated UserResponse
   */
  updateUser: async (id, data) => {
    const response = await apiClient.put(`/api/Users/${id}`, data);
    return response;
  },
  /**
   * Get current user's bonus free bookings (refunded quotas)
   * @returns {Promise<number>} bonus count
   */
  getMyBonusBookings: async () => {
    const response = await apiClient.get('/api/Users/me/bonus');
    return response?.data ?? response;
  }
};

export default userService;
