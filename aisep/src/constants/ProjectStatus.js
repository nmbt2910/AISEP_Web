/**
 * ProjectStatus.js
 * Defines all valid project status states and utility functions
 * Implements BR-03: Project Status States
 */

import { formatStageOptionDisplayLabel, formatIndustryOptionDisplayLabel } from '../utils/optionDisplayLabels';

// Define all valid project statuses
const PROJECT_STATUS = {
  DRAFT: 'Draft',
  IP_PROTECTED: 'IpProtected',
  PENDING: 'Pending',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected'
};

const DEVELOPMENT_STAGE = {
  IDEA: 'Idea',
  MVP: 'MVP',
  GROWTH: 'Growth'
};

const DEVELOPMENT_STAGE_LABELS = {
  [DEVELOPMENT_STAGE.IDEA]: 'Ý tưởng',
  [DEVELOPMENT_STAGE.MVP]: 'MVP (sản phẩm khả thi tối thiểu)',
  [DEVELOPMENT_STAGE.GROWTH]: 'Tăng trưởng'
};

const DEVELOPMENT_STAGE_MAPPING = {
  0: DEVELOPMENT_STAGE.IDEA,
  1: DEVELOPMENT_STAGE.MVP,
  2: DEVELOPMENT_STAGE.GROWTH,
  '0': DEVELOPMENT_STAGE.IDEA,
  '1': DEVELOPMENT_STAGE.MVP,
  '2': DEVELOPMENT_STAGE.GROWTH,
  'Idea': DEVELOPMENT_STAGE.IDEA,
  'MVP': DEVELOPMENT_STAGE.MVP,
  'Growth': DEVELOPMENT_STAGE.GROWTH
};

// Status transition rules
const VALID_TRANSITIONS = {
  [PROJECT_STATUS.DRAFT]: [
    PROJECT_STATUS.SUBMITTED,
    PROJECT_STATUS.REJECTED
  ],
  [PROJECT_STATUS.PENDING]: [
    PROJECT_STATUS.SUBMITTED
  ],
  [PROJECT_STATUS.IP_PROTECTED]: [
    PROJECT_STATUS.SUBMITTED
  ],
  [PROJECT_STATUS.SUBMITTED]: [
    PROJECT_STATUS.APPROVED,
    PROJECT_STATUS.REJECTED
  ],
  [PROJECT_STATUS.APPROVED]: [
    PROJECT_STATUS.PUBLISHED
  ],
  [PROJECT_STATUS.PUBLISHED]: [],
  [PROJECT_STATUS.REJECTED]: [
    PROJECT_STATUS.SUBMITTED
  ]
};

// Status display labels - Updated for the new flow
const STATUS_LABELS = {
  [PROJECT_STATUS.DRAFT]: 'Bản nháp',
  [PROJECT_STATUS.IP_PROTECTED]: 'Bản nháp',
  [PROJECT_STATUS.PENDING]: 'Đang chờ duyệt',
  [PROJECT_STATUS.SUBMITTED]: 'Đang chờ duyệt',
  [PROJECT_STATUS.APPROVED]: 'Đã được duyệt',
  [PROJECT_STATUS.PUBLISHED]: 'Đã công khai',
  [PROJECT_STATUS.REJECTED]: 'Bị từ chối'
};

// Status colors for UI
const STATUS_COLORS = {
  [PROJECT_STATUS.DRAFT]: '#64748b',        // Slate/Gray for Draft
  [PROJECT_STATUS.IP_PROTECTED]: '#64748b', // Slate
  [PROJECT_STATUS.PENDING]: '#F59E0B',      // Amber for Pending
  [PROJECT_STATUS.SUBMITTED]: '#F59E0B',    // Amber
  [PROJECT_STATUS.APPROVED]: '#10B981',     // Green for Approved
  [PROJECT_STATUS.PUBLISHED]: '#059669',    // Dark Green
  [PROJECT_STATUS.REJECTED]: '#EF4444'      // Red for Rejected
};

// Which statuses allow editing (BR-04)
const EDITABLE_STATUSES = [
  PROJECT_STATUS.DRAFT,
  PROJECT_STATUS.REJECTED      // BR-18: Allow re-editing after rejection
];

// Which statuses can be edited by startup owner (vs system-only statuses)
const USER_EDITABLE_STATUSES = [
  PROJECT_STATUS.DRAFT,
  PROJECT_STATUS.REJECTED
];

// Status publish prerequisites (BR-19)
const PUBLISH_PREREQUISITES = {
  IP_PROTECTED: 'Documents must be protected on blockchain',
  AI_EVALUATED: 'AI evaluation must be completed',
  STAFF_APPROVED: 'Project must be approved by staff'
};

/**
 * Check if a status transition is valid
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {boolean} - Is transition valid
 */
function isValidTransition(fromStatus, toStatus) {
  const validNextStatuses = VALID_TRANSITIONS[fromStatus];
  if (!validNextStatuses) return false;
  return validNextStatuses.includes(toStatus);
}

/**
 * Check if project can be edited in current status (BR-04)
 * @param {string} status - Project status
 * @returns {boolean} - Can be edited
 */
function isEditable(status) {
  return EDITABLE_STATUSES.includes(status);
}

/**
 * Check if project can be edited by user (not system-only) (BR-04)
 * @param {string} status - Project status
 * @returns {boolean} - User can edit
 */
function isUserEditable(status) {
  return USER_EDITABLE_STATUSES.includes(status);
}

/**
 * Check if project is published (BR-20, BR-22)
 * @param {string} status - Project status
 * @returns {boolean} - Is published
 */
function isPublished(status) {
  return status === PROJECT_STATUS.PUBLISHED;
}

/**
 * Check if project is visible to investors/advisors (BR-22)
 * @param {string} status - Project status
 * @returns {boolean} - Is visible
 */
function isVisibleToInvestors(status) {
  return status === PROJECT_STATUS.PUBLISHED;
}

/**
 * Check if project needs staff review (BR-15)
 * @param {string} status - Project status
 * @returns {boolean} - Needs review
 */
function needsStaffReview(status) {
  return status === PROJECT_STATUS.SUBMITTED;
}

/**
 * Check if project has IP protection (BR-09, BR-19)
 * @param {string} status - Project status
 * @returns {boolean} - Has IP protection
 */
function hasIPProtection(status) {
  return [
    PROJECT_STATUS.IP_PROTECTED,
    PROJECT_STATUS.SUBMITTED,
    PROJECT_STATUS.APPROVED,
    PROJECT_STATUS.PUBLISHED,
    PROJECT_STATUS.REJECTED
  ].includes(status);
}

/**
 * Check if project can be published (BR-19)
 * @param {string} status - Project status
 * @param {boolean} hasAIEvaluation - Has AI evaluation
 * @returns {boolean} - Can be published
 */
function canBePublished(status, hasAIEvaluation = true) {
  // Must be APPROVED status (which means: IP Protected + AI Evaluated + Staff Approved)
  return status === PROJECT_STATUS.APPROVED && hasAIEvaluation;
}

/**
 * Get display label for development stage
 * @param {any} stage - Development stage value (numeric or string)
 * @param {Array} dynamicStages - Optional list of dynamic stage options from API
 * @returns {string} - Display label
 */
function getStageLabel(stage, dynamicStages = null) {
  if (stage === null || stage === undefined) return 'Không xác định';

  // Try dynamic mapping first if provided
  if (Array.isArray(dynamicStages)) {
    const stageId = Number(stage);
    const dynamicMatch = dynamicStages.find(s => 
      (s.id !== undefined && s.id === stageId) || 
      (s.value !== undefined && Number(s.value) === stageId) ||
      (s.label && s.label.toLowerCase() === String(stage).toLowerCase())
    );
    
    if (dynamicMatch) {
      const src = dynamicMatch.label != null && dynamicMatch.label !== ''
        ? dynamicMatch.label
        : String(dynamicMatch.value ?? '');
      return formatStageOptionDisplayLabel(src);
    }
  }

  // Fallback to static mapping
  const normalizedStage = DEVELOPMENT_STAGE_MAPPING[stage];
  if (normalizedStage) return DEVELOPMENT_STAGE_LABELS[normalizedStage];

  // Fallback for unexpected string values
  if (typeof stage === 'string') {
    return formatStageOptionDisplayLabel(stage);
  }

  return stage.toString();
}

/**
 * Get display labels for industries
 * @param {any} industryValue - Single ID or value, or array of IDs/values
 * @param {Array} dynamicIndustries - List of industry options from API
 * @returns {string} - Comma-separated labels
 */
function getIndustryLabels(industryValue, dynamicIndustries = null) {
  if (industryValue === null || industryValue === undefined) return 'Lĩnh vực khác';
  
  const values = Array.isArray(industryValue) ? industryValue : [industryValue];
  if (values.length === 0) return 'Lĩnh vực khác';

  const labels = values.map(val => {
    // Try dynamic mapping first
    if (Array.isArray(dynamicIndustries)) {
      const valId = Number(val);
      const dynamicMatch = dynamicIndustries.find(i => 
        (i.id !== undefined && i.id === valId) || 
        (i.value !== undefined && (Number(i.value) === valId || i.value === val)) ||
        (i.label && i.label.toLowerCase() === String(val).toLowerCase())
      );
      
      if (dynamicMatch) {
        return dynamicMatch.label;
      }
    }

    // Fallback formatting
    return formatIndustryOptionDisplayLabel(val);
  });

  return labels.filter(Boolean).join(', ') || 'Lĩnh vực khác';
}

/**
 * Get internal stage value for API/Form
 * @param {any} stage - Development stage value
 * @returns {string} - "0", "1", or "2"
 */
function getStageNumericValue(stage) {
  const normalizedStage = DEVELOPMENT_STAGE_MAPPING[stage];
  if (normalizedStage === DEVELOPMENT_STAGE.IDEA) return '0';
  if (normalizedStage === DEVELOPMENT_STAGE.MVP) return '1';
  if (normalizedStage === DEVELOPMENT_STAGE.GROWTH) return '2';
  return '0';
}

export {
  PROJECT_STATUS,
  DEVELOPMENT_STAGE,
  STATUS_LABELS,
  STATUS_COLORS,
  DEVELOPMENT_STAGE_LABELS,
  EDITABLE_STATUSES,
  USER_EDITABLE_STATUSES,
  PUBLISH_PREREQUISITES,
  VALID_TRANSITIONS,
  getStageLabel,
  getIndustryLabels,
  getStageNumericValue,
  isValidTransition,
  isEditable,
  isUserEditable,
  isPublished,
  isVisibleToInvestors,
  needsStaffReview,
  hasIPProtection,
  canBePublished
};
