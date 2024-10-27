import axios, { AxiosError } from 'axios';
import { MAX_FILE_SIZE } from '../constants/files';

const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1';
const FILE_PROCESSING_TIMEOUT = 300000; // 5 minutes
const MAX_RETRIES = 10;
const INITIAL_RETRY_DELAY = 2000;

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

interface MoonshotConfig {
  apiKey: string;
}

export class MoonshotAPI {
  private axiosInstance;

  constructor(config: MoonshotConfig) {
    if (!config.apiKey) {
      throw new ApiError('API Key is required');
    }

    this.axiosInstance = axios.create({
      baseURL: MOONSHOT_API_URL,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      timeout: FILE_PROCESSING_TIMEOUT,
    });
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const status = axiosError.response?.status;
      const errorMessage = axiosError.response?.data?.error?.message || 
                          axiosError.response?.data?.message;

      switch (status) {
        case 401:
          throw new ApiError('API Key 无效或已过期', status);
        case 413:
          throw new ApiError('文件大小超出限制（最大100MB）', status);
        case 415:
          throw new ApiError('不支持的文件类型', status);
        case 429:
          throw new ApiError('请求过于频繁，请稍后重试', status);
        case 404:
          throw new ApiError('文件不存在或已被删除', status);
        case 507:
          throw new ApiError('存储空间不足，请删除部分文件后重试', status);
        default:
          throw new ApiError(
            errorMessage || 
            '请求失败，请稍后重试' + 
            (status ? ` (${status})` : ''),
            status
          );
      }
    }
    throw new ApiError('发生未知错误');
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    initialDelay: number,
    retryCondition?: (error: any) => boolean
  ): Promise<T> {
    let attempts = 0;
    let delay = initialDelay;

    while (attempts < maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        attempts++;
        
        // Check if we should retry based on the error
        if (retryCondition && !retryCondition(error)) {
          throw error;
        }

        if (attempts === maxAttempts) {
          throw error;
        }

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          
          // Don't retry on these errors
          if (status === 401 || status === 413 || status === 415) {
            throw error;
          }
        }

        // Exponential backoff with max delay of 10 seconds
        delay = Math.min(delay * 1.5, 10000);
        await this.wait(delay);
      }
    }

    throw new ApiError('操作超时，请重试');
  }

  async uploadFile(file: File): Promise<string> {
    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError('文件大小超出限制（最大100MB）');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'file-extract');

    try {
      const response = await this.retryWithBackoff(
        () => this.axiosInstance.post('/files', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
        3,
        1000
      );

      if (!response.data?.id) {
        throw new ApiError('文件上传失败');
      }

      return response.data.id;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getFileContent(fileId: string): Promise<string> {
    try {
      // Initial wait to allow for file processing
      await this.wait(2000);

      const getContent = async () => {
        const response = await this.axiosInstance.get(`/files/${fileId}/content`);
        
        // Check if content is available
        if (!response.data) {
          throw new ApiError('文件正在处理中', 202);
        }
        
        // Handle different response formats
        const content = response.data.text || response.data.content || response.data;
        
        if (typeof content !== 'string' || !content.trim()) {
          throw new ApiError('文件内容提取失败');
        }
        
        return content;
      };

      // Retry with a condition that allows 202 status
      return await this.retryWithBackoff(
        getContent,
        MAX_RETRIES,
        INITIAL_RETRY_DELAY,
        (error) => {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            // Retry on 202 (Processing) or specific error codes
            return status === 202 || status === 429 || status >= 500;
          }
          return false;
        }
      );
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async analyzeContent(content: string, systemPrompt: string): Promise<string> {
    if (!content.trim()) {
      throw new ApiError('内容不能为空');
    }

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content }
      ];

      const response = await this.retryWithBackoff(
        () => this.axiosInstance.post('/chat/completions', {
          model: 'moonshot-v1-32k',
          messages,
          temperature: 0.3,
          max_tokens: 4000,
        }),
        3,
        1000
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new ApiError('分析失败，请重试');
      }

      return response.data.choices[0].message.content;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export const createMoonshotAPI = (config: MoonshotConfig) => new MoonshotAPI(config);