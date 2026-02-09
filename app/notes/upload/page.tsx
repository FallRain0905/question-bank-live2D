'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { uploadFile, isValidFileType, isValidFileSize, formatFileSize, MAX_FILE_SIZE } from '@/lib/upload';
import TagInput from '@/components/TagInput';
import type { NewNote } from '@/types';

// 使用 MIME 类型 + 扩展名，确保移动端兼容性
const ACCEPTED_FILE_EXTENSIONS = [
  // 图片 MIME 类型
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  // 文档 MIME 类型
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip', 'application/x-rar-compressed',
  // 同时保留扩展名作为后备
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt',
  '.zip', '.rar'
].join(',');

export default function NoteUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setFileError('');

    if (!selectedFile) {
      setFile(null);
      return;
    }

    // 验证文件类型
    if (!isValidFileType(selectedFile)) {
      setFileError('不支持的文件类型，请上传图片、PDF、Word、PPT 或 Excel 文件');
      setFile(null);
      return;
    }

    // 验证文件大小
    if (!isValidFileSize(selectedFile)) {
      setFileError(`文件大小不能超过 ${formatFileSize(MAX_FILE_SIZE)}`);
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFileError('');

    // 验证：标题必填
    if (!title.trim()) {
      setError('请输入标题');
      return;
    }

    // 验证：文件必填
    if (!file) {
      setFileError('请选择要上传的文件');
      return;
    }

    // 验证：标签必填
    if (tags.length === 0) {
      setError('请至少添加一个标签');
      return;
    }

    setUploading(true);

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // 上传文件
      let fileUrl: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;
      let fileSize: number | null = null;

      if (file) {
        const uploadResult = await uploadFile(file, 'files', 'notes');
        fileUrl = uploadResult.url;
        fileName = file.name;
        fileType = file.type || getFileMimeType(file.name);
        fileSize = file.size;
      }

      // 插入笔记记录
      const { data: noteData, error: insertError } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType,
          file_size: fileSize,
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      const noteId = noteData.id;

      // 处理标签 - 查找或创建标签并关联
      for (const tagName of tags) {
        // 查找或创建标签
        let tagId;
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tagName)
          .maybeSingle();

        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const { data: newTag } = await supabase
            .from('tags')
            .insert({ name: tagName })
            .select('id')
            .single();
          tagId = newTag?.id;
        }

        // 关联标签到笔记
        if (tagId && noteId) {
          await supabase
            .from('note_tags')
            .insert({ note_id: noteId, tag_id: tagId });
        }
      }

      alert('笔记上传成功！等待管理员审核后即可在笔记库中查看。');

      // 重置表单
      setTitle('');
      setDescription('');
      setTags([]);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err: any) {
      console.error('上传失败:', err);
      setError(err.message || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  function getFileMimeType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();
    const mimeMap: Record<string, string> = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
      'gif': 'image/gif', 'webp': 'image/webp', 'pdf': 'application/pdf',
      'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'ppt': 'application/vnd.ms-powerpoint', 'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'xls': 'application/vnd.ms-excel', 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain', 'zip': 'application/zip', 'rar': 'application/x-rar-compressed',
    };
    return mimeMap[ext || ''] || 'application/octet-stream';
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">上传笔记</h1>
          <p className="text-gray-500 mt-1">分享你的学习笔记，帮助更多同学</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给笔记起个名字吧"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={uploading}
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简单介绍一下笔记的内容..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              disabled={uploading}
            />
          </div>

          {/* 文件上传 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文件 <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_EXTENSIONS}
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                {file ? (
                  <div className="space-y-2">
                    <div className="text-4xl">📄</div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      移除文件
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-4xl">📁</div>
                    <p className="text-gray-600">点击选择文件</p>
                    <p className="text-xs text-gray-400">
                      支持图片、PDF、Word、PPT、Excel 等格式
                    </p>
                    <p className="text-xs text-gray-400">
                      最大文件大小 {formatFileSize(MAX_FILE_SIZE)}
                    </p>
                  </div>
                )}
              </label>
            </div>
            {fileError && (
              <p className="mt-2 text-sm text-red-600">{fileError}</p>
            )}
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签 <span className="text-red-500">*</span>
            </label>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="添加标签（如：高等数学、力学、复习笔记）"
            />
          </div>

          {/* 提交按钮 */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={uploading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? '上传中...' : '上传笔记'}
            </button>
          </div>
        </form>

        {/* 提示信息 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <strong>提示：</strong>上传的笔记需要经过管理员审核后才能在笔记库中显示。
            支持的文件格式包括：图片（JPG、PNG、GIF）、PDF、Word、PPT、Excel 等。
          </p>
        </div>
      </div>
    </div>
  );
}
