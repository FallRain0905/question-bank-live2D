import { NextRequest, NextResponse } from 'next/server';
import { callAI, type AIConfig } from '@/lib/ai-service';

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
  console.log('>>> 开始 AI 配对题目和答案...');

  try {
    const { provider, apiKey, apiUrl, model, questionMarkdown, answersMarkdown } = await req.json();

    if (!questionMarkdown || !answersMarkdown) {
      return NextResponse.json(
        { success: false, error: '缺少题目或答案内容' },
        { status: 400 }
      );
    }

    // 构建 AI 配置 - 必须提供所有参数
    if (!provider || !apiKey) {
      return NextResponse.json(
        { success: false, error: '请先配置 AI 模型和 API Key' },
        { status: 400 }
      );
    }

    const config: AIConfig = {
      provider,
      apiKey,
      apiUrl,
      model,
    };

    console.log('使用 AI 提供商:', config.provider);

    const prompt = `你是一个题目和答案匹配专家。
请将题目文档和答案文档中的内容进行匹配配对。

要求：
1. 注意：文档内包含 LaTeX 公式（如 $...$、\\[...\\] 等），请完整保留公式内容。
2. 在 JSON 输出时，所有的 LaTeX 反斜杠 \\ 必须保持为双反斜杠（\\\\）。
3. 根据题号或内容匹配题目和答案。

输出格式（必须是纯 JSON）：
{
  "questions": [
    {
      "question_text": "题目内容",
      "answer_text": "对应的答案内容"
    }
  ]
}

=== 题目文档 ===
${questionMarkdown}

=== 答案文档 ===
${answersMarkdown}

请直接输出 JSON，不要包含任何其他文字或代码块标记。`;

    // 调用 AI
    const result = await callAI(config, [
      { role: 'system', content: '你是一个专业的题目答案匹配助手。' },
      { role: 'user', content: prompt },
    ], { maxTokens: 8000 });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'AI 调用失败' },
        { status: 500 }
      );
    }

    let content = result.content || '';

    // 清理 markdown 代码块标记
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    }
    if (content.includes('```')) {
      content = content.replace(/```\s*/g, '');
    }

    // 修复 LaTeX 转义
    content = fixLaTeXEscaping(content);

    // 解析 JSON
    let questions: ParsedQuestion[];
    try {
      const parsed = JSON.parse(content);
      questions = parsed.questions || [];
    } catch (parseError) {
      console.error('JSON 解析失败:', parseError);
      const jsonMatch = content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          questions = parsed.questions || [];
        } catch {
          return NextResponse.json(
            { success: false, error: 'JSON 解析失败' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: '无法提取有效的 JSON' },
          { status: 500 }
        );
      }
    }

    console.log(`>>> 成功配对 ${questions.length} 道题目`);

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error: any) {
    console.error('AI 配对失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '未知错误' },
      { status: 500 }
    );
  }
}
