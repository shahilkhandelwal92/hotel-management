import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import en from '../messages/en.json';
import hi from '../messages/hi.json';

const messages: Record<string, any> = { en, hi };

export default getRequestConfig(async () => {
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
    const validLocale = locale in messages ? locale : 'en';

    return {
        locale: validLocale,
        messages: messages[validLocale]
    };
});
