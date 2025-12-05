import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType } from 'docx';

interface Question {
    id?: string;
    type: string;
    question_text: string;
    options?: string[];
    correct_answer?: string | string[];
    points: number;
    difficulty?: string;
    category?: string;
    tags?: string[];
}

/**
 * Export questions to JSON format
 */
export const exportToJSON = (questions: Question[], bankName: string) => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bankName}_questions.json`;
    a.click();
    URL.revokeObjectURL(url);
};

/**
 * Export questions to PDF format
 */
export const exportToPDF = (questions: Question[], bankName: string) => {
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Add title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(bankName, margin, yPosition);
    yPosition += 10;

    // Add metadata
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Questions: ${questions.length}`, margin, yPosition);
    yPosition += 7;
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 10;

    // Add questions
    questions.forEach((question, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = margin;
        }

        // Question number and type
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Q${index + 1}. [${question.type.toUpperCase()}] Points: ${question.points}`, margin, yPosition);
        yPosition += 7;

        // Question text
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const questionLines = pdf.splitTextToSize(question.question_text, contentWidth);
        pdf.text(questionLines, margin + 5, yPosition);
        yPosition += questionLines.length * 5 + 3;

        // Options (if applicable)
        if (question.options && question.options.length > 0) {
            pdf.setFontSize(10);
            question.options.forEach((option, optIndex) => {
                const isCorrect = String(question.correct_answer) === option;
                const prefix = isCorrect ? '✓ ' : '  ';
                const optionLines = pdf.splitTextToSize(`${prefix}${String.fromCharCode(65 + optIndex)}. ${option}`, contentWidth - 10);
                pdf.text(optionLines, margin + 10, yPosition);
                yPosition += optionLines.length * 4 + 2;
            });
        } else if (question.correct_answer) {
            // For short answer/numeric
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'italic');
            const answerText = `Answer: ${question.correct_answer}`;
            const answerLines = pdf.splitTextToSize(answerText, contentWidth - 10);
            pdf.text(answerLines, margin + 10, yPosition);
            yPosition += answerLines.length * 4 + 2;
        }

        // Metadata
        if (question.category || question.difficulty || question.tags?.length) {
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 100, 100);
            
            let metaText = '';
            if (question.category) metaText += `Category: ${question.category} | `;
            if (question.difficulty) metaText += `Difficulty: ${question.difficulty} | `;
            if (question.tags?.length) metaText += `Tags: ${question.tags.join(', ')}`;
            
            metaText = metaText.replace(/ \| $/, ''); // Remove trailing separator
            const metaLines = pdf.splitTextToSize(metaText, contentWidth - 10);
            pdf.text(metaLines, margin + 10, yPosition);
            yPosition += metaLines.length * 3 + 5;
            
            pdf.setTextColor(0, 0, 0); // Reset color
        }

        yPosition += 5; // Space between questions
    });

    pdf.save(`${bankName}_questions.pdf`);
};

/**
 * Export questions to Word (DOCX) format
 */
export const exportToWord = async (questions: Question[], bankName: string) => {
    const rows: TableRow[] = [];

    // Add header row
    rows.push(
        new TableRow({
            height: { value: 400, rule: 'atLeast' },
            children: [
                new TableCell({
                    children: [new Paragraph({ text: 'Q#', run: { bold: true } })],
                    width: { size: 10, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                    children: [new Paragraph({ text: 'Type', run: { bold: true } })],
                    width: { size: 10, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                    children: [new Paragraph({ text: 'Question', run: { bold: true } })],
                    width: { size: 40, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                    children: [new Paragraph({ text: 'Options', run: { bold: true } })],
                    width: { size: 25, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                    children: [new Paragraph({ text: 'Answer', run: { bold: true } })],
                    width: { size: 10, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                    children: [new Paragraph({ text: 'Points', run: { bold: true } })],
                    width: { size: 5, type: WidthType.PERCENTAGE },
                }),
            ],
        })
    );

    // Add data rows
    questions.forEach((question, index) => {
        const optionsText = question.options
            ? question.options
                .map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`)
                .join('\n')
            : 'N/A';

        const correctAnswerText = question.correct_answer ? String(question.correct_answer) : 'N/A';

        rows.push(
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph(String(index + 1))],
                    }),
                    new TableCell({
                        children: [new Paragraph(question.type)],
                    }),
                    new TableCell({
                        children: [new Paragraph(question.question_text)],
                    }),
                    new TableCell({
                        children: [new Paragraph(optionsText)],
                    }),
                    new TableCell({
                        children: [new Paragraph({ text: correctAnswerText, run: { bold: true } })],
                    }),
                    new TableCell({
                        children: [new Paragraph(String(question.points))],
                    }),
                ],
            })
        );
    });

    const doc = new Document({
        sections: [
            {
                children: [
                    new Paragraph({
                        text: bankName,
                        run: { size: 56, bold: true },
                    }),
                    new Paragraph({
                        text: `Total Questions: ${questions.length} | Generated: ${new Date().toLocaleDateString()}`,
                        run: { size: 20, color: '666666' },
                    }),
                    new Paragraph({ text: '' }), // Spacing
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: rows,
                    }),
                ],
            },
        ],
    });

    try {
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${bankName}_questions.docx`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting to Word:', error);
        throw error;
    }
};
