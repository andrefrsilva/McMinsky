/**
 * McMinsky - Elite Knowledge Club
 * Main JavaScript functionality
 */

(function() {
  'use strict';

  // ========================================
  // LOADER
  // ========================================
  const loader = document.querySelector('.loader');

  function hideLoader() {
    if (loader) {
      loader.classList.add('hidden');
      document.body.classList.remove('loading');
    }
  }

  // Hide loader when page is fully loaded
  window.addEventListener('load', function() {
    setTimeout(hideLoader, 2000); // Minimum 2s display
  });

  // Fallback - hide loader after 4s max
  setTimeout(hideLoader, 4000);

  // ========================================
  // NAVIGATION
  // ========================================
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  const navLinks = document.querySelectorAll('.nav-link');
  const header = document.querySelector('.header');
  let lastScroll = 0;

  // Toggle mobile menu
  if (navToggle && nav) {
    navToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      nav.classList.toggle('active');
      document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    });
  }

  // Close menu on link click
  navLinks.forEach(function(link) {
    link.addEventListener('click', function() {
      if (navToggle) navToggle.classList.remove('active');
      if (nav) nav.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  // Hide/show header on scroll
  window.addEventListener('scroll', function() {
    const currentScroll = window.pageYOffset;

    if (currentScroll > lastScroll && currentScroll > 100) {
      header.classList.add('hidden');
    } else {
      header.classList.remove('hidden');
    }

    lastScroll = currentScroll;
  });

  // ========================================
  // SMOOTH SCROLL
  // ========================================
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ========================================
  // ACCORDION/COLLAPSIBLE PROGRAMS
  // ========================================
  const programItems = document.querySelectorAll('.program-item');

  programItems.forEach(function(item) {
    const header = item.querySelector('.program-header');
    if (header) {
      header.addEventListener('click', function() {
        // Close other items
        programItems.forEach(function(otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
          }
        });
        // Toggle current item
        item.classList.toggle('active');
      });
    }
  });

  // ========================================
  // CONTACT FORM - MAILTO TRICK
  // ========================================
  const contactForm = document.querySelector('#contact-form');

  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const name = document.querySelector('#contact-name').value.trim();
      const email = document.querySelector('#contact-email').value.trim();
      const subject = document.querySelector('#contact-subject').value.trim();
      const message = document.querySelector('#contact-message').value.trim();

      // Construct email body
      const body = `Nome: ${name}
Email: ${email}

${message}

---
Enviado através do formulário do website McMinsky`;

      // Create mailto link
      const mailtoLink = `mailto:mcminsky@gmail.com?subject=${encodeURIComponent(subject || 'Contacto via Website')}&body=${encodeURIComponent(body)}`;

      // Open user's email client
      window.location.href = mailtoLink;
    });
  }

  // ========================================
  // GDPR COOKIE CONSENT
  // ========================================
  const gdprBanner = document.querySelector('.gdpr-banner');
  const gdprAccept = document.querySelector('#gdpr-accept');
  const gdprReject = document.querySelector('#gdpr-reject');
  const CONSENT_KEY = 'mcminsky_gdpr_consent';

  function checkConsent() {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent && gdprBanner) {
      setTimeout(function() {
        gdprBanner.classList.add('visible');
      }, 1500);
    }
  }

  function setConsent(value) {
    localStorage.setItem(CONSENT_KEY, value);
    if (gdprBanner) {
      gdprBanner.classList.remove('visible');
    }
  }

  if (gdprAccept) {
    gdprAccept.addEventListener('click', function() {
      setConsent('accepted');
    });
  }

  if (gdprReject) {
    gdprReject.addEventListener('click', function() {
      setConsent('rejected');
    });
  }

  // Check consent on page load
  checkConsent();

  // ========================================
  // MODALS
  // ========================================
  const modalTriggers = document.querySelectorAll('[data-modal]');
  const modals = document.querySelectorAll('.modal');
  const modalCloses = document.querySelectorAll('.modal-close');

  function openModal(modalId) {
    const modal = document.querySelector(modalId);
    if (modal) {
      modal.classList.add('visible');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(modal) {
    modal.classList.remove('visible');
    document.body.style.overflow = '';
  }

  modalTriggers.forEach(function(trigger) {
    trigger.addEventListener('click', function(e) {
      e.preventDefault();
      const modalId = this.getAttribute('data-modal');
      openModal(modalId);
    });
  });

  modalCloses.forEach(function(close) {
    close.addEventListener('click', function() {
      const modal = this.closest('.modal');
      if (modal) closeModal(modal);
    });
  });

  modals.forEach(function(modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // Close modal on ESC key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      modals.forEach(function(modal) {
        if (modal.classList.contains('visible')) {
          closeModal(modal);
        }
      });
    }
  });

  // ========================================
  // SCROLL ANIMATIONS
  // ========================================
  const animatedElements = document.querySelectorAll('.fade-in, .stagger');

  function checkVisibility() {
    const windowHeight = window.innerHeight;

    animatedElements.forEach(function(element) {
      const elementTop = element.getBoundingClientRect().top;
      const triggerPoint = windowHeight * 0.85;

      if (elementTop < triggerPoint) {
        element.classList.add('visible');
      }
    });
  }

  // Initial check
  checkVisibility();

  // Check on scroll (throttled)
  let scrollTimeout;
  window.addEventListener('scroll', function() {
    if (!scrollTimeout) {
      scrollTimeout = setTimeout(function() {
        checkVisibility();
        scrollTimeout = null;
      }, 100);
    }
  });

  // ========================================
  // LANGUAGE SWITCHER
  // ========================================
  const langBtns = document.querySelectorAll('.lang-btn');

  langBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      const lang = this.getAttribute('data-lang');
      const currentPath = window.location.pathname;

      if (lang === 'en') {
        // Navigate to English version
        if (!currentPath.includes('/en/')) {
          if (currentPath.includes('/articles/')) {
            window.location.href = currentPath.replace('/articles/', '/articles/en/');
          } else {
            window.location.href = '/en/' + currentPath.replace('/', '');
          }
        }
      } else {
        // Navigate to Portuguese version
        if (currentPath.includes('/en/')) {
          window.location.href = currentPath.replace('/en/', '/');
        } else if (currentPath.includes('/articles/en/')) {
          window.location.href = currentPath.replace('/articles/en/', '/articles/');
        }
      }
    });
  });

  // ========================================
  // DYNAMIC YEAR FOR COPYRIGHT
  // ========================================
  const yearSpans = document.querySelectorAll('.current-year');
  const currentYear = new Date().getFullYear();

  yearSpans.forEach(function(span) {
    span.textContent = currentYear;
  });

  // ========================================
  // EXTERNAL LINKS - OPEN IN NEW TAB
  // ========================================
  document.querySelectorAll('a[href^="http"]').forEach(function(link) {
    if (!link.href.includes(window.location.hostname)) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // ========================================
  // ARTICLES LOADER (for index pages)
  // ========================================
  const articlesContainer = document.querySelector('#articles-container');

  if (articlesContainer && typeof ARTICLES !== 'undefined') {
    function renderArticles(articles, limit) {
      const toRender = limit ? articles.slice(0, limit) : articles;

      toRender.forEach(function(article) {
        const card = document.createElement('a');
        card.href = article.url;
        card.className = 'article-card';
        card.innerHTML = `
          <div class="article-image">
            <img src="${article.image}" alt="${article.title}" loading="lazy">
          </div>
          <div class="article-body">
            <span class="article-category">${article.category}</span>
            <h3 class="article-title">${article.title}</h3>
            <p class="article-excerpt">${article.excerpt}</p>
            <div class="article-meta">
              <span>${article.date}</span>
              <span>${article.readTime}</span>
            </div>
          </div>
        `;
        articlesContainer.appendChild(card);
      });
    }

    renderArticles(ARTICLES, 6);
  }

  // ========================================
  // EVENTS LOADER (from manifest.json)
  // ========================================
  const eventsContainer = document.querySelector('#events-container');
  const isEnglish = window.location.pathname.includes('/en/');

  // Determine the base path for events
  const eventsBasePath = isEnglish ? '../events/' : 'events/';
  const manifestPath = eventsBasePath + 'manifest.json';

  function formatDatePt(dateStr) {
    if (!dateStr) return 'Contínuo';
    const date = new Date(dateStr);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
  }

  function formatDateEn(dateStr) {
    if (!dateStr) return 'Continuous';
    const date = new Date(dateStr);
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
  }

  function sortEvents(events) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Separate events with dates and continuous events
    const datedEvents = events.filter(function(e) { return e.date && !e.continuous; });
    const continuousEvents = events.filter(function(e) { return !e.date || e.continuous; });

    // Filter out past events
    const futureEvents = datedEvents.filter(function(e) {
      const eventDate = new Date(e.date);
      return eventDate >= today;
    });

    // Sort by date (closest first)
    futureEvents.sort(function(a, b) {
      return new Date(a.date) - new Date(b.date);
    });

    // Continuous events at the end
    return futureEvents.concat(continuousEvents);
  }

  function renderEvents(events) {
    if (!eventsContainer) return;

    const sortedEvents = sortEvents(events);

    sortedEvents.forEach(function(event) {
      const card = document.createElement('a');
      card.href = eventsBasePath + event.slug + '.html';
      card.className = 'offer-card offer-card-link';

      // Determine title, description, price based on language
      const title = isEnglish && event.titleEn ? event.titleEn : event.title;
      const description = isEnglish && event.descriptionEn ? event.descriptionEn : event.description;
      const price = isEnglish && event.priceEn ? event.priceEn : event.price;
      const dateFormatted = isEnglish ? formatDateEn(event.date) : formatDatePt(event.date);

      // Spots text
      let spotsText;
      if (event.spotsText) {
        spotsText = isEnglish && event.spotsTextEn ? event.spotsTextEn : event.spotsText;
      } else if (event.spots) {
        spotsText = isEnglish ? event.spots + ' spots' : event.spots + ' vagas';
      } else {
        spotsText = isEnglish ? 'Limited spots' : 'Vagas limitadas';
      }

      // Build media HTML (video or image)
      let mediaHtml = '';
      if (event.video) {
        mediaHtml = `
          <div class="offer-card-media">
            <video autoplay muted loop playsinline>
              <source src="${event.video}" type="video/mp4">
            </video>
          </div>
        `;
      } else if (event.image) {
        mediaHtml = `
          <div class="offer-card-media">
            <img src="${event.image}" alt="${title}" loading="lazy">
          </div>
        `;
      }

      card.innerHTML = `
        ${mediaHtml}
        <span class="offer-date">${dateFormatted}</span>
        <h3 class="offer-title">${title}</h3>
        <span class="offer-category">${event.category}</span>
        <p class="offer-description">${description}</p>
        <div class="offer-meta">
          <span class="offer-price">${price}</span>
          <span class="offer-spots">${spotsText}</span>
        </div>
      `;

      eventsContainer.appendChild(card);
    });
  }

  // Load events from manifest
  if (eventsContainer) {
    fetch(manifestPath)
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to load events');
        return response.json();
      })
      .then(function(data) {
        if (data.events && data.events.length > 0) {
          renderEvents(data.events);
        }
      })
      .catch(function(error) {
        console.error('Error loading events:', error);
      });
  }

  // ========================================
  // EVENT PAGE - QUIZ FUNCTIONALITY
  // ========================================
  const quizForm = document.querySelector('.event-quiz');
  const eventReveal = document.querySelector('.event-reveal');

  if (quizForm) {
    const quizOptions = quizForm.querySelectorAll('.quiz-option');
    const quizSubmit = quizForm.querySelector('.quiz-submit');

    // Handle option selection
    quizOptions.forEach(function(option) {
      option.addEventListener('click', function() {
        // Find the parent question
        const question = this.closest('.quiz-question');
        // Deselect siblings
        question.querySelectorAll('.quiz-option').forEach(function(opt) {
          opt.classList.remove('selected');
        });
        // Select this option
        this.classList.add('selected');
        this.querySelector('input').checked = true;
      });
    });

    // Handle form submission
    if (quizSubmit) {
      quizSubmit.addEventListener('click', function(e) {
        e.preventDefault();

        // Check if all questions are answered
        const questions = quizForm.querySelectorAll('.quiz-question');
        let allAnswered = true;

        questions.forEach(function(q) {
          if (!q.querySelector('.quiz-option.selected')) {
            allAnswered = false;
          }
        });

        if (!allAnswered) {
          alert(isEnglish ? 'Please answer all questions.' : 'Por favor, responde a todas as perguntas.');
          return;
        }

        // Reveal hidden content
        if (eventReveal) {
          eventReveal.classList.add('visible');
          // Scroll to reveal
          setTimeout(function() {
            eventReveal.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 300);
        }

        // Hide quiz or show completion message
        quizForm.style.display = 'none';
      });
    }
  }

  // ========================================
  // EVENT PAGE - CONTACT FORM
  // ========================================
  const eventForm = document.querySelector('#event-contact-form');

  if (eventForm) {
    eventForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const name = eventForm.querySelector('#event-name').value.trim();
      const email = eventForm.querySelector('#event-email').value.trim();
      const phone = eventForm.querySelector('#event-phone') ? eventForm.querySelector('#event-phone').value.trim() : '';
      const message = eventForm.querySelector('#event-message') ? eventForm.querySelector('#event-message').value.trim() : '';

      // Get event title from page
      const eventTitle = document.querySelector('.event-title') ? document.querySelector('.event-title').textContent : 'Evento';

      // Construct email body
      const body = `Nome: ${name}
Email: ${email}
${phone ? 'Telefone: ' + phone : ''}

Evento: ${eventTitle}

${message ? 'Mensagem: ' + message : ''}

---
Enviado através do formulário do evento no website McMinsky`;

      // Create mailto link
      const subject = isEnglish ? 'Event Registration: ' + eventTitle : 'Inscrição Evento: ' + eventTitle;
      const mailtoLink = 'mailto:mcminsky@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

      // Open user's email client
      window.location.href = mailtoLink;
    });
  }

})();
