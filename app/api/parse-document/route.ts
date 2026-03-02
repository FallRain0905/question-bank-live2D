import { NextRequest, NextResponse } from 'next/server';

const mammoth: any = require('mammoth');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log('>>> 开始处理解析请求...');

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('未找到文件对象');
      return NextResponse.json(
        { success: false, error: '文件上传失败' },
        { status: 400 }
      );
    }

    console.log(`收到文件: ${file.name}, 大小: ${(file.size / 1024).toFixed(2)} KB`);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let markdownText = '';

    // 根据文件后缀或类型判断解析方式
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.docx')) {
      console.log('正在解析 Word...');
      try {
        const result = await mammoth.extractRawText({ buffer });
        markdownText = `# ${file.name}\n\n${result.value}`;
        console.log('Word 解析成功，长度:', markdownText.length);
      } catch (err: any) {
        console.error('Word 解析错误:', err);
        throw new Error(`Word 解析失败: ${err.message || err}`);
      }
    }
    else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      console.log('正在解析文本文件...');
      markdownText = `# ${file.name}\n\n${buffer.toString('utf-8')}`;
      console.log('文本解析成功，长度:', markdownText.length);
    }
    else {
      return NextResponse.json(
        { success: false, error: '暂不支持此格式，请上传 .txt、.md 或 .docx 文件' },
        { status: 400 }
      );
    }

    console.log('解析成功，准备返回 JSON');

    return NextResponse.json({
      success: true,
      markdown: markdownText
    });

  } catch (error: any) {
    // 捕获所有可能的崩溃，确保返回 JSON 而不是 HTML
    console.error('【后端崩溃详细日志】:', error);
    console.error('错误堆栈:', error?.stack);

    return NextResponse.json({
      success: false,
      error: error?.message || '服务器解析过程中发生未知错误'
    }, { status: 500 });
  }
}
