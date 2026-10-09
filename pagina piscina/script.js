/**
 * pisciCor - Lógica Interactiva Optimizada para Edge Computing & Cloudflare
 * - Aislamiento de API (/api/*)
 * - Control de eventos (Debounce / Throttle)
 * - Protección contra envíos dobles y bots
 * - 0 Polling / Loops en segundo plano
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // Configuración & Utilidades de Rendimiento
  // ==========================================
  const PHONE_NUMBERS = {
    line1: {
      raw: '3543634606',
      formatted: '3543 634606',
      waUrl: 'https://wa.me/5493543634606',
      telUrl: 'tel:3543634606'
    },
    line2: {
      raw: '3543613121',
      formatted: '3543 613121',
      waUrl: 'https://wa.me/5493543613121',
      telUrl: 'tel:3543613121'
    }
  };

  /**
   * Wrapper estricto para peticiones backend (Cloudflare Worker / API)
   * Garantiza que todas las llamadas pasen por el endpoint aislado /api/*
   */
  window.fetchAPI = async function(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `/api${cleanEndpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        ...options
      });
      return await response.json();
    } catch (error) {
      console.error(`[API Error] Error en llamada a ${url}:`, error);
      throw error;
    }
  };

  /**
   * Utilidad Debounce: Evita ejecuciones consecutivas rápidas
   */
  function debounce(func, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Utilidad Throttle: Limita la frecuencia máxima de ejecución
   */
  function throttle(func, limit = 100) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Referencias DOM
  const navbar = document.getElementById('navbar');
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');
  
  const modalWhatsapp = document.getElementById('modalWhatsapp');
  const modalCall = document.getElementById('modalCall');
  const modalGallery = document.getElementById('modalGallery');
  const galleryModalImg = document.getElementById('galleryModalImg');
  
  const widgetTrigger = document.getElementById('widgetTrigger');
  const widgetMenu = document.getElementById('widgetMenu');
  
  const quoteForm = document.getElementById('quoteForm');

  // ==========================================
  // 1. Scroll & Navbar Efecto Sticky Optimizado
  // ==========================================
  let isTicking = false;
  function onScroll() {
    if (!isTicking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 40) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
        isTicking = false;
      });
      isTicking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ==========================================
  // 2. Menú Mobile Toggle
  // ==========================================
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', throttle(() => {
      navMenu.classList.toggle('active');
      const icon = mobileToggle.querySelector('i');
      if (icon) {
        icon.className = navMenu.classList.contains('active') ? 'ri-close-line' : 'ri-menu-line';
      }
    }, 200));

    // Cerrar menú al hacer clic en un enlace
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        const icon = mobileToggle.querySelector('i');
        if (icon) icon.className = 'ri-menu-line';
      });
    });
  }

  // ==========================================
  // 3. Manejo de Modales de Contacto
  // ==========================================
  window.openWhatsappModal = function(customMessage = '') {
    window.currentCustomWaMsg = customMessage;
    if (modalWhatsapp) {
      modalWhatsapp.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  window.openCallModal = function() {
    if (modalCall) {
      modalCall.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  // Cerrar modal al hacer clic en el fondo
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });

  // Event Listeners con debounce para opciones de WhatsApp
  document.querySelectorAll('.btn-wa-line').forEach(btn => {
    btn.addEventListener('click', throttle((e) => {
      const lineKey = btn.getAttribute('data-line');
      const numberObj = PHONE_NUMBERS[lineKey] || PHONE_NUMBERS.line1;
      
      let finalUrl = numberObj.waUrl;
      const defaultText = encodeURIComponent('Hola pisciCor! Me comunico desde la página web para solicitar información.');
      
      if (window.currentCustomWaMsg) {
        finalUrl += `?text=${encodeURIComponent(window.currentCustomWaMsg)}`;
      } else {
        finalUrl += `?text=${defaultText}`;
      }

      window.open(finalUrl, '_blank');
      closeModal('modalWhatsapp');
    }, 1000));
  });

  // Event Listeners para opciones de Llamada
  document.querySelectorAll('.btn-call-line').forEach(btn => {
    btn.addEventListener('click', throttle((e) => {
      const lineKey = btn.getAttribute('data-line');
      const numberObj = PHONE_NUMBERS[lineKey] || PHONE_NUMBERS.line1;
      window.location.href = numberObj.telUrl;
      closeModal('modalCall');
    }, 1000));
  });

  // ==========================================
  // 4. Widget Flotante Persistente (Speed Dial)
  // ==========================================
  if (widgetTrigger && widgetMenu) {
    widgetTrigger.addEventListener('click', throttle(() => {
      widgetMenu.classList.toggle('active');
    }, 200));

    // Cerrar widget si hace clic afuera
    document.addEventListener('click', (e) => {
      if (!widgetTrigger.contains(e.target) && !widgetMenu.contains(e.target)) {
        widgetMenu.classList.remove('active');
      }
    });
  }

  // ==========================================
  // 5. Cotizador Express (Prevención Envíos Dobles + Honeypot)
  // ==========================================
  if (quoteForm) {
    quoteForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Verification Anti-Bot (Honeypot)
      const honeypot = quoteForm.querySelector('input[name="b_honeypot"]');
      if (honeypot && honeypot.value !== '') {
        console.warn('[Anti-Bot] Intento de spam detectado y bloqueado.');
        return false;
      }

      const submitBtn = quoteForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        if (submitBtn.disabled) return; // Prevenir envíos múltiples
        
        // Bloquear botón temporalmente
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Generando Consulta...`;

        // Restablecer botón tras 2.5 segundos
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }, 2500);
      }

      const service = document.getElementById('quoteService').value;
      const size = document.getElementById('quoteSize').value;
      const location = document.getElementById('quoteLocation').value;
      const comments = document.getElementById('quoteComments').value;
      
      const selectedPhoneRadio = document.querySelector('input[name="quotePhone"]:checked');
      const selectedPhone = selectedPhoneRadio ? selectedPhoneRadio.value : '3543634606';

      let message = `*SOLICITUD DE PRESUPUESTO - PISCICOR*\n\n`;
      message += `🔹 *Servicio requerido:* ${service}\n`;
      message += `📐 *Medida/Dimensiones:* ${size}\n`;
      if (location) message += `📍 *Ubicación:* ${location}\n`;
      if (comments) message += `📝 *Detalles adicionales:* ${comments}\n\n`;
      message += `_Enviado desde el cotizador web de pisciCor._`;

      const encodedMessage = encodeURIComponent(message);
      const waUrl = `https://wa.me/549${selectedPhone}?text=${encodedMessage}`;

      window.open(waUrl, '_blank');
    });
  }

  // ==========================================
  // 6. Galería Lightbox Preview
  // ==========================================
  window.openGalleryModal = function(imgSrc, titleText) {
    if (modalGallery && galleryModalImg) {
      galleryModalImg.src = imgSrc;
      const titleEl = document.getElementById('galleryModalTitle');
      if (titleEl) titleEl.textContent = titleText || 'Proyecto pisciCor';
      modalGallery.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };
});
