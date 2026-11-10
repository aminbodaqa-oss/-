
import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://snxztpjwpdricbnliwax.supabase.co';
const SUPABASE_KEY = 'sb_publishable_46DkcsH57_lCiZxV3zga7g_GDOtzfzF';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const loginForm = document.querySelector('#loginForm');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const message = document.querySelector('#message');
const submitButton = document.querySelector('#loginButton');

function showMessage(text, type = 'error') {
  if (!message) return;

  message.textContent = text;
  message.className = `message ${type}`;
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage('من فضلك أدخل البريد الإلكتروني وكلمة المرور');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'جارٍ تسجيل الدخول...';

  try {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (loginError) throw loginError;

    const { data: isAdmin, error: adminError } =
      await supabase.rpc('is_admin');

    if (adminError) throw adminError;

    if (!isAdmin) {
      await supabase.auth.signOut();
      throw new Error('ليس لديك صلاحية الدخول إلى لوحة التحكم');
    }

    showMessage('تم تسجيل الدخول بنجاح', 'success');

    window.location.replace('../dashboard/');

  } catch (error) {
    showMessage(error.message || 'حدث خطأ أثناء تسجيل الدخول');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'تسجيل الدخول';
  }
});
