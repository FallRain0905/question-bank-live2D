'use client';

import { useState } from 'react';

export default function ModerationNotice() {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('moderationNoticeDismissed', 'true');
  };

  // 检查是否之前已关闭
  if (typeof window !== 'undefined') {
    const wasDismissed = localStorage.getItem('moderationNoticeDismissed');
    if (wasDismissed === 'true') {
      return null;
    }
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-yellow-700 text-sm">
            ⚠️ <strong>提醒：</strong>上传内容需符合规范，禁止违法违规信息，所有内容需经审核后显示。
          </span>
        </div>
        {!dismissed && (
          <button
            onClick={handleDismiss}
            className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
