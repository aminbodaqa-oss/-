
import {
    supabase,
    getCachedSettings,
    getSiteSettings
} from './site-settings.js';

const $ = selector => document.querySelector(selector);

let currentProduct = null;
let siteSettings = {};

// =====================================
// GENERAL HELPERS
// =====================================

function setText(selector, value) {
    if (value === undefined || value === null || value === '') return;

    document.querySelectorAll(selector).forEach(element => {
        element.textContent = value;
    });
}

function setBrandName(name) {
    const brandName = name || 'رِواق';

    document.querySelectorAll('[data-site-name]').forEach(element => {
        // عدم تكرار الاسم أو النقطة عند تحديث الإعدادات
        element.replaceChildren();

        const text = document.createTextNode(brandName);
        const dot = document.createElement('span');

        dot.textContent = '.';

        element.append(text, dot);
    });

    setText('[data-footer-brand]', brandName);
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

function calculateDiscount(oldPrice, price) {
    const oldValue = Number(oldPrice);
    const newValue = Number(price);

    if (!oldValue || oldValue <= newValue) return 0;

    return Math.round(
        ((oldValue - newValue) / oldValue) * 100
    );
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

// =====================================
// APPLY GENERAL SETTINGS
// =====================================

function applyGeneralSettings(settings) {
    siteSettings = settings || {};

    const name = siteSettings.siteName || 'رِواق';

    setBrandName(name);

    setText('[data-footer-text]', siteSettings.footerText);

    document.title =
        `${name} | ${siteSettings.siteTagline || 'تجربة تستحقها'}`;

    // عرض اللوجو لو موجود
    if (siteSettings.logoUrl) {
        document.querySelectorAll('[data-site-name]').forEach(element => {
            const image = document.createElement('img');

            image.src = siteSettings.logoUrl;
            image.alt = name;
            image.style.maxHeight = '48px';
            image.style.maxWidth = '160px';
            image.style.objectFit = 'contain';

            element.replaceChildren(image);
        });
    }

    // ألوان الهوية
    const root = document.documentElement;

    if (siteSettings.primaryColor) {
        root.style.setProperty('--navy', siteSettings.primaryColor);
    }

    if (siteSettings.accentColor) {
        root.style.setProperty('--copper', siteSettings.accentColor);
    }

    if (siteSettings.sandColor) {
        root.style.setProperty('--sand', siteSettings.sandColor);
    }

    if (siteSettings.creamColor) {
        root.style.setProperty('--cream', siteSettings.creamColor);
    }
}

// =====================================
// LOAD SETTINGS
// =====================================

async function loadGeneralSettings() {

    // أولًا: قراءة الكاش وعرض الاسم فورًا
    const cachedSettings = getCachedSettings();

    applyGeneralSettings(cachedSettings);

    // إظهار الاسم فورًا وعدم انتظار Supabase
    document.documentElement.classList.remove('settings-loading');

    // ثانيًا: جلب أحدث إعدادات من السيرفر
    try {
        const latestSettings = await getSiteSettings();

        if (latestSettings && Object.keys(latestSettings).length) {
            applyGeneralSettings(latestSettings);
        }

    } catch (error) {
        console.error('General settings error:', error);
    }
}

// =====================================
// MOBILE MENU
// =====================================

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

        if (menuBtn) {
            menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        }
    });
});

// =====================================
// PRODUCT
// =====================================

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

    setText(
        '[data-product-old-price]',
        data.old_price ? formatPrice(data.old_price) : ''
    );

    setText('[data-order-product-name]', data.name);
    setText('[data-order-product-price]', formatPrice(data.price));

    setText('[data-product-description]', data.description);

    const discount = calculateDiscount(data.old_price, data.price);
    const discountElement = $('[data-product-discount]');

    if (discountElement) {
        discountElement.textContent = discount
            ? `خصم ${discount}%`
            : '';

        discountElement.hidden = !discount;
    }

    setImage('[data-product-main-image]', data.main_image, data.name);

    setImage('[data-product-secondary-image]', data.main_image, data.name);

    const mobileOrder = $('[data-mobile-order]');

    if (mobileOrder) {
        mobileOrder.textContent =
            `اطلب الآن — ${formatPrice(data.price)}`;
    }

    renderGallery(data);
}

function renderGallery(product) {
    const container = $('[data-product-gallery]');

    if (!container) return;

    const images = [];

    if (product.main_image) {
        images.push(product.main_image);
    }

    if (Array.isArray(product.gallery)) {
        product.gallery.forEach(item => {
            const url = typeof item === 'string'
                ? item
                : item?.url;

            if (url && !images.includes(url)) {
                images.push(url);
            }
        });
    }

    if (!images.length) return;

    container.innerHTML = images.map(url => `
        <img
            src="${escapeHTML(url)}"
            alt="${escapeHTML(product.name || 'صورة المنتج')}"
            loading="lazy"
        >
    `).join('');
}

// =====================================
// SECTIONS
// =====================================

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
            subtitle: '[data-product-description]'
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

    data.forEach(section => {
        const selectors = sectionMap[section.section_key];
        const content = section.content || {};

        if (!selectors) return;

        if (section.title && selectors.title) {
            const element = $(selectors.title);

            if (element) {
                element.textContent = section.title;
            }
        }

        if (section.subtitle && selectors.subtitle) {
            const element = $(selectors.subtitle);

            if (element) {
                element.textContent = section.subtitle;
            }
        }

        if (content.badge && selectors.badge) {
            setText(selectors.badge, content.badge);
        }
    });
}

// =====================================
// REVIEWS
// =====================================

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
        const rating = Math.min(
            5,
            Math.max(0, Number(review.rating) || 5)
        );

        return `
            <article class="review-card">
                <div class="stars">
                    ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
                </div>

                <p>${escapeHTML(review.review_text || '')}</p>

                <strong>
                    ${escapeHTML(review.customer_name || 'عميل')}
                </strong>
            </article>
        `;
    }).join('');
}

// =====================================
// FAQ
// =====================================

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

// =====================================
// ORDER FORM
// =====================================

const orderForm = $('#orderForm');
const formMessage = $('#formMessage');
const submitButton = $('#submitOrder');

orderForm?.addEventListener('submit', async event => {
    event.preventDefault();

    if (!orderForm.reportValidity()) return;

    if (!currentProduct) {
        formMessage.textContent =
            'المنتج غير متاح حاليًا. حاول مرة أخرى لاحقًا.';
        return;
    }

    const name = $('#name').value.trim();
    const phone = $('#phone').value.trim();
    const address = $('#address').value.trim();
    const quantity = Number($('#quantity').value);

    if (
        !name ||
        !phone ||
        !address ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 20
    ) {
        formMessage.textContent =
            'راجع البيانات المدخلة وحاول مرة أخرى.';
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

        formMessage.textContent =
            'تعذر تسجيل الطلب حاليًا. حاول مرة أخرى.';

        submitButton.disabled = false;

        submitButton.innerHTML =
            'تأكيد الطلب <i class="fa-solid fa-arrow-left"></i>';

        return;
    }

    formMessage.textContent =
        'تم استلام طلبك بنجاح! سنتواصل معك لتأكيده.';

    formMessage.style.color = 'green';

    const whatsappNumber = String(
        siteSettings.whatsappNumber || ''
    ).replace(/\D/g, '');

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

    submitButton.innerHTML =
        'تأكيد الطلب <i class="fa-solid fa-arrow-left"></i>';
});

// =====================================
// INITIALIZE
// =====================================

async function initializeSite() {
    $('#currentYear').textContent = new Date().getFullYear();

    // عرض الاسم والإعدادات المحلية فورًا
    const settingsPromise = loadGeneralSettings();

    // تحميل بقية محتويات الموقع
    await Promise.all([
        settingsPromise,
        loadProduct(),
        loadSections(),
        loadReviews(),
        loadFaqs()
    ]);
}

initializeSite();
