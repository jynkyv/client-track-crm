import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateWordDocument } from '@/lib/docxGenerator'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const companyId = params.id
        const { searchParams } = new URL(request.url)
        const templateType = searchParams.get('type') || 'union_join'
        // e.g. type=union_join or type=agreement

        // Fetch company
        const { data: company, error } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single()

        if (error || !company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 })
        }

        let templateName = ''
        let outputFilename = ''

        if (templateType === 'union_join') {
            templateName = 'union_join_template.docx'
            outputFilename = `${company.name}_Combined_Application_Form.docx`
        } else if (templateType === 'agreement') {
            // Logic for varying template can be here or in generator
            // For Word, flexible content usually handles it, but if different files are needed:
            // templateName = (company.name.length > 10) ? 'agreement_long.docx' : 'agreement.docx'
            // Assuming single template for now as Word handles dynamic content better
            templateName = 'technical_intern_agreement_template.docx'
            outputFilename = `${company.name}_Technical_Intern_Agreement.docx`
        } else {
            return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
        }

        const buffer = await generateWordDocument(company, templateName)

        return new NextResponse(buffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(outputFilename)}"`,
            },
        })

    } catch (error) {
        console.error('Download error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
