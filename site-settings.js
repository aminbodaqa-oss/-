
import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'https://snxztpjwpdricbnliwax.supabase.co',
  'sb_publishable_46DkcsH57_lCiZxV3zga7g_GDOtzfzF'
);

async function loadSiteSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('setting_value')
    .eq('setting_key', 'general')
    .maybeSingle();

  if (error) {
    console.error('تعذر تحميل إعدادات الموقع:', error);
    return;
  }

  if (!data) return;

  const settings = data.setting_value;

  // اسم الموقع
  document.querySelectorAll('[data-site-name]').forEach(el => {
    el.textContent = settings.siteName || 'رِواق';
  });

  // الوصف المختصر
  document.querySelectorAll('[data-site-tagline]').forEach(el => {
    el.textContent = settings.siteTagline || '';
  });

  // وصف الموقع
  document.querySelectorAll('[data-site-description]').forEach(el => {
    el.textContent = settings.siteDescription || '';
  });

  // الشعار
  document.querySelectorAll('[data-site-logo]').forEach(el => {
    if (settings.logoUrl) {
      el.src = settings.logoUrl;
      el.alt = settings.siteName || 'رِواق';
    }
  });

  // الألوان
  if (settings.primaryColor) {
    document.documentElement.style.setProperty(
      '--navy',
      settings.primaryColor
    );
  }

  if (settings.accentColor) {
    document.documentElement.style.setProperty(
      '--copper',
      settings.accentColor
    );
  }

  // الفوتر
  document.querySelectorAll('[data-footer-text]').forEach(el => {
    el.textContent = settings.footerText || '';
  });

  // عنوان صفحة الموقع
  if (settings.siteName) {
    document.title = settings.siteName;
  }
}

loadSiteSettings();
