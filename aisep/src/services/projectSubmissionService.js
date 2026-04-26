import { apiClient } from './apiClient';

/**
 * Project Submission Service
 * Handles project creation, document upload, and AI evaluation interactions.
 */
export const projectSubmissionService = {
  /**
   * Submit startup project information
   * @param {Object} projectData - Project submission object containing:
   * @param {string} projectData.projectName - Project name (required)
   * @param {string} projectData.shortDescription - Short description (required)
   * @param {number} projectData.developmentStage - Development stage: 0=Idea, 1=MVP, 2=Growth (required)
   * @param {number} projectData.industry - Industry ID 0-14 (required)
   * @param {string} projectData.problemStatement - Problem statement (required)
   * @param {string} projectData.solutionDescription - Solution description (required)
   * @param {string} projectData.targetCustomers - Target customers description (required)
   * @param {string} projectData.uniqueValueProposition - UVP (required for MVP/Growth)
   * @param {number} projectData.marketSize - Market size in VND (0 or optional for Idea)
   * @param {string} projectData.businessModel - Business model (required for MVP/Growth)
   * @param {number} projectData.revenue - Current revenue in VND (0 or optional for Idea)
   * @param {string} projectData.competitors - Competitors description (required for MVP/Growth)
   * @param {string} projectData.teamMembers - Team members as comma-separated (required)
   * @param {string} projectData.keySkills - Key skills/tags as comma-separated (required for MVP/Growth)
   * @param {string} projectData.teamExperience - Team experience description (required for Growth)
   * @param {File} projectData.projectImageFile - Project image file (optional, max 5MB)
   * @returns {Promise<any>}
   */
  submitStartupInfo: async (projectData) => {
    const formData = new FormData();
    Object.keys(projectData).forEach(key => {
      const value = projectData[key];
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => formData.append(key, v));
        } else {
          formData.append(key, value);
        }
      }
    });

    const response = await apiClient.post('/api/Projects', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response;
  },

  /**
   * Creates a new startup project
   * @param {Object} projectData - Same structure as submitStartupInfo (includes projectImageFile)
   * @returns {Promise<any>}
   */
  createProject: async (projectData) => {
    const formData = new FormData();
    Object.keys(projectData).forEach(key => {
      const value = projectData[key];
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => formData.append(key, v));
        } else {
          formData.append(key, value);
        }
      }
    });

    const response = await apiClient.post('/api/Projects', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response;
  },

  /**
   * Update an existing draft project
   * @param {string|number} id - The project ID
   * @param {Object} projectData - Same structure as submitStartupInfo (includes projectImageFile)
   * @returns {Promise<any>}
   */
  updateProject: async (id, projectData) => {
    const formData = new FormData();
    Object.keys(projectData).forEach(key => {
      const value = projectData[key];
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => formData.append(key, v));
        } else {
          formData.append(key, value);
        }
      }
    });

    const response = await apiClient.put(`/api/Projects/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response;
  },

  /**
   * Get documents for a specific project
   * @param {string|number} projectId 
   * @returns {Promise<any>}
   */
  getDocuments: async (projectId) => {
    const response = await apiClient.get(`/api/projects/${projectId}/documents`);
    return response;
  },

  /**
   * Uploads a document to a specific project
   * @param {string|number} projectId 
   * @param {File} file - The file to upload
   * @param {string} documentType - Type of document (e.g., 'PitchDeck')
   * @returns {Promise<any>}
   */
  uploadDocument: async (projectId, file, documentType = 'PitchDeck') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    // Explicitly set multipart/form-data for this call
    const response = await apiClient.post(`/api/projects/${projectId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  /**
   * Trigger the Gemini AI analysis for a project
   * @param {string|number} projectId 
   * @returns {Promise<any>} Wait for analysis to complete
   */
  triggerAIAnalysis: async (projectId) => {
    const response = await apiClient.post(`/api/StartupAIAnalysis/${projectId}/analyze`);
    return response;
  },

  /**
   * Get the saved AI Analysis results
   * @param {string|number} projectId 
   * @returns {Promise<any>}
   */
  getAIAnalysisResults: async (projectId) => {
    const response = await apiClient.get(`/api/StartupAIAnalysis/${projectId}`);
    return response;
  },

  /**
   * Get My Projects (for the Startup Dashboard list validation)
   * @returns {Promise<any>}
   */
  getMyProjects: async () => {
    try {
      // Request newest projects first and a larger page size to ensure all projects are visible in the dashboard
      const response = await apiClient.get('/api/Projects/my?sorts=-ProjectId&pageSize=100');
      if (response && (response.success || response.isSuccess)) {
        return response;
      } else {
        // If the response indicates failure but isn't a 404, throw an error
        throw new Error(response?.message || 'Failed to fetch projects.');
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        return { success: true, data: [] };
      }
      throw error;
    }
  },

  /**
   * Get project details by ID (Normal)
   * @param {string|number} projectId 
   * @returns {Promise<any>}
   */
  getProjectById: async (projectId) => {
    const response = await apiClient.get(`/api/Projects/${projectId}`);
    return response;
  },

  /**
   * Get project details by ID (Non-Premium)
   * @param {string|number} projectId 
   * @returns {Promise<any>}
   */
  getProjectNonPremiumById: async (projectId) => {
    const response = await apiClient.get(`/api/Projects/non-premium/${projectId}`);
    return response;
  },

  /**
   * Get All Projects (for the public feed)
   * Uses GET /api/Projects/non-premium endpoint with pagination
   * @returns {Promise<any>}
   */
  getAllProjects: async () => {
    const response = await apiClient.get('/api/Projects/non-premium?pageSize=100');
    return response;
  },

  /**
   * Get Pending Projects for review (Operation Staff)
   * Uses GET /api/Projects with Sieve filter Status==Pending
   * @returns {Promise<any>}
   */
  getPendingProjects: async () => {
    try {
      const response = await apiClient.get('/api/Projects', {
        params: { filters: 'Status==Pending', pageSize: 100 }
      });
      return response;
    } catch (error) {
      console.error('Error fetching pending projects:', error);
      throw error;
    }
  },

  /**
   * Get Approved Projects (Operation Staff)
   * Uses GET /api/Projects with Sieve filter Status==Approved
   * @returns {Promise<any>}
   */
  getApprovedProjects: async () => {
    try {
      const response = await apiClient.get('/api/Projects', {
        params: { filters: 'Status==Approved', pageSize: 100 }
      });
      return response;
    } catch (error) {
      console.error('Error fetching approved projects:', error);
      throw error;
    }
  },
  
  /**
   * Get Rejected Projects (Operation Staff)
   * Uses GET /api/Projects with Sieve filter Status==Rejected
   * @returns {Promise<any>}
   */
  getRejectedProjects: async () => {
    try {
      const response = await apiClient.get('/api/Projects', {
        params: { filters: 'Status==Rejected', pageSize: 100 }
      });
      return response;
    } catch (error) {
      console.error('Error fetching rejected projects:', error);
      throw error;
    }
  },

  /**
   * Approve a project
   * @param {number} projectId 
   * @returns {Promise<any>}
   */
  approveProject: async (projectId) => {
    const response = await apiClient.put(`/api/projects/${projectId}/approve`);
    return response;
  },

  /**
   * Reject a project
   * @param {number} projectId 
   * @param {string} reason 
   * @returns {Promise<any>}
   */
  rejectProject: async (projectId, reason) => {
    const response = await apiClient.patch(`/api/Projects/${projectId}/reject`, {
      reason
    });
    return response;
  },

  /**
   * Submit a project for review
   * @param {number} projectId 
   * @returns {Promise<any>}
   */
  submitProject: async (projectId) => {
    const response = await apiClient.patch(`/api/Projects/${projectId}/submit`);
    return response;
  },

  /**
   * Verify a document by ID
   * @param {number} documentId 
   * @returns {Promise<any>}
   */
  verifyDocument: async (documentId) => {
    try {
      const response = await apiClient.get(`/api/documents/${documentId}/verify`);
      // response.data contains: { isAuthentic, txHash, timestampOnBlockchain, message }
      return response;
    } catch (error) {
      console.error('Error verifying document:', error);
      throw error;
    }
  },

  /**
   * Delete a document by ID
   * @param {number} documentId 
   * @returns {Promise<any>}
   */
  deleteDocument: async (documentId) => {
    const response = await apiClient.delete(`/api/documents/${documentId}`);
    return response;
  }
};

export default projectSubmissionService;
