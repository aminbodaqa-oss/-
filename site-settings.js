
import { createClient } from
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(
    'https://snxztpjwpdricbnliwax.supabase.co',
    'sb_publishable_46DkcsH57_lCiZxV3zga7g_GDOtzfzF'
);

const CACHE_KEY = 'riwaq_general_settings';

export function getCachedSettings() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : {};
    } catch (error) {
        console.warn('تعذر قراءة الإعدادات المحفوظة محليًا:', error);
        return {};
    }
}

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

    const settings = data?.setting_value || {};

    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
    } catch (cacheError) {
        console.warn('تعذر حفظ نسخة الإعدادات محليًا:', cacheError);
    }

    return settings;
}
