import { NextRequest, NextResponse } from 'next/server';
import { callAI, getDefaultConfig, type AIConfig } from '@/lib/ai-service';

interface ParsedQuestion {
  question_text: string;
  answer_text?: string;
}

// LaTeX 反斜杠修复函数
function fixLaTeXEscaping(jsonStr: string): string {
  return jsonStr.replace(/(?<!\\)\\(?=[a-zA-Z0-9])/g, '\\\\');
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log('>>> 开始 AI 解析题目...');

  try {
    const { provider, apiKey, apiUrl, model, markdown } = await req.json();

    if (!markdown) {
      return NextResponse.json(
        { success: false, error: '缺少 markdown 内容' },
        { status: 400 }
      );
    }

    // 构建 AI 配置
    const config: AIConfig = provider ? {
      provider,
      apiKey,
      apiUrl,
      model,
    } : getDefaultConfig();

    // 千问不需要用户填 API Key
    if (config.provider !== 'qwen' && !config.apiKey) {
      return NextResponse.json(
        { success: false, error: '缺少 API Key' },
        { status: 400 }
      );
    }

    console.log('使用 AI 提供商:', config.provider);
    console.log('Markdown 内容长度:', markdown.length);

    // 构建 prompt
    const prompt = `你是一个题目提取专家。
请将以下 Markdown 文档中的题目提取出来，严格按照以下 JSON 格式输出。

要求：
1. 注意：markdown 文件内包含 LaTeX 公式（如 $...$、\\[...\\] 等），请完整保留公式内容，不要修改或省略。
2. 在 JSON 输出时所有的 LaTeX 反斜杠 \\ 必须保持为双反斜杠（\\\\），这是 JSON 的转义规则。
3. 识别题目和答案的对应关系。

输出格式（必须是纯 JSON，不要包含任何 markdown 代码块标记）：
{
  "questions": [
    {
      "question_text": "题目内容（保留 LaTeX 公式，反斜杠用双反斜杠）",
      "answer_text": "答案内容（如果没有答案可以省略或留空）"
    }
  ]
}

请仔细阅读以下文档内容并提取题目：

---
${markdown}
---

请直接输出 JSON，不要包含任何其他文字或代码块标记。`;

    // 调用 AI
    const result = await callAI(config, [
      { role: 'system', content: '你是一个专业的题目提取助手，擅长识别和结构化各种格式的题目。' },
      { role: 'user', content: prompt },
    ], 8000);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'AI 调用失败' },
        { status: 500 }
      );
    }

    let content = result.content || '';

    // 清理可能的 markdown 代码块标记
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    }
    if (content.includes('```')) {
      content = content.replace(/```\s*/g, '');
    }

    // 修复 LaTeX 转义问题
    content = fixLaTeXEscaping(content);

    console.log('AI 返回内容长度:', content.length);
    console.log('AI 返回内容预览:', content.substring(0, 200) '...');

    // 解析 JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('JSON 解析失败:', e);
      console.log('原始内容:', content);
      return NextResponse.json(
        { success: false, error: 'AI 返回的数据格式不正确，无法解析。原始内容: ' + content.substring(0, 500) },
        { status: 500 }
      );
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { success: false, error: 'AI 未返回有效的题目列表' },
        { status: 500 }
      );
    }

    console.log('提取到', parsed.questions.length, ' 道题目');

    return NextResponse.json({
      success: true,
      questions: parsed.questions as ParsedQuestion[],
    });
  } catch (error: any) {
    console.error('AI 解析失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}
