const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType, BorderStyle } = require('docx');

// 读取 Markdown 文件
const markdownPath = path.join(__dirname, 'USER_GUIDE.md');
const markdownContent = fs.readFileSync(markdownPath, 'utf-8');

// 简单的 Markdown 解析器
function parseMarkdown(markdown) {
    const lines = markdown.split('\n');
    const paragraphs = [];

    for (let line of lines) {
        line = line.trim();

        if (!line) {
            continue;
        }

        // 标题
        if (line.startsWith('### ')) {
            paragraphs.push({
                type: 'heading3',
                text: line.substring(4)
            });
        } else if (line.startsWith('## ')) {
            paragraphs.push({
                type: 'heading2',
                text: line.substring(3)
            });
        } else if (line.startsWith('# ')) {
            paragraphs.push({
                type: 'heading1',
                text: line.substring(2)
            });
        }
        // 无序列表
        else if (line.startsWith('- ')) {
            paragraphs.push({
                type: 'bullet',
                text: line.substring(2)
            });
        }
        // 数字列表
        else if (line.match(/^\d+\. /)) {
            paragraphs.push({
                type: 'numbered',
                text: line.replace(/^\d+\. /, '')
            });
        }
        // 分隔线
        else if (line.startsWith('---')) {
            paragraphs.push({
                type: 'separator'
            });
        }
        // 粗体文本
        else if (line.startsWith('**')) {
            paragraphs.push({
                type: 'bold',
                text: line.replace(/\*\*/g, '')
            });
        }
        // 普通段落
        else {
            paragraphs.push({
                type: 'text',
                text: line
            });
        }
    }

    return paragraphs;
}

// 解析 Markdown 内容
const parsedContent = parseMarkdown(markdownContent);

// 创建 Word 文档元素
const docElements = parsedContent.map(item => {
    switch (item.type) {
        case 'heading1':
            return new Paragraph({
                text: item.text,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                bold: true,
                size: 32,
                color: '1a365d',
                border: {
                    bottom: {
                        style: BorderStyle.SINGLE,
                        size: 6,
                        color: '1a365d',
                    },
                },
            });
        case 'heading2':
            return new Paragraph({
                text: item.text,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 150 },
                bold: true,
                size: 28,
                color: '2c5282',
            });
        case 'heading3':
            return new Paragraph({
                text: item.text,
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 },
                bold: true,
                size: 24,
                color: '4a5568',
            });
        case 'bullet':
            return new Paragraph({
                children: [
                    new TextRun({
                        text: '• ' + item.text,
                        size: 24,
                    }),
                ],
                spacing: { after: 80 },
                indent: { left: 720 },
            });
        case 'numbered':
            return new Paragraph({
                children: [
                    new TextRun({
                        text: item.text,
                        size: 24,
                    }),
                ],
                spacing: { after: 80 },
                numbering: {
                    reference: 'default-numbering',
                    level: 0,
                },
            });
        case 'bold':
            return new Paragraph({
                children: [
                    new TextRun({
                        text: item.text,
                        bold: true,
                        size: 24,
                        color: '1a365d',
                    }),
                ],
                spacing: { after: 80 },
            });
        case 'separator':
            return new Paragraph({
                children: [
                    new TextRun({
                        text: '',
                    }),
                ],
                spacing: { after: 200 },
                border: {
                    bottom: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: 'e2e8f0',
                    },
                },
            });
        default:
            return new Paragraph({
                children: [
                    new TextRun({
                        text: item.text,
                        size: 24,
                    }),
                ],
                spacing: { after: 80 },
            });
    }
});

// 创建文档
const doc = new Document({
    sections: [{
        properties: {},
        children: docElements,
    }],
});

// 生成 Word 文件
Packer.toBuffer(doc).then(buffer => {
    const outputPath = path.join(__dirname, 'USER_GUIDE.docx');
    fs.writeFileSync(outputPath, buffer);
    console.log('✅ Word 文档已生成: USER_GUIDE.docx');
}).catch(err => {
    console.error('❌ 生成 Word 文档失败:', err);
});