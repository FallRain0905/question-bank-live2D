'use client';

import { useState, useRef } from 'react';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  loading?: boolean;
}

export default function FileUploader({ onFileUpload, loading }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    // 检查文件大小限制（10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过10MB');
      return;
    }

    // 检查文件类型
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('不支持的文件类型。请上传 .txt, .md, .pdf, .docx, .jpg, .png 等文件');
      return;
    }

    onFileUpload(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };


  return (
    <div className="relative">
      {/* 拖拽上传区域 */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-6 text-center transition-all
          ${dragActive ? 'border-brand-500 bg-brand-50' : 'border-brand-300 bg-white'}
          ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-brand-400 hover:bg-brand-50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!loading ? handleClick : undefined}
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="text-5xl">📎</div>
          <div className="text-sm text-brand-600">
            {loading ? '处理中...' : '点击或拖拽上传文件'}
          </div>
          <div className="text-xs text-brand-400">
            支持 .md, .txt, .pdf, .docx 及图片（最大10MB）<br/>
            上传后可继续输入文字，然后一起发送给AI
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.pdf,.docx,.doc,.jpg,.jpeg,.png,.gif,.webp"
          onChange={handleFileInput}
          disabled={loading}
          className="hidden"
        />
      </div>

      {/* 拖拽激活状态指示 */}
      {dragActive && (
        <div className="absolute inset-0 bg-brand-500/10 rounded-xl flex items-center justify-center">
          <div className="text-6xl animate-bounce">📎</div>
        </div>
      )}
    </div>
  );
}
