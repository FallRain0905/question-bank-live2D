/**
 * AI 响应解析工具
 * 提取自 api/ai-parse-questions/route.ts
 */

export interface ParsedQuestion {
  question_text: string;
  answer_text?: string | null;
}

/**
 * 修复 LaTeX 转义
 */
function fixLaTeXEscaping(jsonStr: string): string {
  return jsonStr.replace(/(?<!\\)\\(?=[a-zA-Z0-9])/g, '\\\\');
}

/**
 * 尝试直接解析整个内容
 */
function tryDirectParse(content: string): ParsedQuestion[] | null {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // 继续尝试其他方式
  }
  return null;
}

/**
 * 尝试提取 JSON 数组（支持 ```json 包裹）
 */
function tryExtractArray(content: string): ParsedQuestion[] | null {
  try {
    let cleanContent = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const arrayMatch = cleanContent.match(/\[[\s\S\n]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // 尝试修复 LaTeX 转义
        const fixedContent = fixLaTeXEscaping(arrayMatch[0]);
        const parsed = JSON.parse(fixedContent);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch {
    // 继续尝试其他方式
  }
  return null;
}

/**
 * 尝试提取所有 JSON 对象
 */
function tryExtractObjects(content: string): ParsedQuestion[] | null {
  const questions: ParsedQuestion[] = [];
  
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
            // 跳过无效对象
          }
        }
      }

      if (questions.length > 0) {
        return questions;
      }
    }
  } catch {
    // 继续尝试其他方式
  }
  return null;
}

/**
 * 正则提取题目和答案
 */
function tryRegexParse(content: string): ParsedQuestion[] | null {
  const questions: ParsedQuestion[] = [];
  
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
          const isDuplicate = questions.some(q => q.question_text === qText);
          if (!isDuplicate) {
            questions.push({
              question_text: qText,
              answer_text: aText || null,
            });
          }
        }
      }

      if (questions.length > 0) {
        return questions;
      }
    }
  } catch {
    // 所有方式都失败
  }
  
  return null;
}

/**
 * 解析 AI 响应内容
 * 按顺序尝试多种解析方式
 */
export function parseAIResponse(content: string): ParsedQuestion[] {
  return (
    tryDirectParse(content) ||
    tryExtractArray(content) ||
    tryExtractObjects(content) ||
    tryRegexParse(content) ||
    []
  );
}

/**
 * 构建 AI 解析 prompt
 */
export function buildParsePrompt(markdown: string): string {
  return `你是一个题目提取专家。
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
}
