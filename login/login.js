
import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'https://snxztpjwpdricbnliwax.supabase.co',
  'sb_publishable_46DkcsH57_lCiZxV3zga7g_GDOtzfzF'
);

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const message = document.getElementById('message');
const button = document.getElementById('loginButton');

function showMessage(text, type = 'error') {
  message.textContent = text;
  message.className = `message ${type}`;
}

async function checkExistingSession() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return;

  const { data: isAdmin, error } =
    await supabase.rpc('is_admin');

  if (!error && isAdmin) {
    window.location.replace('../dashboard/');
  }
}

checkExistingSession();

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  button.disabled = true;
  button.textContent = 'جارٍ التحقق...';
  message.className = 'message';

  try {
    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (loginError) throw loginError;

    const { data: isAdmin, error: adminError } =
      await supabase.rpc('is_admin');

    if (adminError) throw adminError;

    if (!isAdmin) {
      await supabase.auth.signOut();
      throw new Error('هذا الحساب لا يمتلك صلاحية المدير.');
    }

    showMessage('تم تسجيل الدخول بنجاح.', 'success');

    window.location.replace('../dashboard/');

  } catch (error) {
    showMessage(error.message || 'تعذر تسجيل الدخول.');
  } finally {
    button.disabled = false;
    button.textContent = 'تسجيل الدخول';
  }
});
