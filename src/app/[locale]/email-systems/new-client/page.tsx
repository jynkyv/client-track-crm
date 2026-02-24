'use client'

export default function EmailNewClientPage() {
    return (
        <div style={{ width: '100%', height: '100%', minHeight: '800px' }}>
            <iframe
                src="https://family-email-new.vercel.app?account=admin"
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                title="监理团体新客户邮件"
            />
        </div>
    )
}
