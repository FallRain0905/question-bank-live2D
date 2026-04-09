/**
 * 文件解析服务
 * 支持多种文件格式的解析和内容提取
 */

export interface ParsedFile {
  fileName: string;
  fileType: string;
  content: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    charCount?: number;
    extractedText?: string;
  };
}

/**
 * 解析上传的文件
 */
export async function parseUploadedFile(file: File): Promise<ParsedFile> {
  const fileType = file.type;
  const fileName = file.name;

  // 图片文件处理
  if (fileType.startsWith('image/')) {
    return {
      fileName,
      fileType: 'image',
      content: `[图片文件] ${fileName}`,
      metadata: {
        extractedText: await extractTextFromImage(file),
      }
    };
  }

  // PDF文件处理
  if (fileType === 'application/pdf') {
    return await parsePDFFile(file, fileName);
  }

  // Word文档处理
  if (fileType.includes('word') || fileType.includes('document')) {
    return await parseWordFile(file, fileName);
  }

  // 文本文件处理
  if (fileType === 'text/plain') {
    return await parseTextFile(file, fileName);
  }

  // Markdown文件处理
  if (fileType === 'text/markdown' || fileName.endsWith('.md')) {
    return await parseMarkdownFile(file, fileName);
  }

  // 默认处理
  return await parseTextFile(file, fileName);
}

/**
 * 解析文本文件
 */
async function parseTextFile(file: File, fileName: string): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n');
      const words = content.split(/\s+/).filter(w => w.length > 0);

      resolve({
        fileName,
        fileType: 'text',
        content,
        metadata: {
          wordCount: words.length,
          charCount: content.length,
          pageCount: Math.ceil(lines.length / 50), // 估算页数
        }
      });
    };

    reader.onerror = () => reject(new Error('读取文本文件失败'));
    reader.readAsText(file);
  });
}

/**
 * 解析Markdown文件
 */
async function parseMarkdownFile(file: File, fileName: string): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n');
      const words = content.split(/\s+/).filter(w => w.length > 0);

      // 提取Markdown标题
      const headings = content.match(/^#{1,6}\s+.+$/gm) || [];

      resolve({
        fileName,
        fileType: 'markdown',
        content,
        metadata: {
          wordCount: words.length,
          charCount: content.length,
          pageCount: Math.ceil(lines.length / 30), // Markdown通常较简洁
          extractedText: `文档标题：${headings.slice(0, 5).join(', ') || '无标题'}`,
        }
      });
    };

    reader.onerror = () => reject(new Error('读取Markdown文件失败'));
    reader.readAsText(file);
  });
}

/**
 * 解析PDF文件（简化版本）
 */
async function parsePDFFile(file: File, fileName: string): Promise<ParsedFile> {
  // 这里简化处理，实际应用中应该使用pdf.js或类似库
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      // 尝试提取文本（简化版本）
      const content = e.target?.result as string;

      // PDF文本通常包含大量换行符，这里做简化处理
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      const words = content.split(/\s+/).filter(w => w.length > 0);

      resolve({
        fileName,
        fileType: 'pdf',
        content: `[PDF文档内容提取]\n${content.substring(0, 1000)}...`,
        metadata: {
          pageCount: lines.length > 10 ? Math.ceil(lines.length / 20) : 1,
          wordCount: words.length,
          charCount: content.length,
          extractedText: `PDF文档，${lines.length} 行内容`,
        }
      });
    };

    reader.onerror = () => reject(new Error('读取PDF文件失败'));
    reader.readAsText(file);
  });
}

/**
 * 解析Word文档（简化版本）
 */
async function parseWordFile(file: File, fileName: string): Promise<ParsedFile> {
  // 这里简化处理，实际应用中应该使用mammoth.js或类似库
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;

      // Word文档转文本后的简化处理
      const cleanContent = content
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();

      const lines = cleanContent.split('\n').filter(line => line.trim().length > 0);
      const words = cleanContent.split(/\s+/).filter(w => w.length > 0);

      resolve({
        fileName,
        fileType: 'word',
        content: `[Word文档内容提取]\n${cleanContent.substring(0, 1000)}...`,
        metadata: {
          wordCount: words.length,
          charCount: cleanContent.length,
          pageCount: Math.ceil(lines.length / 25), // Word文档通常有固定页数
          extractedText: `Word文档，${lines.length} 段内容`,
        }
      });
    };

    reader.onerror = () => reject(new Error('读取Word文档失败'));
    reader.readAsText(file);
  });
}

/**
 * 从图片提取文本（使用OCR）
 * 这是一个简化版本，实际应用中应该使用Tesseract.js或API
 */
async function extractTextFromImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      // 这里简化处理，返回图片描述而不是OCR
      resolve(`上传了图片文件：${file.name}`);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 为AI处理文件内容
 */
export function prepareFileForAI(parsedFile: ParsedFile): {
  fileDescription: string;
  contentForAI: string;
} {
  const { fileName, fileType, content, metadata } = parsedFile;

  let fileDescription = `[文件分析] 上传了${fileName} (${fileType})\n`;

  if (metadata?.extractedText) {
    fileDescription += `提取内容：${metadata.extractedText}\n`;
  }

  if (metadata?.wordCount) {
    fileDescription += `字数统计：${metadata.wordCount} 字\n`;
  }

  if (metadata?.pageCount) {
    fileDescription += `页数估算：${metadata.pageCount} 页\n`;
  }

  // 准备给AI的内容
  let contentForAI = `用户上传了一个文件：${fileName}\n\n文件内容如下：\n\n${content}\n\n请帮我分析这个文件的内容。`;

  return {
    fileDescription,
    contentForAI,
  };
}

/**
 * 获取文件图标
 */
export function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const icons: Record<string, string> = {
    md: '📝',
    txt: '📄',
    pdf: '📕',
    docx: '📝',
    doc: '📝',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    webp: '🖼️',
  };
  return icons[ext || '📄'] || '📄';
}

/**
 * 检查文件类型是否支持
 */
export function isFileTypeSupported(file: File): boolean {
  const supportedTypes = [
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

  return supportedTypes.includes(file.type);
}

/**
 * 获取文件类型显示名称
 */
export function getFileTypeDisplay(fileType: string): string {
  const types: Record<string, string> = {
    'text': '文本文件',
    'markdown': 'Markdown文档',
    'pdf': 'PDF文档',
    'word': 'Word文档',
    'image': '图片文件',
  };

  return types[fileType] || '文档';
}
