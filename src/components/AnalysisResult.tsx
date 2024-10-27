import React from 'react';
import ReactMarkdown from 'react-markdown';

interface AnalysisResultProps {
  content: string;
}

export function AnalysisResult({ content }: AnalysisResultProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">分析结果</h2>
      <div className="prose max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}