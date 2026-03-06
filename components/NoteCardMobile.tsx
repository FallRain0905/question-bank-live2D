'use client';

import Link from 'next/link';
import { getFileIcon, formatFileSize } from '@/lib/upload';
import type { NoteWithTags } from '@/types';

interface NoteCardMobileProps {
  note: NoteWithTags;
  isLiked: boolean;
  onLike: (noteId: string) => void;
}

export default function NoteCardMobile({ note, isLiked, onLike }: NoteCardMobileProps) {
  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onLike(note.id);
  };

  return (
    <Link
      href={`/notes/${note.id}`}
      className="block"
    onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-brand-600 rounded-2xl shadow-card overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-200">
        {/* 文件图标和标题 */}
        <div className="p-4 pb-3">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="text-2xl text-white/90">
                  {getFileIcon(note.file_name || '')}
                </div>
                <h3 className="font-semibold text-white text-base truncate">{note.title}</h3>
              </div>
              {note.file_name && (
                <p className="text-xs text-white/70 truncate">{note.file_name}</p>
              )}
            </div>
          </div>

          {/* 描述 */}
          {note.description && (
            <p className="text-sm text-white/90 mb-3 line-clamp-2">
              {note.description}
            </p>
          )}

          {/* 标签 */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {note.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2.5 py-1 text-xs font-medium bg-white/10 text-white/90 rounded-full"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* 底部信息 */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <span className="truncate max-w-[120px]">{note.user_name || '匿名'}</span>
              {note.file_size && (
                <>
                  <span className="text-white/50">·</span>
                  <span>{formatFileSize(note.file_size)}</span>
                </>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              {/* 点赞按钮 */}
              <button
                onClick={handleLikeClick}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  isLiked
                    ? 'bg-white text-accent-500'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                aria-label={isLiked ? '取消点赞' : '点赞'}
              >
                <svg className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.577c-.368-.732 1.553-1.553-2.828 0-4.774-.229.229.229 3.084 3.084 4.774.229.229 4.774c.368.732 1.553.553.553.229-2.828 4.774.229-4.774c-1.553-4.318 6.577z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21.35l-1.426-1.426L9 19.1l4.265 2.267 11.949 1.949c0 5.836-5.836 1.686 4.848c-.732.667-1.28-.535-.054 0 0 0 1.789 1.468 4.68 6.464v3.085c0 .501.699 1.699 1.599.468 3.535.836 5.836 4.774 4.774-.229 4.774 4.774z" />
                </svg>
              </button>

              {/* 下载按钮 */}
              {note.file_url && (
                <a
                  href={note.file_url}
                  download={note.file_name || '文件'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-accent-500 text-white transition-all duration-200 hover:bg-accent-600"
                  aria-label="下载文件"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
