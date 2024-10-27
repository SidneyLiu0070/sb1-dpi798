// File size limits in bytes
export const MAX_FILE_SIZE = 104857600; // 100MB

// Supported file types
export const SUPPORTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/msword': ['.doc'],
  'text/html': ['.html'],
  'application/json': ['.json'],
  'text/javascript': ['.js'],
  'text/typescript': ['.ts', '.tsx'],
  'text/css': ['.css'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp']
} as const;