'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Live2DModel } from '@/types/live2d';

interface ModelSwitcherProps {
  models: Live2DModel[];
  currentModel: Live2DModel | null;
  onModelChange: (model: Live2DModel) => void;
}

/**
 * Live2D 模型切换器
 * 允许用户在不同的 Live2D 模型之间切换
 */
export default function ModelSwitcher({ models, currentModel, onModelChange }: ModelSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* 主按钮 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center"
        type="button"
        title="切换模型"
      >
        <svg
          className="w-5 h-5 text-gray-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </motion.button>

      {/* 模型列表 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
          >
            <div className="p-2">
              {models.map((model) => (
                <motion.button
                  key={model.id}
                  whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onModelChange(model);
                    setIsOpen(false);
                    // 保存模型选择到 localStorage
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('live2d_selected_model', model.id);
                    }
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                    currentModel?.id === model.id
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    {model.thumbnail && (
                      <img
                        src={model.thumbnail}
                        alt={model.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium">{model.name}</div>
                      {model.description && (
                        <div className="text-xs text-gray-500">{model.description}</div>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* 底部提示 */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
              <div className="text-xs text-gray-500">拖动模型可以调整位置</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
