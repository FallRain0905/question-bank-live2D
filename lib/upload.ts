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
  const { error } = await supabase.storage
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

// 下载文件（移动端优化版）
export async function downloadFile(
  url: string,
  fileName: string
): Promise<void> {
  // 检测是否为移动设备
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // 移动端直接使用锚标签打开（iOS Safari 对 download 属性支持有限）
  if (isMobile) {
    // 对于移动端，直接创建一个锚标签让点击
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.position = 'absolute';
    link.style.left = '-9999px';
    document.body.appendChild(link);

    // 触发点击
    link.click();

    // 移动端延迟更长时间确保下载开始
    setTimeout(() => {
      document.body.removeChild(link);
    }, isIOS ? 500 : 200);
    return;
  }

  // 桌面端使用 Blob 方式下载
  try {
    // 使用 fetch 获取文件
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('下载失败');
    }

    // 获取文件内容为 blob
    const blob = await response.blob();

    // 创建临时链接并触发下载
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);

    // 触发下载
    link.click();

    // 清理 - 延迟确保下载已触发
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }, 200);
  } catch (error) {
    console.error('下载文件失败:', error);
    // 降级方案：直接打开链接
    const fallbackLink = document.createElement('a');
    fallbackLink.href = url;
    fallbackLink.target = '_blank';
    fallbackLink.rel = 'noopener noreferrer';
    fallbackLink.download = fileName;
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    setTimeout(() => document.body.removeChild(fallbackLink), 200);
  }
}

// 移动端下载按钮点击处理器（内联使用）
export function handleMobileDownloadClick(
  event: React.MouseEvent,
  url: string,
  fileName: string
): void {
  // 阻止默认行为，手动处理
  event.preventDefault();

  // iOS 特殊处理：直接 window.open
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIOS) {
    // iOS Safari：在新标签页打开文件
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  // Android：尝试下载
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();

  // 延迟清理
  setTimeout(() => {
    document.body.removeChild(link);
  }, 200);
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
  const { error } = await supabase.storage
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
