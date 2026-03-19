#!/usr/bin/env python3
"""
Word 文档解析器 - 支持 MathML 公式转 LaTeX
用法: python3 parse-docx.py <input.docx> [output.json]
"""

import sys
import json
import zipfile
import re
from xml.etree import ElementTree as ET

def mathml_to_latex(mathml_content):
    """将 MathML 转换为简单的 LaTeX 格式"""
    # 这是一个简化的转换，处理常见的数学符号
    
    # 移除命名空间
    mathml_content = re.sub(r'xmlns[^"]*"[^"]*"', '', mathml_content)
    mathml_content = re.sub(r'<m:', '<', mathml_content)
    mathml_content = re.sub(r'</m:', '</', mathml_content)
    
    # 常见 MathML 标签到 LaTeX 的映射
    replacements = [
        # 分数
        (r'<mfrac>\s*<mrow>([^<]*)</mrow>\s*<mrow>([^<]*)</mrow>\s*</mfrac>', r'\\frac{\1}{\2}'),
        (r'<mfrac>([^<]*)<mo[^>]*>/</mo>([^<]*)</mfrac>', r'\\frac{\1}{\2}'),
        # 上标
        (r'<msup>([^<]*)<mrow>([^<]*)</mrow></msup>', r'\1^{\2}'),
        (r'<msup><mrow>([^<]*)</mrow><mrow>([^<]*)</mrow></msup>', r'\1^{\2}'),
        # 下标
        (r'<msub>([^<]*)<mrow>([^<]*)</mrow></msub>', r'\1_{\2}'),
        # 平方根
        (r'<msqrt>([^<]*)</msqrt>', r'\\sqrt{\1}'),
        # 求和
        (r'<mo>∑</mo>', r'\\sum'),
        (r'<mo>&#x2211;</mo>', r'\\sum'),
        # 极限
        (r'<mo>lim</mo>', r'\\lim'),
        # 积分
        (r'<mo>∫</mo>', r'\\int'),
        (r'<mo>&#x222B;</mo>', r'\\int'),
        # 特殊符号
        (r'<mo>→</mo>', r'\\to'),
        (r'<mo>&#x2192;</mo>', r'\\to'),
        (r'<mo>≤</mo>', r'\\leq'),
        (r'<mo>≥</mo>', r'\\geq'),
        (r'<mo>≠</mo>', r'\\neq'),
        (r'<mo>∞</mo>', r'\\infty'),
        (r'<mo>&#x221E;</mo>', r'\\infty'),
        # 希腊字母
        (r'<mi>α</mi>', r'\\alpha'),
        (r'<mi>β</mi>', r'\\beta'),
        (r'<mi>γ</mi>', r'\\gamma'),
        (r'<mi>δ</mi>', r'\\delta'),
        (r'<mi>θ</mi>', r'\\theta'),
        (r'<mi>π</mi>', r'\\pi'),
        (r'<mi>σ</mi>', r'\\sigma'),
        (r'<mi>ω</mi>', r'\\omega'),
        # 清理剩余标签
        (r'</?m[^>]*>', ''),
        (r'</?math[^>]*>', ''),
    ]
    
    result = mathml_content
    for pattern, replacement in replacements:
        result = re.sub(pattern, replacement, result, flags=re.DOTALL)
    
    # 提取纯文本内容
    result = re.sub(r'<[^>]+>', '', result)
    
    # 清理多余空格
    result = re.sub(r'\s+', ' ', result).strip()
    
    return result if result else ''


def extract_text_with_math(docx_path):
    """从 Word 文档提取文本，保留公式"""
    text_parts = []
    
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            # 读取主文档
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            # 命名空间
            namespaces = {
                'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
                'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math',
                'v': 'urn:schemas-microsoft-com:vml',
                'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
            }
            
            # 遍历所有段落
            for para in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                para_text = []
                
                # 遍历段落中的所有元素
                for elem in para.iter():
                    # 文本节点
                    if elem.tag == '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t':
                        if elem.text:
                            para_text.append(elem.text)
                    
                    # 数学公式节点
                    elif elem.tag == '{http://schemas.openxmlformats.org/officeDocument/2006/math}oMath':
                        # 提取 MathML
                        mathml_str = ET.tostring(elem, encoding='unicode')
                        latex = mathml_to_latex(mathml_str)
                        if latex:
                            para_text.append(f'${latex}$')
                
                if para_text:
                    text_parts.append(''.join(para_text))
    
    except Exception as e:
        return f"解析错误: {str(e)}"
    
    return '\n'.join(text_parts)


def main():
    if len(sys.argv) < 2:
        print("用法: python3 parse-docx.py <input.docx>")
        sys.exit(1)
    
    docx_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    # 提取文本
    markdown = extract_text_with_math(docx_path)
    
    result = {
        "success": True,
        "fileType": "text",
        "markdown": f"# 文档内容\n\n{markdown}",
        "imageBase64": None
    }
    
    # Windows 兼容：确保 UTF-8 输出
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')
    
    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"输出已保存到: {output_path}")
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
