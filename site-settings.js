
import { createClient } from
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(
    'https://snxztpjwpdricbnliwax.supabase.co',
    'sb_publishable_46DkcsH57_lCiZxV3zga7g_GDOtzfzF'
);

const CACHE_KEY = 'riwaq_general_settings';

// قراءة الإعدادات المحلية فورًا بدون انتظار الإنترنت
export function getCachedSettings() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);

        if (!cached) return {};

        const settings = JSON.parse(cached);

        return settings && typeof settings === 'object'
            ? settings
            : {};

    } catch (error) {
        console.warn('تعذر قراءة الإعدادات المحلية:', error);
        return {};
    }
}

// حفظ الإعدادات محليًا
export function saveCachedSettings(settings) {
    try {
        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify(settings || {})
        );
    } catch (error) {
        console.warn('تعذر حفظ الإعدادات المحلية:', error);
    }
}

// جلب أحدث إعدادات من Supabase
export async function getSiteSettings() {
    const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'general')
        .maybeSingle();

    if (error) {
        console.error('Settings loading error:', error);
        return getCachedSettings();
    }

    // لو لم توجد بيانات على السيرفر نستخدم الكاش
    if (!data || !data.setting_value) {
        return getCachedSettings();
    }

    const settings = data.setting_value;

    saveCachedSettings(settings);

    return settings;
}
