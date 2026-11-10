
import { createClient } from
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(
    'https://snxztpjwpdricbnliwax.supabase.co',
    'sb_publishable_46DkcsH57_lCiZxV3zga7g_GDOtzfzF'
);

export async function getSiteSettings() {
    const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'general')
        .maybeSingle();

    if (error) {
        console.error('Settings error:', error);
        return {};
    }

    return data?.setting_value || {};
}
