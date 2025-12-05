'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Select } from 'antd';
import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();

    const handleChange = (value: string) => {
        const newPath = pathname.replace(`/${locale}`, `/${value}`);
        router.replace(newPath);
    };

    return (
        <Select
            defaultValue={locale}
            style={{ width: 100 }}
            onChange={handleChange}
            options={[
                { value: 'zh', label: '中文' },
                { value: 'ja', label: '日本語' },
            ]}
        />
    );
}
