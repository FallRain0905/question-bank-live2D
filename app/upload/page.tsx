'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { uploadImage, attachTagsToQuestion, getAllTags } from '@/lib/utils';
import TagInput from '@/components/TagInput';

interface QuestionImage {
  file: File;
  preview: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 题目相关
  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState<QuestionImage | null>(null);
  const questionImageInputRef = useRef<HTMLInputElement>(null);

  // 答案相关
  const [answerText, setAnswerText] = useState('');
  const [answerImage, setAnswerImage] = useState<QuestionImage | null>(null);
  const answerImageInputRef = useRef<HTMLInputElement>(null);

  // 标签
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    // 检查登录状态
    const checkAuth = async () => {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser({ id: user.id, email: user.email || '' });

      // 获取所有标签
      const allTags = await getAllTags();
      setAvailableTags(allTags);
    };

    checkAuth();
  }, [router]);

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'question' | 'answer'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }

    setError('');

    // 创建预览
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageData = {
        file,
        preview: reader.result as string
      };

      if (type === 'question') {
        setQuestionImage(imageData);
      } else {
        setAnswerImage(imageData);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (type: 'question' | 'answer') => {
    if (type === 'question') {
      setQuestionImage(null);
      questionImageInputRef.current?.value && (questionImageInputRef.current.value = '');
    } else {
      setAnswerImage(null);
      answerImageInputRef.current?.value && (answerImageInputRef.current.value = '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证：至少有题目文本或图片
    if (!questionText.trim() && !questionImage) {
      setError('请输入题目文本或上传题目图片');
      return;
    }

    // 验证：至少有答案文本或图片
    if (!answerText.trim() && !answerImage) {
      setError('请输入答案文本或上传答案图片');
      return;
    }

    // 验证：标签必填
    if (tags.length === 0) {
      setError('请至少添加一个标签');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 上传题目图片
      let questionImageUrl: string | null = null;
      if (questionImage) {
        questionImageUrl = await uploadImage(questionImage.file, user!.id);
        if (!questionImageUrl) {
          throw new Error('题目图片上传失败');
        }
      }

      // 上传答案图片
      let answerImageUrl: string | null = null;
      if (answerImage) {
        answerImageUrl = await uploadImage(answerImage.file, user!.id);
        if (!answerImageUrl) {
          throw new Error('答案图片上传失败');
        }
      }

      // 创建题目记录（状态为 pending 等待审核）
      const { data: question, error: insertError } = await getSupabase()
        .from('questions')
        .insert({
          user_id: user!.id,
          question_text: questionText.trim() || null,
          question_image_url: questionImageUrl,
          answer_text: answerText.trim() || null,
          answer_image_url: answerImageUrl,
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertError || !question) {
        throw new Error(insertError?.message || '创建题目失败');
      }

      // 关联标签
      await attachTagsToQuestion(question.id, tags);

      // 成功！
      alert('题目上传成功！等待管理员审核通过后将出现在题库中。');
      // 重置表单
      setQuestionText('');
      setAnswerText('');
      setQuestionImage(null);
      setAnswerImage(null);
      setTags([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">上传题目</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 题目区域 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">题目 <span className="text-red-500">*</span></h2>

            {/* 题目文本 */}
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="输入题目内容..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />

            {/* 题目图片 */}
            <div className="mt-4">
              <input
                ref={questionImageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e, 'question')}
                className="hidden"
              />
              {questionImage ? (
                <div className="relative">
                  <img
                    src={questionImage.preview}
                    alt="题目预览"
                    className="max-w-full h-auto rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage('question')}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => questionImageInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  <div className="text-center">
                    <span className="text-3xl">📷</span>
                    <p className="mt-2 text-sm text-gray-600">点击上传题目图片</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* 答案区域 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">答案 <span className="text-red-500">*</span></h2>

            {/* 答案文本 */}
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="输入答案内容..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />

            {/* 答案图片 */}
            <div className="mt-4">
              <input
                ref={answerImageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e, 'answer')}
                className="hidden"
              />
              {answerImage ? (
                <div className="relative">
                  <img
                    src={answerImage.preview}
                    alt="答案预览"
                    className="max-w-full h-auto rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage('answer')}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => answerImageInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  <div className="text-center">
                    <span className="text-3xl">📷</span>
                    <p className="mt-2 text-sm text-gray-600">点击上传答案图片</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* 标签区域 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">标签 <span className="text-red-500">*</span></h2>
            <p className="text-sm text-gray-500 mb-3">至少添加一个标签，方便分类和搜索</p>
            <TagInput
              tags={tags}
              availableTags={availableTags}
              onChange={setTags}
              placeholder="添加标签（如：数学、选择题）..."
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '上传中...' : '提交题目'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
