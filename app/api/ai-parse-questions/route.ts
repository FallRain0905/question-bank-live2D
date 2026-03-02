import { NextRequest, NextResponse } from 'next/server';

// Kimi API 配置
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

interface KimiRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature: number;
  max_tokens?: number;
}

interface ParsedQuestion {
  question_text: string;
  answer_text?: string;
}

// LaTeX 反斜杠修复函数
function fixLaTeXEscaping(jsonStr: string): string {
  // 将未转义的 LaTeX 反斜杠转为双反斜杠
  // 只匹配后面跟着字母/数字的单反斜杠，避开已经是双反斜杠的情况
  return jsonStr.replace(/(?<!\\)\\(?=[a-zA-Z0-9])/g, '\\\\');
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log('>>> 开始 AI 解析题目...');

  try {
    const { apiKey, markdown } = await req.json();

    if (!markdown) {
      return NextResponse.json(
        { success: false, error: '缺少 markdown 内容' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: '缺少 API Key' },
        { status: 400 }
      );
    }

    console.log('Markdown 内容长度:', markdown.length);

    // 调用 Kimi API - 使用更高的 token 限制并强调 JSON 格式
    const prompt = `你是一个题目提取专家。
请将以下 Markdown 文档中的题目提取出来，严格按照以下 JSON 格式输出。

要求：
1. 注意：markdown 文件内包含 LaTeX 公式（如 $...$、\\[...\\] 等），请完整保留公式内容，不要修改或省略。
2. 在 JSON 输出时，所有的 LaTeX 反斜杠 \\ 必须保持为双反斜杠（\\\\），这是 JSON 的转义规则。
3. 识别题目和答案的对应关系。
4. 支持多种格式：数字编号（1. 2.）、中文序号（一、二、）、Q/A 形式、题目/答案形式。
5. 如果没有明确答案，答案字段设为 null。
6. 每道题目包含 question_text（题目内容）和 answer_text（答案内容）两个字段。
7. 一定要完整提取所有题目，不要遗漏。

【重要 - 选择题处理规则】：
- 选择题的 question_text 必须包含完整的题干和所有选项（A. xxx B. xxx C. xxx D. xxx）
- 题干和选项是一个整体，必须全部提取到 question_text 中
- 选择题的 answer_text 应该只包含正确答案的字母（如"A"、"B"、"C"、"D"或"AB"等）
- 只有明确标注的答案才是答案，选项只是题目的一部分
- 如果文档中没有标注答案，answer_text 必须设为 null，不要猜测
- 示例：
  原题：1. 下列哪项是正确的？A. 选项一 B. 选项二 C. 选项三 D. 选项四  答案：A
  提取为：question_text = "1. 下列哪项是正确的？A. 选项一 B. 选项二 C. 选项三 D. 选项四", answer_text = "A"

返回格式必须是纯 JSON 数组，格式如下：
[
  {
    "question_text": "题目内容",
    "answer_text": "答案内容或null"
  }
]

注意：
- 只返回 JSON 数组，不要包含任何 Markdown 格式标记（如 \`\`\`json）。
- 确保 JSON 格式合法，所有的引号和反斜杠都正确转义。
- 数学公式中的 \\ 必须保持为 \\\\。
- 题目只有题干和选项而没有答案时，answer_text 一定要设为 null。

文档内容：
${markdown}`;

    const request: KimiRequest = {
      model: 'moonshot-v1-8k',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 4000,  // 提高 token 限制
    };

    console.log('正在调用 Kimi API...');

    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kimi API 调用失败:', errorText);
      return NextResponse.json(
        { success: false, error: 'Kimi API 调用失败' },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('Kimi API 返回状态:', data.choices?.[0]?.finish_reason);
    console.log('Kimi API 返回 token 使用:', data.usage?.total_tokens);

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('AI 未返回内容，完整响应:', JSON.stringify(data));
      return NextResponse.json(
        { success: false, error: 'AI 未返回内容' },
        { status: 500 }
      );
    }

    console.log('AI 返回内容前 500 字符:', content?.slice(0, 500));
    console.log('AI 返回完整内容:', content);

    // 尝试多种 JSON 解析方式
    let questions: ParsedQuestion[] = [];

    // 方式1: 尝试直接解析整个内容
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        console.log('方式1 直接解析成功，题目数:', parsed.length);
        return NextResponse.json({ success: true, questions: parsed });
      }
      console.log('方式1 解析结果不是数组:', typeof parsed);
    } catch (e: any) {
      console.log('方式1 直接解析失败:', e.message);
    }

    // 方式2: 尝试提取 JSON 数组（支持 ```json 包裹）+ LaTeX 修复
    try {
      let cleanContent = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      console.log('清理后内容前 200 字符:', cleanContent.slice(0, 200));

      const arrayMatch = cleanContent.match(/\[[\s\S\n]*\]/);
      if (arrayMatch) {
        // 尝试标准解析
        try {
          const parsed = JSON.parse(arrayMatch[0]);
          if (Array.isArray(parsed)) {
            console.log('方式2 数组提取成功，题目数:', parsed.length);
            return NextResponse.json({ success: true, questions: parsed });
          }
        } catch (e: any) {
          // 标准解析失败，尝试修复 LaTeX 转义
          console.log('方式2 标准解析失败，尝试修复 LaTeX:', e.message);
          const fixedContent = fixLaTeXEscaping(arrayMatch[0]);
          console.log('修复后内容前 200 字符:', fixedContent.slice(0, 200));
          const parsed = JSON.parse(fixedContent);
          if (Array.isArray(parsed)) {
            console.log('方式2 修复后解析成功，题目数:', parsed.length);
            return NextResponse.json({ success: true, questions: parsed });
          }
        }
      }
    } catch (e: any) {
      console.log('方式2 数组提取失败:', e.message);
    }

    // 方式3: 尝试提取所有 JSON 对象 + LaTeX 修复
    try {
      const objectMatches = content.match(/\{[^{}]*"question_text"[^{}]*"answer_text"[^{}]*\}/g);

      if (objectMatches && objectMatches.length > 0) {
        for (const match of objectMatches) {
          try {
            const obj = JSON.parse(match);
            if (obj.question_text) {
              questions.push({
                question_text: obj.question_text,
                answer_text: obj.answer_text || null,
              });
            }
          } catch {
            // 尝试修复后解析
            try {
              const fixedMatch = fixLaTeXEscaping(match);
              const obj = JSON.parse(fixedMatch);
              if (obj.question_text) {
                questions.push({
                  question_text: obj.question_text,
                  answer_text: obj.answer_text || null,
                });
              }
            } catch {
              // 跳过无效的对象
            }
          }
        }

        if (questions.length > 0) {
          console.log('方式3 对象提取成功，题目数:', questions.length);
          return NextResponse.json({ success: true, questions });
        }
      }
    } catch (e: any) {
      console.log('方式3 对象提取失败:', e.message);
    }

    // 方式4: 正则提取题目和答案（匹配常见格式）
    try {
      const patterns = [
        /([^\n]{5,200})[：:]\s*([^\n]{1,500})/g,
        /(?:问|题目|Question)[:：]\s*([^答\n]{5,200})\s*(?:答|答案|Answer)[:：]\s*([^\n]{1,500})/gi,
        /(?:^|\n)\d+\.\s*([^\n]{5,200})\s*\n\s*(?:答案|Answer)[:：]\s*([^\n]{1,500})/gi,
      ];

      for (const pattern of patterns) {
        const matches = [...content.matchAll(pattern)];
        for (const match of matches) {
          const qText = match[1]?.trim();
          const aText = match[2]?.trim();
          if (qText && qText.length > 3 && qText.length < 200) {
            // 检查是否是重复的题目
            const isDuplicate = questions.some(q => q.question_text === qText);
            if (!isDuplicate) {
              questions.push({
                question_text: qText,
                answer_text: aText || null,
              });
            }
          }
        }
      }

      if (questions.length > 0) {
        console.log('方式4 正则提取成功，题目数:', questions.length);
        return NextResponse.json({ success: true, questions });
      }
    } catch (e: any) {
      console.log('方式4 正则提取失败:', e.message);
    }

    console.error('所有解析方式都失败，无法解析内容');
    return NextResponse.json({
      success: false,
      error: 'AI 返回的格式无法解析，请重试或检查 API Key 是否正确'
    });

  } catch (error: any) {
    console.error('AI 解析错误:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'AI 解析失败' },
      { status: 500 }
    );
  }
}
