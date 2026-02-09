'use client';

import { useState, KeyboardEvent, MouseEvent } from 'react';

interface TagInputProps {
  tags: string[];
  availableTags?: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({
  tags,
  availableTags = [],
  onChange,
  placeholder = '输入标签后按回车...'
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = availableTags.filter(
    tag => tag.toLowerCase().includes(input.toLowerCase()) && !tags.includes(tag)
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleSuggestionClick = (e: MouseEvent<HTMLButtonElement>) => {
    const tag = e.currentTarget.dataset.tag || '';
    addTag(tag);
  };

  return (
    <div className="relative">
      {/* 标签列表 */}
      <div className="flex flex-wrap gap-2 p-3 min-h-[48px] border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="hover:text-blue-900"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none bg-transparent"
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">输入标签后按回车键确认</p>

      {/* 建议列表 */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
          {filteredSuggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              data-tag={tag}
              onMouseDown={handleSuggestionClick}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
