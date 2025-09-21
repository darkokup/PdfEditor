import axios from 'axios';
import { ProjectData, ProjectSummary } from './types';

const API_BASE_URL = 'http://localhost:5001/api';

export const api = {
  uploadPdf: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/upload-pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status < 500, // Don't throw for 4xx errors
      });
      
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.data?.error || 'Upload failed'}`);
      }
      
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to server. Please make sure the backend is running on port 5001.');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Upload timeout. Please try again with a smaller file.');
      } else if (error.message.includes('Network Error')) {
        throw new Error('Network connection failed. Please check your connection and try again.');
      }
      throw error;
    }
  },

  saveProject: async (projectData: Partial<ProjectData>) => {
    const response = await axios.post(`${API_BASE_URL}/save-project`, projectData);
    return response.data;
  },

  loadProject: async (projectId: string) => {
    const response = await axios.get(`${API_BASE_URL}/load-project/${projectId}`);
    return response.data;
  },

  listProjects: async (): Promise<{ success: boolean; projects: ProjectSummary[] }> => {
    const response = await axios.get(`${API_BASE_URL}/list-projects`);
    return response.data;
  },

  generatePdf: async (pdfData: string, annotations: any[]) => {
    const response = await axios.post(
      `${API_BASE_URL}/generate-pdf`,
      { pdf_data: pdfData, annotations },
      { responseType: 'blob' }
    );
    
    return response.data;
  },

  healthCheck: async () => {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  },
};