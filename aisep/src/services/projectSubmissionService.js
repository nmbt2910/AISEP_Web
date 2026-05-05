import { apiClient } from './apiClient';

const DEPRECATED_PROJECT_FIELDS = new Set([
  'MarketSize', 'marketSize', 'Revenue', 'revenue', 'TeamMembers', 'teamMembers',
  'KeySkills', 'keySkills',
]);

/**
 * Axios mặc định Content-Type: application/json. Với FormData phải để trình duyệt
 * tự gắn multipart/form-data kèm boundary — nếu set tay "multipart/form-data" không boundary
 * thì server parse lỗi / 400.
 */
function formDataRequestConfig() {
  return {
    transformRequest: [
      (data, headers) => {
        if (data instanceof FormData) {
          delete headers['Content-Type'];
        }
        return data;
      },
    ],
  };
}

/**
 * Scorecard trên FormData: tên field PascalCase cùng cấp với ProjectName (đúng kiểu Swagger [FromForm] phẳng).
 * Nếu BE chỉ bind nested ProjectScorecard, cần đổi sang prefix ProjectScorecard. (báo team BE / OpenAPI).
 * calculatedScore không gửi.
 */
function appendProjectScorecardToFormData(formData, sc) {
  if (!sc || typeof sc !== 'object') return;
  const get = (camel, pascal) => sc[camel] ?? sc[pascal];
  const pairs = [
    ['teamSize', get('teamSize', 'TeamSize')],
    ['teamExperience', get('teamExperience', 'TeamExperience')],
    ['hasTechnicalCofounder', get('hasTechnicalCofounder', 'HasTechnicalCofounder')],
    ['targetMarketSize', get('targetMarketSize', 'TargetMarketSize')],
    ['marketGrowth', get('marketGrowth', 'MarketGrowth')],
    ['productReadiness', get('productReadiness', 'ProductReadiness')],
    ['iPProtection', get('iPProtection', 'IpProtection')],
    ['barrierToEntry', get('barrierToEntry', 'BarrierToEntry')],
    ['currentTraction', get('currentTraction', 'CurrentTraction')],
    ['runwayMonths', get('runwayMonths', 'RunwayMonths')],
  ];
  pairs.forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return;
    if (typeof v === 'boolean') {
      formData.append(k, v ? 'true' : 'false');
    } else {
      formData.append(k, String(v));
    }
  });
}

function buildMultipartFormData(projectData) {
  const formData = new FormData();
  const sc = projectData.ProjectScorecard || projectData.projectScorecard;

  const fieldAlias = {
    ProjectName: 'projectName',
    ShortDescription: 'shortDescription',
    StageOptionId: 'stageOptionId',
    ProblemStatement: 'problemStatement',
    SolutionDescription: 'solutionDescription',
    TargetCustomers: 'targetCustomers',
    UniqueValueProposition: 'uniqueValueProposition',
    BusinessModel: 'businessModel',
    Competitors: 'competitors',
    ProjectImageFile: 'projectImageFile',
    IndustryOptionIds: 'industryOptionId',
    industryOptionIds: 'industryOptionId',
  };

  Object.keys(projectData).forEach((key) => {
    if (key === 'ProjectScorecard' || key === 'projectScorecard') return;
    if (DEPRECATED_PROJECT_FIELDS.has(key)) return;
    const value = projectData[key];
    if (value !== null && value !== undefined && value !== '') {
      const targetKey = fieldAlias[key] || key;
      if (Array.isArray(value)) {
        if (targetKey === 'industryOptionId') {
          const first = value[0];
          if (first !== null && first !== undefined && first !== '') {
            formData.append(targetKey, String(first));
          }
        } else {
          value.forEach((v) => {
            if (v !== null && v !== undefined && v !== '') {
              formData.append(targetKey, String(v));
            }
          });
        }
      } else if (value instanceof File || value instanceof Blob) {
        // Preserve binary payload for multipart file upload fields (e.g., projectImageFile)
        formData.append(targetKey, value);
      } else if (typeof value === 'boolean') {
        formData.append(targetKey, value ? 'true' : 'false');
      } else {
        formData.append(targetKey, String(value));
      }
    }
  });
  if (sc && typeof sc === 'object') {
    appendProjectScorecardToFormData(formData, sc);
  }
  return formData;
}

/**
 * Project Submission Service
 * Handles project creation, document upload, and AI evaluation interactions.
 */
export const projectSubmissionService = {
  /**
   * Submit startup project information
   * @param {Object} projectData - Form fields (PascalCase) + optional ProjectScorecard object (enums).
   * @param {Object} [projectData.ProjectScorecard] - TeamSize, TeamExperience, HasTechnicalCofounder, ...
   * Các field đã bỏ: marketSize, revenue, teamMembers, keySkills, teamExperience (text).
   * @returns {Promise<any>}
   */
  submitStartupInfo: async (projectData) => {
    const formData = buildMultipartFormData(projectData);

    const response = await apiClient.post('/api/Projects', formData, formDataRequestConfig());
    return response;
  },

  /**
   * Creates a new startup project
   * @param {Object} projectData - Same structure as submitStartupInfo (includes projectImageFile)
   * @returns {Promise<any>}
   */
  createProject: async (projectData) => {
    const formData = buildMultipartFormData(projectData);

    const response = await apiClient.post('/api/Projects', formData, formDataRequestConfig());
    return response;
  },

  /**
   * Update an existing draft project
   * @param {string|number} id - The project ID
   * @param {Object} projectData - Same structure as submitStartupInfo (includes projectImageFile)
   * @returns {Promise<any>}
   */
  updateProject: async (id, projectData) => {
    const formData = buildMultipartFormData(projectData);

    const response = await apiClient.put(`/api/Projects/${id}`, formData, formDataRequestConfig());
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

    const response = await apiClient.post(`/api/projects/${projectId}/documents`, formData, formDataRequestConfig());
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
   * Uses GET /api/Projects/matching/non-premium endpoint with pagination
   * @returns {Promise<any>}
   */
  getAllProjects: async () => {
    const response = await apiClient.get('/api/Projects/matching/non-premium?pageSize=100&filters=Status==Approved');
    return response;
  },

  /**
   * Search projects
   * @param {string} query 
   * @returns {Promise<any>}
   */
  searchProjects: async (query) => {
    const response = await apiClient.get('/api/Projects/search', { params: { query } });
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
  },

  /**
   * Lấy mẫu tài liệu Due Diligence cho Startup điền và nộp lại dưới dạng PDF
   * GET /api/admin/due-diligence-template
   * @returns {Promise<any>}
   */
  getDueDiligenceTemplate: async () => {
    const response = await apiClient.get('/api/admin/due-diligence-template');
    return response;
  },
};

export default projectSubmissionService;
