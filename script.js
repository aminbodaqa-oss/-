
import { supabase, getSiteSettings } from './site-settings.js';

const $ = (selector) => document.querySelector(selector);

let currentProduct = null;
let siteSettings = {};

// ================================
// MOBILE MENU
// ================================

const menuBtn = $('#menuBtn');
const nav = $('#nav');

menuBtn?.addEventListener('click', () => {
    nav.classList.toggle('open');

    menuBtn.innerHTML = nav.classList.contains('open')
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
});

nav?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        nav.classList.remove('open');
        menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
});

// ================================
// SAFE HELPERS
// ================================

function setText(selector, value) {
    if (value === undefined || value === null || value === '') return;

    document.querySelectorAll(selector).forEach(element => {
        element.textContent = value;
    });
}

function setImage(selector, url, alt = '') {
    if (!url) return;

    document.querySelectorAll(selector).forEach(image => {
        image.src = url;
        image.alt = alt;
    });
}

function formatPrice(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return '';

    return `${number.toLocaleString('ar-EG')} ج.م`;
}

function safeDiscount(oldPrice, price) {
    const oldValue = Number(oldPrice);
    const newValue = Number(price);

    if (!oldValue || oldValue <= newValue) return '';

    return Math.round(((oldValue - newValue) / oldValue) * 100);
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

// ================================
// GENERAL SITE SETTINGS
// ================================

async function loadGeneralSettings() {
    siteSettings = await getSiteSettings();

    const settings = siteSettings;

    setText('[data-site-name]', settings.siteName || 'رِواق');
    setText('[data-site-tagline]', settings.siteTagline);
    setText('[data-site-description]', settings.siteDescription);
    setText('[data-footer-text]', settings.footerText);

    setText('[data-footer-brand]', settings.siteName || 'رِواق');

    if (settings.siteName) {
        document.title = `${settings.siteName} | ${settings.siteTagline || 'تجربة تستحقها'}`;
    }

    if (settings.logoUrl) {
        document.querySelectorAll('[data-site-name]').forEach(element => {
            element.innerHTML = '';
            const image = document.createElement('img');
            image.src = settings.logoUrl;
            image.alt = settings.siteName || 'رِواق';
            image.style.maxHeight = '48px';
            image.style.maxWidth = '160px';
            image.style.objectFit = 'contain';
            element.appendChild(image);
        });
    }

    const root = document.documentElement;

    if (settings.primaryColor) {
        root.style.setProperty('--navy', settings.primaryColor);
    }

    if (settings.accentColor) {
        root.style.setProperty('--copper', settings.accentColor);
    }

    if (settings.sandColor) {
        root.style.setProperty('--sand', settings.sandColor);
    }

    if (settings.creamColor) {
        root.style.setProperty('--cream', settings.creamColor);
    }
}

// ================================
// PRODUCT
// ================================

async function loadProduct() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Product loading error:', error);
        return;
    }

    if (!data) {
        console.warn('لا يوجد منتج نشط في قاعدة البيانات.');
        return;
    }

    currentProduct = data;

    setText('[data-product-price]', formatPrice(data.price));
    setText('[data-product-old-price]', data.old_price ? formatPrice(data.old_price) : '');

    setText('[data-order-product-name]', data.name);
    setText('[data-order-product-price]', formatPrice(data.price));

    const discount = safeDiscount(data.old_price, data.price);

    const discountElement = $('[data-product-discount]');

    if (discountElement) {
        discountElement.textContent = discount ? `خصم ${discount}%` : '';
        discountElement.hidden = !discount;
    }

    setText('[data-product-description]', data.description);

    setImage('[data-product-main-image]', data.main_image, data.name);
    setImage('[data-product-secondary-image]', data.main_image, data.name);

    const mobileOrder = $('[data-mobile-order]');

    if (mobileOrder) {
        mobileOrder.textContent = `اطلب الآن — ${formatPrice(data.price)}`;
    }

    renderGallery(data);
}

function renderGallery(product) {
    const container = $('[data-product-gallery]');
    if (!container) return;

    let images = [];

    if (product.main_image) {
        images.push(product.main_image);
    }

    if (Array.isArray(product.gallery)) {
        product.gallery.forEach(item => {
            const url = typeof item === 'string' ? item : item?.url;
            if (url && !images.includes(url)) images.push(url);
        });
    }

    if (images.length === 0) return;

    container.innerHTML = images.map((url, index) => `
        <img
            src="${escapeHTML(url)}"
            alt="${escapeHTML(product.name || 'صورة المنتج')}"
            loading="lazy"
        >
    `).join('');
}

// ================================
// SECTIONS
// ================================

async function loadSections() {
    const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Sections loading error:', error);
        return;
    }

    if (!data) return;

    data.forEach(section => {
        const content = section.content || {};
        const key = section.section_key;

        const sectionMap = {
            hero: {
                title: '[data-hero-title]',
                subtitle: '[data-hero-description]',
                badge: '[data-hero-badge]'
            },
            features: {
                title: '#features .section-title h2',
                subtitle: '#features .section-title p'
            },
            gallery: {
                title: '#gallery .section-title h2',
                subtitle: '#gallery .section-title p'
            },
            details: {
                title: '#details h2',
                subtitle: '#details [data-product-description]'
            },
            reviews: {
                title: '#reviews .section-title h2',
                subtitle: '#reviews .section-title p'
            },
            faq: {
                title: '#faq .section-title h2',
                subtitle: '#faq .section-title p'
            }
        };

        const selectors = sectionMap[key];

        if (selectors) {
            if (section.title && selectors.title) {
                const element = $(selectors.title);
                if (element) element.textContent = section.title;
            }

            if (section.subtitle && selectors.subtitle) {
                const element = $(selectors.subtitle);
                if (element) element.textContent = section.subtitle;
            }

            if (content.badge && selectors.badge) {
                setText(selectors.badge, content.badge);
            }
        }

        // إخفاء القسم إذا كانت بياناته موجودة لكن لا نعرف له عنصرًا مطابقًا
        // لا يتم حذف أي قسم تلقائيًا من تصميم الصفحة.
    });
}

// ================================
// REVIEWS
// ================================

async function loadReviews() {
    const container = $('[data-reviews-container]');
    if (!container) return;

    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Reviews loading error:', error);
        return;
    }

    if (!data?.length) return;

    container.innerHTML = data.map(review => {
        const rating = Math.min(5, Math.max(0, Number(review.rating) || 5));

        return `
            <article class="review-card">
                <div class="stars">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
                <p>${escapeHTML(review.review_text || '')}</p>
                <strong>${escapeHTML(review.customer_name || 'عميل')}</strong>
            </article>
        `;
    }).join('');
}

// ================================
// FAQ
// ================================

async function loadFaqs() {
    const container = $('[data-faq-container]');
    if (!container) return;

    const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('FAQ loading error:', error);
        return;
    }

    if (!data?.length) return;

    container.innerHTML = data.map(faq => `
        <details>
            <summary>${escapeHTML(faq.question)}</summary>
            <p>${escapeHTML(faq.answer)}</p>
        </details>
    `).join('');
}

// ================================
// ORDER SUBMISSION
// ================================

const orderForm = $('#orderForm');
const formMessage = $('#formMessage');
const submitButton = $('#submitOrder');

orderForm?.addEventListener('submit', async event => {
    event.preventDefault();

    if (!orderForm.reportValidity()) return;

    if (!currentProduct) {
        formMessage.textContent = 'المنتج غير متاح حاليًا. حاول مرة أخرى لاحقًا.';
        return;
    }

    const name = $('#name').value.trim();
    const phone = $('#phone').value.trim();
    const address = $('#address').value.trim();
    const quantity = Number($('#quantity').value);

    if (!name || !phone || !address || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        formMessage.textContent = 'راجع البيانات المدخلة وحاول مرة أخرى.';
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'جارٍ تسجيل الطلب...';
    formMessage.textContent = '';

    const order = {
        product_name: currentProduct.name,
        customer_name: name,
        phone,
        address,
        quantity,
        status: 'pending'
    };

    const { error } = await supabase
        .from('orders')
        .insert(order);

    if (error) {
        console.error('Order submission error:', error);
        formMessage.textContent = 'تعذر تسجيل الطلب حاليًا. حاول مرة أخرى.';
        submitButton.disabled = false;
        submitButton.innerHTML = 'تأكيد الطلب <i class="fa-solid fa-arrow-left"></i>';
        return;
    }

    formMessage.textContent = 'تم استلام طلبك بنجاح! سنتواصل معك لتأكيده.';
    formMessage.style.color = 'green';

    // واتساب اختياري بعد تسجيل الطلب بنجاح
    const whatsappNumber = String(siteSettings.whatsappNumber || '').replace(/\D/g, '');

    if (/^\d{10,15}$/.test(whatsappNumber)) {
        const message = `
طلب جديد من متجر ${siteSettings.siteName || 'رِواق'}

المنتج: ${currentProduct.name}
الاسم: ${name}
الهاتف: ${phone}
العنوان: ${address}
الكمية: ${quantity}
        `.trim();

        window.open(
            `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
            '_blank',
            'noopener,noreferrer'
        );
    }

    orderForm.reset();
    $('#quantity').value = 1;

    submitButton.disabled = false;
    submitButton.innerHTML = 'تأكيد الطلب <i class="fa-solid fa-arrow-left"></i>';
});

// ================================
// INITIALIZE
// ================================

async function initializeSite() {
    $('#currentYear').textContent = new Date().getFullYear();

    await loadGeneralSettings();

    await Promise.all([
        loadProduct(),
        loadSections(),
        loadReviews(),
        loadFaqs()
    ]);
}

initializeSite();
