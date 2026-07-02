import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import dayjs from 'dayjs'
import { Company } from './supabase'

const REPRESENTATIVE_NAME = '秋元憲一'

const drawReplacementText = (
    page: PDFPage,
    text: string,
    options: {
        x: number
        y: number
        width: number
        height: number
        size: number
        font: PDFFont
        color: RGB
        textX?: number
        textY?: number
        bold?: boolean
    }
) => {
    page.drawRectangle({
        x: options.x,
        y: options.y,
        width: options.width,
        height: options.height,
        color: rgb(1, 1, 1)
    })
    const textX = options.textX ?? options.x + 2
    const textY = options.textY ?? options.y + 3
    const offsets = options.bold
        ? [
            [0, 0],
            [0.25, 0],
            [0, 0.18],
        ]
        : [[0, 0]]

    offsets.forEach(([dx, dy]) => {
        page.drawText(text, {
            x: textX + dx,
            y: textY + dy,
            size: options.size,
            font: options.font,
            color: options.color
        })
    })
}

export async function generateUnionJoinApplication(company: Company): Promise<Uint8Array> {
    const templateBytes = await fetch('/pdf/union_join_template.pdf').then(res => res.arrayBuffer())
    const pdfDoc = await PDFDocument.load(templateBytes)

    // Register fontkit
    pdfDoc.registerFontkit(fontkit)

    // Load custom font for Chinese support
    // Ensure this file exists in public/fonts/
    // You can download Noto Sans SC or similar and rename it
    let customFont
    try {
        // Use encoded space for the URL
        const fontBytes = await fetch('/fonts/MS%20Mincho.ttf').then(res => {
            if (!res.ok) throw new Error(`Font fetch failed: ${res.statusText}`)
            return res.arrayBuffer()
        })
        customFont = await pdfDoc.embedFont(fontBytes)
    } catch (e) {
        console.error('Font loading error:', e)
        throw new Error('无法加载中文字体文件 (MS Mincho.ttf)。请确保文件存在于 public/fonts/ 目录下。错误信息: ' + (e as Error).message)
    }

    const pages = pdfDoc.getPages()
    const firstPage = pages[0]

    const fontSize = 12
    const color = rgb(0, 0, 0)

    drawReplacementText(firstPage, REPRESENTATIVE_NAME, {
        x: 440,
        y: 614,
        width: 55,
        height: 18,
        size: 12,
        font: customFont,
        color,
        bold: true
    })

    // Coordinate mapping (Approximate based on user description/template)
    // 1. Creation Date (Top Right?) - User said "1号填写企业在系统中创建的日期"
    // Need to adjust coordinates based on the actual template.
    // Assuming the user will help adjust or I used a placeholder position.
    // Using some standard positions for now, can be tweaked.

    // 1. Date (Year Month Day) - Top Right
    // Swapped per user request: Use first_training_at here
    if (company.first_training_at) {
        const date = dayjs(company.first_training_at)
        // Previous refined: x: 400, y: 760
        // New: x: 425 (+25), y: 755 (-5) -> User changed to 656
        firstPage.drawText(`${date.year()}`, { x: 422, y: 756, size: fontSize, font: customFont, color })
        firstPage.drawText(`${date.month() + 1}`, { x: 472, y: 756, size: fontSize, font: customFont, color })
        firstPage.drawText(`${date.date()}`, { x: 505, y: 756, size: fontSize, font: customFont, color })
    }

    // 2. Company Name - Move Down More
    // Previous refined: y: 430. Move Down more (-20) -> 410
    firstPage.drawText(company.name || '', { x: 200, y: 375, size: fontSize, font: customFont, color })

    // 3. Representative - No Change from previous step
    // Previous refined: y: 380
    firstPage.drawText(company.representative || '', { x: 200, y: 330, size: fontSize, font: customFont, color })

    // 4. Creation Date (was First Training Date) - No Change from previous step
    // Swapped per user request: Use created_at here
    // Previous refined: y: 330
    if (company.created_at) {
        const trainDate = dayjs(company.created_at)
        const dateStr = `${trainDate.year()}年 ${trainDate.month() + 1}月 ${trainDate.date()}日`
        firstPage.drawText(dateStr, { x: 200, y: 285, size: fontSize, font: customFont, color })
    }

    const pdfBytes = await pdfDoc.save()
    return pdfBytes
}

export async function generateTechnicalInternTrainingProgramAgreement(company: Company): Promise<Uint8Array> {
    const name = company.name ? company.name.trim() : ''
    const len = name.length

    // Select template based on company name length
    // Available templates: 7, 9, 11, 13, 15, more
    let templateName = 'technical_intern_agreement_template_more.pdf'

    if (len <= 7) {
        templateName = 'technical_intern_agreement_template_7.pdf'
    } else if (len <= 9) {
        templateName = 'technical_intern_agreement_template_9.pdf'
    } else if (len <= 11) {
        templateName = 'technical_intern_agreement_template_11.pdf'
    } else if (len <= 13) {
        templateName = 'technical_intern_agreement_template_13.pdf'
    } else if (len <= 15) {
        templateName = 'technical_intern_agreement_template_15.pdf'
    } else {
        templateName = 'technical_intern_agreement_template_more.pdf'
    }


    const templateBytes = await fetch(`/pdf/${templateName}`).then(res => {
        if (!res.ok) {
            // Fallback to union join template if new one is missing, to prevent crash during dev
            console.warn(`Agreement template ${templateName} not found, using fallback`)
            return fetch('/pdf/union_join_template.pdf').then(r => r.arrayBuffer())
        }
        return res.arrayBuffer()
    })
    const pdfDoc = await PDFDocument.load(templateBytes)

    pdfDoc.registerFontkit(fontkit)

    let customFont
    try {
        const fontBytes = await fetch('/fonts/MS%20Mincho.ttf').then(res => {
            if (!res.ok) throw new Error(`Font fetch failed: ${res.statusText}`)
            return res.arrayBuffer()
        })
        customFont = await pdfDoc.embedFont(fontBytes)
    } catch (e) {
        console.error('Font loading error:', e)
        throw new Error('无法加载中文字体文件 (MS Mincho.ttf)')
    }

    const pages = pdfDoc.getPages()
    const color = rgb(0, 0, 0)

    // Page 2 (index 1): Company Name at Top
    if (pages.length > 1) {
        const page2 = pages[1]
        // Estimate coordinates: Top left-ish
        // Assuming standard A4 (595 x 842), Top would be y ~750-800
        // User said "Top", let's try 780. X coordinate depends on layout, try 100 or center.
        // Let's assume there is a specific line for it.
        // Warn: These are estimates.
        page2.drawText(company.name || '', { x: 90, y: 657, size: 12, font: customFont, color })
    }

    // Page 8 (index 7): Date at Bottom
    // Use created_at (system join date) so this matches the 加入日 shown on the 組合加入申請書
    if (pages.length > 7 && company.created_at) {
        const page8 = pages[7]
        const trainDate = dayjs(company.created_at)
        // Split into Year, Month, Day (Template has labels)
        // Using similar spacing to the top date: Year +50 -> Month +33 -> Day
        // Base X estimate: 400.
        // Year: 400, Month: 450, Day: 483
        const year = `${trainDate.year()}`
        const month = `${trainDate.month() + 1}`
        const day = `${trainDate.date()}`

        page8.drawText(year, { x: 395, y: 405, size: 12, font: customFont, color })
        page8.drawText(month, { x: 450, y: 405, size: 12, font: customFont, color })
        page8.drawText(day, { x: 485, y: 405, size: 12, font: customFont, color })
    }

    return await pdfDoc.save()
}
