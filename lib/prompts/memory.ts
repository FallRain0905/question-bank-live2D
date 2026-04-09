/**
 * 记忆提取与注入提示词 (Memory Extraction & Injection)
 * 用于从对话中提取学习事实，并注入"内心活动"
 */

/**
 * 记忆提取提示词
 * 用于从最近的对话中提取事实层记忆
 */
export const MEMORY_EXTRACTION_PROMPT = `You are a learning analytics expert. Your task is to extract important learning facts from the conversation history.

## Extraction Rules

Extract facts that fall into these categories:

1. **Performance Data**
   - Test scores and accuracy rates
   - Time spent on problems
   - Success/failure patterns

2. **Learning Goals**
   - Target exams or certifications
   - Specific topics being studied
   - Time frames and deadlines

3. **Knowledge Gaps**
   - Topics the user struggles with
   - Repeated mistakes
   - Confusion areas

4. **Study Patterns**
   - Study schedule preferences
   - Peak performance times
   - Preferred learning methods

5. **Progress Indicators**
   - Improvement over time
   - Milestone achievements
   - Skill development

## Output Format

Return ONLY a JSON array of facts in this exact format:

\`\`\`json
[
  {
    "content": "User scored 30% on calculus problems",
    "importance": 8,
    "entity": ["calculus", "math"],
    "timestamp": "2025-01-15T10:30:00Z",
    "category": "performance"
  },
  {
    "content": "User plans to take English CET-4 exam next month",
    "importance": 9,
    "entity": ["english", "exam", "CET-4"],
    "timestamp": "2025-01-15T10:35:00Z",
    "category": "goals"
  }
]
\`\`\`

## Importance Scale (1-10)

- 9-10: Critical goals, major milestones
- 7-8: Important performance data, key topics
- 5-6: Moderate patterns, preferences
- 1-4: Minor details, casual observations

## Important Notes

- Extract only factual information, not opinions
- Be specific and concise
- Include relevant entity tags
- Use appropriate importance scores
- Focus on recent and significant information`;

/**
 * 记忆注入提示词模板
 * 用于注入"内心活动"和前情概要
 */
export function generateMemoryInjectionPrompt(innerThoughts: string, summary: string): string {
  return `## Current Learning Context

**Recent Learning Activity**: ${summary}

**Inner Thoughts**: ${innerThoughts}

Use this context to provide personalized responses that acknowledge the user's recent learning progress and challenges.`;
}

/**
 * 反思层生成提示词
 * 基于事实生成高层级观察
 */
export const REFLECTION_GENERATION_PROMPT = `You are a learning analytics expert. Analyze the provided learning facts and generate higher-level reflections.

## Input Facts
[FACTS_JSON]

## Reflection Categories

1. **Performance Patterns**
   - Identify trends in learning outcomes
   - Note peak performance times
   - Detect improvement or decline

2. **Learning Efficiency**
   - Analyze study time vs. results
   - Identify effective/ineffective methods
   - Note knowledge acquisition speed

3. **Behavioral Insights**
   - Study schedule preferences
   - Motivation patterns
   - Engagement levels

4. **Knowledge Gaps**
   - Recurring problem areas
   - Misconceptions that persist
   - Topics needing attention

## Output Format

\`\`\`json
[
  {
    "content": "User demonstrates significantly weaker logical reasoning when studying late at night",
    "confidence": 0.85,
    "supportingFacts": ["fact_1_id", "fact_2_id"],
    "category": "behavioral"
  }
]
\`\`\`

Generate 3-5 high-confidence reflections based on the input facts.`;

/**
 * 画像层生成提示词
 * 沉淀为长期学习特征
 */
export const PERSONA_GENERATION_PROMPT = `You are a learning profiler. Analyze long-term learning data to create a comprehensive user persona.

## Analysis Categories

1. **Academic Level**
   - Current knowledge base
   - Learning pace
   - Subject strengths/weaknesses

2. **Learning Style**
   - Visual/auditory/kinesthetic preference
   - Independent vs. collaborative
   - Structured vs. exploratory

3. **Motivation Profile**
   - Intrinsic vs. extrinsic drivers
   - Goal orientation
   - Persistence patterns

4. **Target Aspirations**
   - Educational/career goals
   - Timeline expectations
   - Success criteria

## Output Format

\`\`\`json
{
  "academicLevel": "intermediate",
  "learningStyle": "visual",
  "motivation": "intrinsic",
  "goals": ["pass CET-4", "improve math skills"],
  "preferences": {
    "teachingStyle": "encouraging",
    "pacing": "moderate",
    "feedback": "detailed"
  }
}
\`\`\`

Generate a comprehensive user persona based on the available data.`;

/**
 * 提取记忆事实
 * @param conversationHistory 对话历史
 * @returns 提取的事实JSON字符串
 */
export async function extractFacts(conversationHistory: Array<{role: string; content: string}>): Promise<string> {
  // 这里可以调用AI API来提取事实
  // 暂时返回一个示例结构
  // 实际实现中应该调用AI API
  return JSON.stringify([
    {
      content: "Sample fact from conversation",
      importance: 5,
      entity: ["sample"],
      timestamp: new Date().toISOString(),
      category: "learning"
    }
  ]);
}

/**
 * 生成内心活动文本
 * @param userName 用户名
 * @param recentFacts 最近的事实
 * @returns 内心活动文本
 */
export function generateInnerThoughts(userName: string, recentFacts: any[]): string {
  if (recentFacts.length === 0) {
    return `[Inner Thoughts]: ${userName}，准备开始今天的学习吧！`;
  }

  const recentFact = recentFacts[0];
  return `[Inner Thoughts]: ${userName}，我记得你最近在攻克${recentFact.entity?.join('、')}，让我为你整理一下相关的知识点...`;
}
