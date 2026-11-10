
// MOBILE MENU

const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");

menuBtn.addEventListener("click", () => {
    nav.classList.toggle("open");

    menuBtn.innerHTML = nav.classList.contains("open")
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
});

// CLOSE MENU AFTER CLICK

nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
        nav.classList.remove("open");
        menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
});

// ORDER FORM

const orderForm = document.getElementById("orderForm");
const formMessage = document.getElementById("formMessage");

// ضع رقم واتساب المتجر بصيغة دولية بدون +
const WHATSAPP_NUMBER = "";

orderForm.addEventListener("submit", function(e) {
    e.preventDefault();

    if (!orderForm.reportValidity()) return;

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const quantity = document.getElementById("quantity").value;

    const message =
`طلب جديد من متجر رِواق

المنتج: اسم المنتج
الاسم: ${name}
الهاتف: ${phone}
العنوان: ${address}
الكمية: ${quantity}`;

    if (/^\d{10,15}$/.test(WHATSAPP_NUMBER)) {
        const url =
            `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

        window.open(url, "_blank", "noopener,noreferrer");
        formMessage.textContent =
            "تم تجهيز الطلب. أرسل الرسالة عبر واتساب لتأكيده.";
    } else {
        formMessage.textContent =
            "النموذج جاهز، لكن يلزم إضافة رقم واتساب المتجر لتفعيل إرسال الطلب.";
    }
});
