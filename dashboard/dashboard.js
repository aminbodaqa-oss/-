
import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://snxztpjwpdricbnliwax.supabase.co';
const SUPABASE_KEY = 'sb_publishable_46DkcsH57_lCiZxV3zga7g_GDOtzfzF';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

let productsCache = [];
let sectionsCache = [];
let reviewsCache = [];
let faqsCache = [];
let ordersCache = [];

const loadingScreen = $('#loadingScreen');
const globalMessage = $('#globalMessage');

function showMessage(message, type = 'success') {
  globalMessage.textContent = message;
  globalMessage.className = `global-message show ${type}`;

  window.clearTimeout(showMessage.timer);
  showMessage.timer = window.setTimeout(() => {
    globalMessage.className = 'global-message';
  }, 4500);
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[char]);
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function setFormValues(form, values) {
  Object.entries(values).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);

    if (!field) return;

    if (field.type === 'checkbox') {
      field.checked = Boolean(value);
    } else if (field.type === 'file') {
      return;
    } else {
      field.value = value ?? '';
    }
  });
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function resetForm(form) {
  form.reset();

  const hidden = form.querySelectorAll('input[type="hidden"]');
  hidden.forEach(input => input.value = '');
}

async function requireAdmin() {
  const { data: { session }, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError || !session) {
    window.location.replace('../login/');
    return false;
  }

  const { data: isAdmin, error: adminError } =
    await supabase.rpc('is_admin');

  if (adminError || isAdmin !== true) {
    await supabase.auth.signOut();
    window.location.replace('../login/');
    return false;
  }

  return true;
}

async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    showMessage('تعذر تسجيل الخروج: ' + error.message, 'error');
    return;
  }

  window.location.replace('../login/');
}

/* ---------------------------
   Navigation
---------------------------- */

const pageNames = {
  overview: 'نظرة عامة',
  settings: 'إعدادات الموقع',
  product: 'المنتج',
  sections: 'أقسام الصفحة',
  reviews: 'التقييمات',
  faqs: 'الأسئلة الشائعة',
  orders: 'الطلبات'
};

function openPage(page) {
  if (!pageNames[page]) return;

  $$('.page-section').forEach(section => {
    section.classList.toggle('active', section.id === `page-${page}`);
  });

  $$('.nav-link').forEach(button => {
    button.classList.toggle('active', button.dataset.page === page);
  });

  $('#pageTitle').textContent = pageNames[page];
  $('#sidebar').classList.remove('open');

  if (page === 'overview') loadOverview();
  if (page === 'settings') loadSettings();
  if (page === 'product') loadProducts();
  if (page === 'sections') loadSections();
  if (page === 'reviews') loadReviews();
  if (page === 'faqs') loadFaqs();
  if (page === 'orders') loadOrders();
}

$$('.nav-link').forEach(button => {
  button.addEventListener('click', () => openPage(button.dataset.page));
});

$$('[data-go]').forEach(button => {
  button.addEventListener('click', () => openPage(button.dataset.go));
});

$('#menuToggle').addEventListener('click', () => {
  $('#sidebar').classList.toggle('open');
});

$('#logoutButton').addEventListener('click', logout);

/* ---------------------------
   General Settings
---------------------------- */

async function loadSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('setting_value')
    .eq('setting_key', 'general')
    .maybeSingle();

  if (error) {
    showMessage('تعذر تحميل الإعدادات: ' + error.message, 'error');
    return;
  }

  if (data?.setting_value) {
    setFormValues($('#settingsForm'), data.setting_value);
  }
}

$('#settingsForm').addEventListener('submit', async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const values = formObject(form);

  const settings = {
    siteName: values.siteName.trim(),
    siteTagline: values.siteTagline.trim(),
    siteDescription: values.siteDescription.trim(),
    logoUrl: values.logoUrl.trim(),
    primaryColor: values.primaryColor,
    accentColor: values.accentColor,
    footerText: values.footerText.trim(),
    whatsappNumber: values.whatsappNumber.trim(),
    facebookUrl: values.facebookUrl.trim(),
    instagramUrl: values.instagramUrl.trim(),
    telegramUrl: values.telegramUrl.trim(),
    shippingText: values.shippingText.trim(),
    returnText: values.returnText.trim(),
    seoTitle: values.seoTitle.trim(),
    seoDescription: values.seoDescription.trim()
  };

  const { error } = await supabase
    .from('site_settings')
    .upsert({
      setting_key: 'general',
      setting_value: settings,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'setting_key'
    });

  if (error) {
    showMessage('فشل حفظ الإعدادات: ' + error.message, 'error');
    return;
  }

  showMessage('تم حفظ إعدادات الموقع بنجاح.');
});

/* ---------------------------
   Storage Upload
---------------------------- */

async function uploadImage(file) {
  if (!file) return null;

  if (!file.type.startsWith('image/')) {
    throw new Error('الملف المختار ليس صورة.');
  }

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت.');
  }

  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-');

  const path = `products/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from('riwaq-media')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('riwaq-media')
    .getPublicUrl(path);

  return data.publicUrl;
}

/* ---------------------------
   Products
---------------------------- */

async function loadProducts() {
  const list = $('#productsList');
  list.innerHTML = '<p class="empty-cell">جارٍ تحميل المنتجات...</p>';

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = '';
    showMessage('تعذر تحميل المنتجات: ' + error.message, 'error');
    return;
  }

  productsCache = data || [];

  if (!productsCache.length) {
    list.innerHTML = '<p class="empty-cell">لا توجد منتجات مسجلة حتى الآن.</p>';
    return;
  }

  list.innerHTML = productsCache.map(product => `
    <article class="item-row">
      ${product.main_image
        ? `<img src="${escapeHTML(product.main_image)}" alt="">`
        : '<div class="brand-mark">ر</div>'}
      <div class="item-info">
        <strong>${escapeHTML(product.name)}</strong>
        <small>
          ${escapeHTML(product.price)} جنيه
          · ${product.is_active ? 'نشط' : 'غير نشط'}
        </small>
      </div>
      <div class="item-actions">
        <button class="action-button" data-edit-product="${product.id}">تعديل</button>
        <button class="action-button danger" data-delete-product="${product.id}">حذف</button>
      </div>
    </article>
  `).join('');
}

function resetProductForm() {
  resetForm($('#productForm'));
  $('#mainImagePreview').hidden = true;
  $('#mainImagePreview').removeAttribute('src');
}

$('#resetProduct').addEventListener('click', resetProductForm);
$('#refreshProducts').addEventListener('click', loadProducts);

$('#mainImageFile').addEventListener('change', event => {
  const file = event.target.files[0];
  const preview = $('#mainImagePreview');

  if (!file) return;

  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
});

$('#productForm').addEventListener('submit', async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const values = formObject(form);
  const submit = form.querySelector('[type="submit"]');

  submit.disabled = true;
  submit.textContent = 'جارٍ الحفظ...';

  try {
    let mainImage = values.main_image.trim();

    const mainFile = $('#mainImageFile').files[0];

    if (mainFile) {
      mainImage = await uploadImage(mainFile);
    }

    const gallery = values.gallery
      .split('\n')
      .map(url => url.trim())
      .filter(Boolean);

    const galleryFiles = [...$('#galleryFiles').files];

    for (const file of galleryFiles) {
      gallery.push(await uploadImage(file));
    }

    const product = {
      name: values.name.trim(),
      description: values.description.trim(),
      price: Number(values.price),
      old_price: values.old_price ? Number(values.old_price) : null,
      main_image: mainImage || null,
      gallery,
      is_active: form.elements.namedItem('is_active').checked
    };

    let result;

    if (values.productId) {
      result = await supabase
        .from('products')
        .update(product)
        .eq('id', values.productId);
    } else {
      result = await supabase
        .from('products')
        .insert(product);
    }

    if (result.error) throw result.error;

    showMessage('تم حفظ بيانات المنتج بنجاح.');
    resetProductForm();
    await loadProducts();

  } catch (error) {
    showMessage('تعذر حفظ المنتج: ' + error.message, 'error');
  } finally {
    submit.disabled = false;
    submit.textContent = 'حفظ المنتج';
  }
});

$('#productsList').addEventListener('click', async event => {
  const editButton = event.target.closest('[data-edit-product]');
  const deleteButton = event.target.closest('[data-delete-product]');

  if (editButton) {
    const product = productsCache.find(
      item => String(item.id) === editButton.dataset.editProduct
    );

    if (!product) return;

    setFormValues($('#productForm'), {
      productId: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      old_price: product.old_price,
      main_image: product.main_image,
      gallery: Array.isArray(product.gallery)
        ? product.gallery.join('\n')
        : '',
      is_active: product.is_active
    });

    const preview = $('#mainImagePreview');

    if (product.main_image) {
      preview.src = product.main_image;
      preview.hidden = false;
    } else {
      preview.hidden = true;
    }

    $('#pageTitle').textContent = 'تعديل المنتج';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (deleteButton) {
    const id = deleteButton.dataset.deleteProduct;

    if (!confirm('هل تريد حذف هذا المنتج؟')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      showMessage('تعذر حذف المنتج: ' + error.message, 'error');
      return;
    }

    showMessage('تم حذف المنتج.');
    await loadProducts();
  }
});

/* ---------------------------
   Sections
---------------------------- */

async function loadSections() {
  const list = $('#sectionsList');
  list.innerHTML = '<p class="empty-cell">جارٍ تحميل الأقسام...</p>';

  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    list.innerHTML = '';
    showMessage('تعذر تحميل الأقسام: ' + error.message, 'error');
    return;
  }

  sectionsCache = data || [];

  if (!sectionsCache.length) {
    list.innerHTML = '<p class="empty-cell">لا توجد أقسام مسجلة.</p>';
    return;
  }

  list.innerHTML = sectionsCache.map(section => `
    <article class="item-row">
      <div class="item-info">
        <strong>${escapeHTML(section.title || section.section_key)}</strong>
        <small>
          ${escapeHTML(section.section_key)}
          · الترتيب: ${section.sort_order}
          · ${section.is_visible ? 'ظاهر' : 'مخفي'}
        </small>
      </div>
      <div class="item-actions">
        <button class="action-button" data-edit-section="${section.id}">تعديل</button>
        <button class="action-button danger" data-delete-section="${section.id}">حذف</button>
      </div>
    </article>
  `).join('');
}

function resetSectionForm() {
  resetForm($('#sectionForm'));
  $('#sectionForm').elements.namedItem('sort_order').value = 0;
  $('#sectionForm').elements.namedItem('is_visible').checked = true;
}

$('#resetSection').addEventListener('click', resetSectionForm);
$('#refreshSections').addEventListener('click', loadSections);

$('#sectionForm').addEventListener('submit', async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const values = formObject(form);

  let content = {};

  try {
    content = values.content.trim()
      ? JSON.parse(values.content)
      : {};
  } catch {
    showMessage('صيغة المحتوى يجب أن تكون JSON صحيحة.', 'error');
    return;
  }

  const section = {
    section_key: values.section_key.trim(),
    title: values.title.trim(),
    subtitle: values.subtitle.trim(),
    content,
    sort_order: Number(values.sort_order || 0),
    is_visible: form.elements.namedItem('is_visible').checked
  };

  const result = values.sectionId
    ? await supabase.from('sections').update(section).eq('id', values.sectionId)
    : await supabase.from('sections').insert(section);

  if (result.error) {
    showMessage('تعذر حفظ القسم: ' + result.error.message, 'error');
    return;
  }

  showMessage('تم حفظ القسم بنجاح.');
  resetSectionForm();
  await loadSections();
});

$('#sectionsList').addEventListener('click', async event => {
  const editButton = event.target.closest('[data-edit-section]');
  const deleteButton = event.target.closest('[data-delete-section]');

  if (editButton) {
    const section = sectionsCache.find(
      item => String(item.id) === editButton.dataset.editSection
    );

    if (!section) return;

    setFormValues($('#sectionForm'), {
      sectionId: section.id,
      section_key: section.section_key,
      title: section.title,
      subtitle: section.subtitle,
      content: JSON.stringify(section.content || {}, null, 2),
      sort_order: section.sort_order,
      is_visible: section.is_visible
    });
  }

  if (deleteButton) {
    if (!confirm('هل تريد حذف هذا القسم؟')) return;

    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', deleteButton.dataset.deleteSection);

    if (error) {
      showMessage('تعذر حذف القسم: ' + error.message, 'error');
      return;
    }

    showMessage('تم حذف القسم.');
    await loadSections();
  }
});

/* ---------------------------
   Reviews
---------------------------- */

async function loadReviews() {
  const list = $('#reviewsList');
  list.innerHTML = '<p class="empty-cell">جارٍ تحميل التقييمات...</p>';

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = '';
    showMessage('تعذر تحميل التقييمات: ' + error.message, 'error');
    return;
  }

  reviewsCache = data || [];

  if (!reviewsCache.length) {
    list.innerHTML = '<p class="empty-cell">لا توجد تقييمات حتى الآن.</p>';
    return;
  }

  list.innerHTML = reviewsCache.map(review => `
    <article class="item-row">
      <div class="item-info">
        <strong>${escapeHTML(review.customer_name)} · ${'★'.repeat(Number(review.rating) || 0)}</strong>
        <small>${escapeHTML(review.review_text)}</small>
        <small>${review.is_approved ? 'معتمد ويظهر على الموقع' : 'بانتظار الاعتماد'}</small>
      </div>
      <div class="item-actions">
        <button class="action-button" data-edit-review="${review.id}">تعديل</button>
        <button class="action-button danger" data-delete-review="${review.id}">حذف</button>
      </div>
    </article>
  `).join('');
}

function resetReviewForm() {
  resetForm($('#reviewForm'));
  $('#reviewForm').elements.namedItem('rating').value = '5';
}

$('#resetReview').addEventListener('click', resetReviewForm);
$('#refreshReviews').addEventListener('click', loadReviews);

$('#reviewForm').addEventListener('submit', async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const values = formObject(form);

  const review = {
    customer_name: values.customer_name.trim(),
    rating: Number(values.rating),
    review_text: values.review_text.trim(),
    is_approved: form.elements.namedItem('is_approved').checked
  };

  const result = values.reviewId
    ? await supabase.from('reviews').update(review).eq('id', values.reviewId)
    : await supabase.from('reviews').insert(review);

  if (result.error) {
    showMessage('تعذر حفظ التقييم: ' + result.error.message, 'error');
    return;
  }

  showMessage('تم حفظ التقييم.');
  resetReviewForm();
  await loadReviews();
});

$('#reviewsList').addEventListener('click', async event => {
  const editButton = event.target.closest('[data-edit-review]');
  const deleteButton = event.target.closest('[data-delete-review]');

  if (editButton) {
    const review = reviewsCache.find(
      item => String(item.id) === editButton.dataset.editReview
    );

    if (!review) return;

    setFormValues($('#reviewForm'), {
      reviewId: review.id,
      customer_name: review.customer_name,
      rating: review.rating,
      review_text: review.review_text,
      is_approved: review.is_approved
    });
  }

  if (deleteButton) {
    if (!confirm('هل تريد حذف هذا التقييم؟')) return;

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', deleteButton.dataset.deleteReview);

    if (error) {
      showMessage('تعذر حذف التقييم: ' + error.message, 'error');
      return;
    }

    showMessage('تم حذف التقييم.');
    await loadReviews();
  }
});

/* ---------------------------
   FAQs
---------------------------- */

async function loadFaqs() {
  const list = $('#faqsList');
  list.innerHTML = '<p class="empty-cell">جارٍ تحميل الأسئلة...</p>';

  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    list.innerHTML = '';
    showMessage('تعذر تحميل الأسئلة: ' + error.message, 'error');
    return;
  }

  faqsCache = data || [];

  if (!faqsCache.length) {
    list.innerHTML = '<p class="empty-cell">لا توجد أسئلة مسجلة.</p>';
    return;
  }

  list.innerHTML = faqsCache.map(faq => `
    <article class="item-row">
      <div class="item-info">
        <strong>${escapeHTML(faq.question)}</strong>
        <small>${escapeHTML(faq.answer)}</small>
        <small>${faq.is_visible ? 'ظاهر' : 'مخفي'}</small>
      </div>
      <div class="item-actions">
        <button class="action-button" data-edit-faq="${faq.id}">تعديل</button>
        <button class="action-button danger" data-delete-faq="${faq.id}">حذف</button>
      </div>
    </article>
  `).join('');
}

function resetFaqForm() {
  resetForm($('#faqForm'));
  $('#faqForm').elements.namedItem('sort_order').value = 0;
  $('#faqForm').elements.namedItem('is_visible').checked = true;
}

$('#resetFaq').addEventListener('click', resetFaqForm);
$('#refreshFaqs').addEventListener('click', loadFaqs);

$('#faqForm').addEventListener('submit', async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const values = formObject(form);

  const faq = {
    question: values.question.trim(),
    answer: values.answer.trim(),
    sort_order: Number(values.sort_order || 0),
    is_visible: form.elements.namedItem('is_visible').checked
  };

  const result = values.faqId
    ? await supabase.from('faqs').update(faq).eq('id', values.faqId)
    : await supabase.from('faqs').insert(faq);

  if (result.error) {
    showMessage('تعذر حفظ السؤال: ' + result.error.message, 'error');
    return;
  }

  showMessage('تم حفظ السؤال بنجاح.');
  resetFaqForm();
  await loadFaqs();
});

$('#faqsList').addEventListener('click', async event => {
  const editButton = event.target.closest('[data-edit-faq]');
  const deleteButton = event.target.closest('[data-delete-faq]');

  if (editButton) {
    const faq = faqsCache.find(
      item => String(item.id) === editButton.dataset.editFaq
    );

    if (!faq) return;

    setFormValues($('#faqForm'), {
      faqId: faq.id,
      question: faq.question,
      answer: faq.answer,
      sort_order: faq.sort_order,
      is_visible: faq.is_visible
    });
  }

  if (deleteButton) {
    if (!confirm('هل تريد حذف هذا السؤال؟')) return;

    const { error } = await supabase
      .from('faqs')
      .delete()
      .eq('id', deleteButton.dataset.deleteFaq);

    if (error) {
      showMessage('تعذر حذف السؤال: ' + error.message, 'error');
      return;
    }

    showMessage('تم حذف السؤال.');
    await loadFaqs();
  }
});

/* ---------------------------
   Orders
---------------------------- */

const orderStatuses = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
];

const orderStatusNames = {
  pending: 'جديد',
  confirmed: 'تم التأكيد',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي'
};

async function loadOrders() {
  const table = $('#ordersTable');
  table.innerHTML = '<tr><td colspan="8" class="empty-cell">جارٍ تحميل الطلبات...</td></tr>';

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    table.innerHTML = '<tr><td colspan="8" class="empty-cell">تعذر تحميل الطلبات.</td></tr>';
    showMessage('تعذر تحميل الطلبات: ' + error.message, 'error');
    return;
  }

  ordersCache = data || [];

  if (!ordersCache.length) {
    table.innerHTML = '<tr><td colspan="8" class="empty-cell">لا توجد طلبات حتى الآن.</td></tr>';
    return;
  }

  table.innerHTML = ordersCache.map(order => `
    <tr>
      <td>${escapeHTML(order.customer_name)}</td>
      <td dir="ltr">${escapeHTML(order.phone)}</td>
      <td>${escapeHTML(order.address)}</td>
      <td>${escapeHTML(order.product_name)}</td>
      <td>${escapeHTML(order.quantity)}</td>
      <td>${escapeHTML(order.notes || '—')}</td>
      <td>
        <select class="status-select" data-order-status="${order.id}">
          ${orderStatuses.map(status => `
            <option value="${status}" ${order.status === status ? 'selected' : ''}>
              ${orderStatusNames[status]}
            </option>
          `).join('')}
        </select>
      </td>
      <td>${formatDate(order.created_at)}</td>
    </tr>
  `).join('');
}

$('#ordersTable').addEventListener('change', async event => {
  const select = event.target.closest('[data-order-status]');

  if (!select) return;

  const id = select.dataset.orderStatus;
  const status = select.value;

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id);

  if (error) {
    showMessage('تعذر تحديث حالة الطلب: ' + error.message, 'error');
    await loadOrders();
    return;
  }

  showMessage('تم تحديث حالة الطلب.');
});

$('#refreshOrders').addEventListener('click', loadOrders);

/* ---------------------------
   Dashboard Overview
---------------------------- */

async function loadOverview() {
  const results = await Promise.all([
    supabase.from('orders').select('id,status'),
    supabase.from('reviews').select('id'),
    supabase.from('faqs').select('id'),
  ]);

  const [ordersResult, reviewsResult, faqsResult] = results;

  if (ordersResult.error || reviewsResult.error || faqsResult.error) {
    showMessage('تعذر تحميل بعض إحصائيات اللوحة.', 'error');
    return;
  }

  const orders = ordersResult.data || [];
  const reviews = reviewsResult.data || [];
  const faqs = faqsResult.data || [];

  $('#statOrders').textContent = orders.length;
  $('#statPending').textContent =
    orders.filter(order => order.status === 'pending').length;
  $('#statReviews').textContent = reviews.length;
  $('#statFaqs').textContent = faqs.length;

  const { data: recent, error } = await supabase
    .from('orders')
    .select('customer_name,phone,quantity,status')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    $('#recentOrders').innerHTML =
      '<tr><td colspan="4" class="empty-cell">تعذر تحميل أحدث الطلبات.</td></tr>';
    return;
  }

  if (!recent?.length) {
    $('#recentOrders').innerHTML =
      '<tr><td colspan="4" class="empty-cell">لا توجد طلبات حتى الآن.</td></tr>';
    return;
  }

  $('#recentOrders').innerHTML = recent.map(order => `
    <tr>
      <td>${escapeHTML(order.customer_name)}</td>
      <td dir="ltr">${escapeHTML(order.phone)}</td>
      <td>${escapeHTML(order.quantity)}</td>
      <td>${orderStatusNames[order.status] || escapeHTML(order.status)}</td>
    </tr>
  `).join('');
}

/* ---------------------------
   Start Dashboard
---------------------------- */

async function startDashboard() {
  try {
    const allowed = await requireAdmin();

    if (!allowed) return;

    loadingScreen.classList.add('hidden');

    await loadOverview();

  } catch (error) {
    console.error(error);
    showMessage('حدث خطأ أثناء تشغيل لوحة التحكم.', 'error');
    loadingScreen.classList.add('hidden');
  }
}

startDashboard();
