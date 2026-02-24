'use client'

export default function EmailAgencyPage() {
    return (
        <div style={{ width: '100%', height: '100%', minHeight: '800px' }}>
            <iframe
                src="https://email-aggroup.vercel.app?account=admin"
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                title="送出机关客户邮件"
            />
        </div>
    )
}
