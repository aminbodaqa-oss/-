
import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// بيانات مشروع رِواق
const SUPABASE_URL =
  'https://snxztpjwpdricbnliwax.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_46DkcsH57_lCiZxV3zga7g_GDOtzfzF';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const form = document.getElementById('loginForm');
const button = document.getElementById('loginButton');
const message = document.getElementById('message');

function showMessage(text, success = false) {
  message.textContent = text;
  message.style.color = success ? '#278451' : '#c0392b';
}

async function verifyAdmin() {
  const { data, error } = await supabase.rpc('is_admin');

  if (error) {
    throw error;
  }

  if (data !== true) {
    await supabase.auth.signOut();
    throw new Error('هذا الحساب ليس لديه صلاحية الإدارة.');
  }

  return true;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  button.disabled = true;
  button.textContent = 'جارٍ التحقق...';
  showMessage('');

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    await verifyAdmin();

    showMessage(
      'تم تسجيل الدخول والتحقق من صلاحيات المدير بنجاح.',
      true
    );

    button.textContent = 'تم تسجيل الدخول';

  } catch (error) {
    showMessage(error.message || 'حدث خطأ أثناء تسجيل الدخول.');
    button.disabled = false;
    button.textContent = 'تسجيل الدخول';
  }
});
