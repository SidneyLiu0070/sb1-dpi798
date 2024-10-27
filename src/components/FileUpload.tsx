import React, { useCallback } from 'react';
import { Upload, FileText, FileUp, FileSearch } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from '../constants/files';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  status?: string;
}

export function FileUpload({ onFileSelect, isLoading, status }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0 && !isLoading) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect, isLoading]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_FILE_TYPES,
    disabled: isLoading,
    multiple: false,
    maxSize: MAX_FILE_SIZE
  });

  const renderStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <FileUp className="w-12 h-12 text-blue-500 animate-bounce" />;
      case 'extracting':
        return <FileText className="w-12 h-12 text-blue-500 animate-pulse" />;
      case 'analyzing':
        return <FileSearch className="w-12 h-12 text-blue-500 animate-spin" />;
      default:
        return <Upload className="w-12 h-12 text-gray-400" />;
    }
  };

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-xl p-12
        flex flex-col items-center justify-center
        transition-all duration-200
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
        ${isLoading ? 'cursor-wait' : 'cursor-pointer'}
      `}
    >
      <input {...getInputProps()} />
      
      <div className="mb-6">
        {renderStatusIcon()}
      </div>

      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-gray-900">
          {status ? (
            <>
              {status === 'uploading' && '正在上传文件...'}
              {status === 'extracting' && '正在提取文件内容...'}
              {status === 'analyzing' && '正在分析内容...'}
            </>
          ) : (
            isDragActive ? '拖放文件到这里' : '点击或拖放文件到这里上传'
          )}
        </p>
        
        {!isLoading && (
          <>
            <p className="text-sm text-gray-500">
              支持 PDF、DOC、DOCX、TXT、MD、图片等格式
            </p>
            <p className="text-xs text-gray-400">
              单个文件最大支持 100MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}