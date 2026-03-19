import { NextRequest, NextResponse } from 'next/server';
import { callAI, type AIConfig } from '@/lib/ai-service';

interface Question {
  question_text: string;
  answer_text?: string;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log('>>> 开始 AI 生成答案...');

  try {
    const { provider, apiKey, apiUrl, model, questions } = await req.json();

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: '缺少题目内容' },
        { status: 400 }
      );
    }

    // 构建 AI 配置
    const config: AIConfig = {
      provider: provider || 'qwen',
      apiKey: apiKey || '',
      apiUrl,
      model,
    };

    // 千问不需要用户填 API Key
    if (config.provider !== 'qwen' && !config.apiKey) {
      return NextResponse.json(
        { success: false, error: '缺少 API Key' },
        { status: 400 }
      );
    }

    console.log('使用 AI 提供商:', config.provider);
    console.log('待生成答案的题目数:', questions.length);

    // 批量处理题目（每次最多处理 10 道）
    const batchSize = 10;
    const allResults: Question[] = [];

    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      
      const prompt = `你是一个专业的题目解答专家。
请为以下题目生成答案。

要求：
1. 答案要准确、简洁、完整
2. 如果题目包含 LaTeX 公式，答案中的公式也要用 LaTeX 格式
3. 在 JSON 输出时，所有的 LaTeX 反斜杠 \\ 必须保持为双反斜杠（\\\\）

输出格式（必须是纯 JSON）：
{
  "questions": [
    {
      "question_text": "原题目",
      "answer_text": "生成的答案"
    }
  ]
}

=== 题目列表 ===
${batch.map((q: Question, idx: number) => `${idx + 1}. ${q.question_text}`).join('\n')}

请直接输出 JSON，不要包含任何其他文字或代码块标记。`;

      // 调用 AI
      const result = await callAI(config, [
        { role: 'system', content: '你是一个专业的题目解答助手，擅长生成准确、详细的答案。' },
        { role: 'user', content: prompt },
      ], { maxTokens: 8000 });

      if (!result.success) {
        console.error('批次处理失败:', result.error);
        // 失败时保留原题目
        allResults.push(...batch);
        continue;
      }

      let content = result.content || '';

      // 清理 markdown 代码块标记
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      }
      if (content.includes('```')) {
        content = content.replace(/```\s*/g, '');
      }

      try {
        const parsed = JSON.parse(content);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          allResults.push(...parsed.questions);
        } else {
          allResults.push(...batch);
        }
      } catch {
        console.error('JSON 解析失败，保留原题目');
        allResults.push(...batch);
      }
    }

    console.log(`>>> 成功生成 ${allResults.length} 道题目的答案`);

    return NextResponse.json({
      success: true,
      questions: allResults,
    });
  } catch (error: any) {
    console.error('AI 生成答案失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '未知错误' },
      { status: 500 }
    );
  }
}
