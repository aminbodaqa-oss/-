
import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL =
  'https://snxztpjwpdricbnliwax.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_46DkcsH57_lCiZxV3zga7g_GDOtzfzF';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById('settingsForm');
const saveButton = document.getElementById('saveButton');
const saveMessage = document.getElementById('saveMessage');
const connectionStatus = document.getElementById('connectionStatus');

const fields = {
  siteName: document.getElementById('siteName'),
  siteTagline: document.getElementById('siteTagline'),
  siteDescription: document.getElementById('siteDescription'),
  logoUrl: document.getElementById('logoUrl'),
  primaryColor: document.getElementById('primaryColor'),
  accentColor: document.getElementById('accentColor'),
  footerText: document.getElementById('footerText')
};

function showMessage(text, success = false) {
  saveMessage.textContent = text;
  saveMessage.style.color = success ? '#278451' : '#c0392b';
}

function updateColorLabels() {
  document.getElementById('primaryColorText').textContent =
    fields.primaryColor.value;

  document.getElementById('accentColorText').textContent =
    fields.accentColor.value;
}

fields.primaryColor.addEventListener('input', updateColorLabels);
fields.accentColor.addEventListener('input', updateColorLabels);

async function checkAdmin() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    window.location.replace('index.html');
    return false;
  }

  const { data, error } = await supabase.rpc('is_admin');

  if (error || data !== true) {
    await supabase.auth.signOut();
    window.location.replace('index.html');
    return false;
  }

  return true;
}

async function loadSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('setting_value')
    .eq('setting_key', 'general')
    .maybeSingle();

  if (error) throw error;

  const settings = data?.setting_value || {};

  fields.siteName.value = settings.siteName || 'رِواق';
  fields.siteTagline.value = settings.siteTagline || '';
  fields.siteDescription.value = settings.siteDescription || '';
  fields.logoUrl.value = settings.logoUrl || '';
  fields.primaryColor.value = settings.primaryColor || '#263746';
  fields.accentColor.value = settings.accentColor || '#C17B55';
  fields.footerText.value = settings.footerText || '';

  updateColorLabels();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  saveButton.disabled = true;
  saveButton.textContent = 'جارٍ الحفظ...';
  showMessage('');

  const settings = {
    siteName: fields.siteName.value.trim(),
    siteTagline: fields.siteTagline.value.trim(),
    siteDescription: fields.siteDescription.value.trim(),
    logoUrl: fields.logoUrl.value.trim(),
    primaryColor: fields.primaryColor.value,
    accentColor: fields.accentColor.value,
    footerText: fields.footerText.value.trim()
  };

  try {
    const { error } = await supabase
      .from('site_settings')
      .upsert({
        setting_key: 'general',
        setting_value: settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });

    if (error) throw error;

    showMessage('تم حفظ إعدادات الموقع بنجاح ✓', true);

  } catch (error) {
    showMessage('تعذر الحفظ: ' + error.message);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'حفظ التعديلات';
  }
});

// تسجيل الخروج
document.getElementById('logoutButton').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert('تعذر تسجيل الخروج: ' + error.message);
    return;
  }

  window.location.replace('index.html');
});

// القائمة الجانبية للموبايل
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// تشغيل لوحة التحكم
async function startDashboard() {
  try {
    const isAdmin = await checkAdmin();

    if (!isAdmin) return;

    await loadSettings();
    connectionStatus.textContent = 'متصل ✓';

  } catch (error) {
    connectionStatus.textContent = 'تعذر الاتصال';
    showMessage(error.message);
  }
}

startDashboard();
