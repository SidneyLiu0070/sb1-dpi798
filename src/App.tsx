import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { TextInput } from './components/TextInput';
import { ChatInterface } from './components/ChatInterface';
import { Settings } from 'lucide-react';
import { ConfigModal } from './components/ConfigModal';
import { createMoonshotAPI, ApiError } from './services/api';
import { toast, Toaster } from 'react-hot-toast';
import { getConfig } from './utils/storage';

const SYSTEM_PROMPT = `请用中文详尽总结指定的内容。这是一项重要任务，可能影响重大决策。请按照以下步骤逐一执行，确保每步都得到充分完成。每步结果请单独呈现：

1. 结构化总结：
目标：创建一个逻辑清晰、内容丰富的总结。
• 使用二级标题（##）为每个主题创建独立章节，标题加粗
• 每章节用1-2个段落详细阐述，确保深度和连贯性
• 加粗关键句子或核心观点
• 使用清晰、专业的语言，如高质量科普文章
• 引用原文中的完整案例或故事，保留关键细节
• 人名可中英并列，确保称呼和介绍完整
• 使用适当的Markdown层级结构
• 以第一人称表达，如"通过阅读这篇文章，我们可以看出…"，保持谦虚和谨慎

2. 核心要点与关键洞见：
目标：提炼文章的精华。
• 列出3-5个最重要的观点或结论，直接基于原文
• 提供1个独特的、有深度的洞见，新颖但紧密关联原文`;

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentContent, setCurrentContent] = useState('');

  useEffect(() => {
    const config = getConfig();
    if (config?.apiKey) {
      setApiKey(config.apiKey);
    } else {
      setShowConfig(true);
    }
  }, []);

  const handleError = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        toast.error('API Key 无效，请重新设置');
        setShowConfig(true);
      } else {
        toast.error(error.message);
      }
    } else {
      toast.error('处理过程中发生错误，请重试');
    }
    setIsProcessing(false);
    setProcessingStatus('');
  };

  const handleFileAnalysis = async (file: File) => {
    if (!apiKey) {
      toast.error('请先设置 Moonshot API Key');
      setShowConfig(true);
      return;
    }

    setIsProcessing(true);
    setAnalysisResult('');
    setCurrentFile(file);
    setCurrentContent('');
    let toastId = toast.loading('正在处理...');

    try {
      const api = createMoonshotAPI({ apiKey });
      
      setProcessingStatus('uploading');
      const fileId = await api.uploadFile(file);
      
      setProcessingStatus('extracting');
      const content = await api.getFileContent(fileId);
      
      if (!content) {
        throw new ApiError('无法提取文件内容，请重试');
      }

      setCurrentContent(content);
      
      setProcessingStatus('analyzing');
      const result = await api.analyzeContent(content, SYSTEM_PROMPT);
      setAnalysisResult(result);
      setShowChat(true);
      toast.success('分析完成', { id: toastId });
    } catch (error) {
      handleError(error);
      toast.error('处理失败', { id: toastId });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleTextAnalysis = async (text: string) => {
    if (!apiKey) {
      toast.error('请先设置 Moonshot API Key');
      setShowConfig(true);
      return;
    }

    setIsProcessing(true);
    setAnalysisResult('');
    setCurrentContent(text);
    const toastId = toast.loading('正在分析...');

    try {
      const api = createMoonshotAPI({ apiKey });
      const result = await api.analyzeContent(text, SYSTEM_PROMPT);
      setAnalysisResult(result);
      setShowChat(true);
      toast.success('分析完成', { id: toastId });
    } catch (error) {
      handleError(error);
      toast.error('分析失败', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (message: string, onResponse: (response: string) => void) => {
    if (!apiKey || !currentContent) return;

    try {
      const api = createMoonshotAPI({ apiKey });
      const result = await api.analyzeContent(
        `基于以下内容回答问题：\n\n${currentContent}\n\n问题：${message}`,
        '请基于提供的内容，准确、简洁地回答问题。如果问题超出内容范围，请明确指出。'
      );
      onResponse(result);
    } catch (error) {
      if (error instanceof ApiError) {
        onResponse(`抱歉，处理您的问题时出现错误：${error.message}`);
      } else {
        onResponse('抱歉，处理您的问题时出现未知错误，请重试。');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">深度分析助手</h1>
          <button
            onClick={() => setShowConfig(true)}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {!showChat ? (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">添加来源</h2>
                <p className="text-gray-600 mb-6">
                  添加来源后，深度分析助手能够基于这些对您最重要的信息来提供回答。
                  <br />
                  （示例：营销方案、课程阅读材料、研究笔记、会议转写内容、销售文档等）
                </p>
                <FileUpload 
                  onFileSelect={handleFileAnalysis} 
                  isLoading={isProcessing} 
                  status={processingStatus}
                />
              </div>

              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">或直接输入文本</h2>
                <TextInput onSubmit={handleTextAnalysis} isLoading={isProcessing} />
              </div>
            </div>
          </div>
        ) : (
          <ChatInterface 
            content={analysisResult}
            currentFile={currentFile}
            onBack={() => setShowChat(false)}
            onNewChat={() => {
              setAnalysisResult('');
              setCurrentFile(null);
              setCurrentContent('');
              setShowChat(false);
            }}
            onSendMessage={handleSendMessage}
          />
        )}
      </div>

      <ConfigModal 
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        onSave={(key) => {
          setApiKey(key);
          setShowConfig(false);
          toast.success('API Key 已保存');
        }}
      />
    </div>
  );
}

export default App;