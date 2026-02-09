import { getSupabase } from './supabase';

// 支持的文件类型
export const ACCEPTED_FILE_TYPES = {
  // 图片
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  // 文档
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  // 压缩文件
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
};

// 文件大小限制 (50MB)
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 获取文件 MIME 类型
export function getFileMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
  };
  return mimeMap[ext || ''] || 'application/octet-stream';
}

// 验证文件类型
export function isValidFileType(file: File): boolean {
  const mimeType = file.type || getFileMimeType(file.name);
  return Object.keys(ACCEPTED_FILE_TYPES).includes(mimeType);
}

// 验证文件大小
export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 获取文件图标
export function getFileIcon(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const iconMap: Record<string, string> = {
    'pdf': '📄',
    'doc': '📝',
    'docx': '📝',
    'ppt': '📊',
    'pptx': '📊',
    'xls': '📈',
    'xlsx': '📈',
    'txt': '📃',
    'zip': '📦',
    'rar': '📦',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'png': '🖼️',
    'gif': '🖼️',
    'webp': '🖼️',
  };
  return iconMap[ext || ''] || '📄';
}

// 上传文件到 Supabase Storage
export async function uploadFile(
  file: File,
  bucket: string = 'files',
  folder: string = 'notes'
): Promise<{ url: string; path: string }> {
  const supabase = getSupabase();

  // 生成唯一文件名
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  // 获取 MIME 类型
  const mimeType = file.type || getFileMimeType(file.name);

  // 上传文件
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`上传失败: ${error.message}`);
  }

  // 获取公共 URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return {
    url: publicUrl,
    path: filePath,
  };
}

// 删除文件
export async function deleteFile(path: string, bucket: string = 'files'): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw new Error(`删除失败: ${error.message}`);
  }
}

// 上传用户头像
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<{ url: string; path: string }> {
  // 验证文件类型（只允许图片）
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('头像只支持 JPG、PNG、GIF、WebP 格式');
  }

  // 验证文件大小（最大 2MB）
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('头像大小不能超过 2MB');
  }

  const supabase = getSupabase();

  // 生成唯一文件名
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  // 上传文件
  const { data, error } = await supabase.storage
    .from('files')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: true, // 覆盖旧头像
    });

  if (error) {
    throw new Error(`上传头像失败: ${error.message}`);
  }

  // 获取公共 URL
  const { data: { publicUrl } } = supabase.storage
    .from('files')
    .getPublicUrl(filePath);

  return {
    url: publicUrl,
    path: filePath,
  };
}
