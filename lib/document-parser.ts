/**
 * 文档解析服务
 * 支持解析 PDF、DOCX、Markdown、TXT 等格式，转换成 Markdown
 */

import pdf from 'pdf-parse';
const mammoth = require('mammoth');

/**
 * 文档转换结果（转 Markdown）
 */
export interface DocumentConvertResult {
  success: boolean;
  markdown: string;
  error?: string;
  warning?: string;
}

/**
 * 文档解析结果
 */
export interface DocumentParseResult {
  success: boolean;
  questions: any[];
  markdown?: string;
  error?: string;
  warning?: string;
}

/**
 * 将文档转换成 Markdown
 */
export async function convertToMarkdown(
  buffer: Buffer,
  mimeType: string
): Promise<DocumentConvertResult> {
  try {
    let text = '';

    switch (mimeType) {
      case 'application/pdf':
        text = await parsePDF(buffer);
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        text = await parseDOCX(buffer);
        break;

      case 'text/markdown':
      case 'text/plain':
        text = buffer.toString('utf-8');
        break;

      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.slideshow':
        return {
          success: false,
          markdown: '',
          warning: 'PPT 格式暂不支持，建议转换为 PDF 或 DOCX',
        };

      default:
        return {
          success: false,
          markdown: '',
          error: `不支持的文件类型: ${mimeType}`,
        };
    }

    // 清理并格式化文本为 Markdown
    const markdown = formatToMarkdown(text);

    return {
      success: true,
      markdown,
    };
  } catch (err: any) {
    console.error('文档转换错误:', err);
    return {
      success: false,
      markdown: '',
      error: err.message || '文档转换失败',
    };
  }
}

/**
 * 从 Buffer 解析文档（旧接口，保留兼容性）
 */
export async function parseDocument(
  buffer: Buffer,
  mimeType: string
): Promise<DocumentParseResult> {
  const convertResult = await convertToMarkdown(buffer, mimeType);

  if (!convertResult.success || !convertResult.markdown) {
    return {
      success: false,
      questions: [],
      error: convertResult.error,
      warning: convertResult.warning,
    };
  }

  // 返回原始 Markdown 内容
  return {
    success: true,
    questions: [],
    markdown: convertResult.markdown,
  };
}

/**
 * 将文本格式化为 Markdown
 */
function formatToMarkdown(text: string): string {
  // 清理文本
  let markdown = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .trim();

  // 添加文档标题标记
  if (markdown.length > 0) {
    markdown = `# 文档内容\n\n${markdown}`;
  }

  return markdown;
}

/**
 * 解析 PDF 文件
 */
async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text || '';
  } catch (err: any) {
    throw new Error(`PDF 解析失败: ${err.message || err}`);
  }
}

/**
 * 解析 DOCX 文件
 */
async function parseDOCX(buffer: Buffer): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    mammoth.extractRawText({ buffer })
      .then((result: any) => {
        resolve(result.value || '');
      })
      .catch((err: any) => {
        reject(new Error(`DOCX 解析失败: ${err.message || err}`));
      });
  });
}
