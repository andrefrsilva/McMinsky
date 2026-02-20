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
  // USER IDENTITY & REFERRAL TRACKING
  // ========================================
  var UID_KEY = 'mcminsky_uid';
  var REFERRAL_KEY = 'mcminsky_referral';

  function getMcmUserId() {
    var uid = null;
    try { uid = localStorage.getItem(UID_KEY); } catch(e) {}
    if (!uid) {
      uid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
          });
      try { localStorage.setItem(UID_KEY, uid); } catch(e) {}
    }
    return uid;
  }

  function checkReferralCode() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get('code');
    if (code) {
      try {
        if (!localStorage.getItem(REFERRAL_KEY)) {
          localStorage.setItem(REFERRAL_KEY, code);
        }
      } catch(e) {}
    }
  }

  function getMcmReferral() {
    try { return localStorage.getItem(REFERRAL_KEY) || null; } catch(e) { return null; }
  }

  var mcmUserId = getMcmUserId();
  checkReferralCode();

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
    const programHeader = item.querySelector('.program-header');
    if (programHeader) {
      programHeader.addEventListener('click', function() {
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

  // Deep-link: open specific accordion from URL hash (e.g. #program-teens)
  (function() {
    var hash = window.location.hash;
    if (hash) {
      var target = document.querySelector(hash);
      if (target && target.classList.contains('program-item')) {
        // Close all others, open this one
        programItems.forEach(function(item) { item.classList.remove('active'); });
        target.classList.add('active');
        // Scroll to it after a short delay for rendering
        setTimeout(function() {
          var headerHeight = header ? header.offsetHeight : 0;
          var targetTop = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
          window.scrollTo({ top: targetTop, behavior: 'smooth' });
        }, 300);
      }
    }
  })();

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

      // Track in Google Forms
      mcmTrack('contacto', 'Nome: ' + name + '\nEmail: ' + email + '\nAssunto: ' + (subject || 'N/A') + '\nMensagem: ' + message);

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
  // LANGUAGE SWITCHER WITH LOCALSTORAGE
  // ========================================
  const LANG_KEY = 'mcminsky_lang';
  const langBtns = document.querySelectorAll('.lang-btn');
  const currentPath = window.location.pathname;

  // Detect current language from URL
  function getCurrentLang() {
    if (currentPath.includes('/en/') || currentPath.includes('/en.') || currentPath.includes('/events/en/')) {
      return 'en';
    }
    return 'pt';
  }

  // Global language variable for use throughout the script
  const isEnglish = getCurrentLang() === 'en';

  // Get base path for GitHub Pages compatibility
  function getBasePath() {
    // Find the base path by looking for known patterns
    const match = currentPath.match(/^(\/[^\/]+)?(?:\/(?:en|pt))?/);
    // If hosted at root, return empty; if at /repo-name/, return that
    if (currentPath.startsWith('/mcminsky-site')) {
      return '/mcminsky-site';
    }
    return '';
  }

  // Build URL for target language
  function buildLangUrl(targetLang) {
    const basePath = getBasePath();
    const currentLang = getCurrentLang();

    // Already on target language
    if (currentLang === targetLang) return null;

    let newPath = currentPath;

    if (targetLang === 'en') {
      // PT -> EN
      if (currentPath.includes('/events/') && !currentPath.includes('/events/en/')) {
        newPath = currentPath.replace('/events/', '/events/en/');
      } else if (currentPath.includes('/articles/pt/')) {
        newPath = currentPath.replace('/articles/pt/', '/articles/en/');
      } else if (currentPath.includes('/articles/') && !currentPath.includes('/articles/en/')) {
        newPath = currentPath.replace('/articles/', '/articles/en/');
      } else if (currentPath.includes('/pages/') && !currentPath.includes('/pages/en/')) {
        newPath = currentPath.replace('/pages/', '/pages/en/');
      } else if (!currentPath.includes('/en/')) {
        // Main page or other pages
        if (currentPath.endsWith('/') || currentPath.endsWith('/index.html')) {
          const base = currentPath.replace(/index\.html$/, '').replace(/\/$/, '');
          newPath = base + '/en/';
        } else {
          newPath = currentPath.replace(/\.html$/, '') + '/en/';
        }
      }
    } else {
      // EN -> PT
      if (currentPath.includes('/events/en/')) {
        newPath = currentPath.replace('/events/en/', '/events/');
      } else if (currentPath.includes('/articles/en/')) {
        newPath = currentPath.replace('/articles/en/', '/articles/pt/');
      } else if (currentPath.includes('/en/')) {
        newPath = currentPath.replace('/en/', '/');
      }
    }

    return newPath;
  }

  // Mark active language button
  function updateActiveLangBtn() {
    const currentLang = getCurrentLang();
    langBtns.forEach(function(btn) {
      const btnLang = btn.getAttribute('data-lang');
      btn.classList.toggle('active', btnLang === currentLang);
    });
  }

  // Save language preference
  function saveLangPreference(lang) {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {
      // localStorage not available
    }
  }

  // Get saved language preference
  function getSavedLangPreference() {
    try {
      return localStorage.getItem(LANG_KEY);
    } catch (e) {
      return null;
    }
  }

  // Auto-redirect based on saved preference (only on main pages)
  function checkLangRedirect() {
    const savedLang = getSavedLangPreference();
    const currentLang = getCurrentLang();

    // Only auto-redirect if user has a saved preference different from current
    if (savedLang && savedLang !== currentLang) {
      const newUrl = buildLangUrl(savedLang);
      if (newUrl && newUrl !== currentPath) {
        // Check if the target page exists before redirecting
        // For now, only redirect main pages where we know EN exists
        const safeToRedirect =
          (currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.match(/\/mcminsky-site\/?$/)) ||
          currentPath.includes('/en/');

        if (safeToRedirect) {
          window.location.href = newUrl;
        }
      }
    }
  }

  // Handle language button clicks
  langBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      const targetLang = this.getAttribute('data-lang');
      saveLangPreference(targetLang);

      const newUrl = buildLangUrl(targetLang);
      if (newUrl) {
        window.location.href = newUrl;
      }
    });
  });

  // Initialize
  updateActiveLangBtn();
  // Auto-redirect based on saved preference
  checkLangRedirect();

  // ========================================
  // GOOGLE FORMS TRACKING SYSTEM
  // ========================================
  var GFORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe2I3Jy2hNkzlCcPS7oy5hKtpvJQKPCGGyHSUq9H8iab0nBBw/formResponse';
  var GFORM_FIELD_ACTION = 'entry.1191618802';
  var GFORM_FIELD_UID = 'entry.97481516';
  var GFORM_FIELD_BODY = 'entry.1381161689';

  function mcmTrack(actionType, extraContent) {
    var referral = getMcmReferral();
    var isMobile = /Mobi|Android/i.test(navigator.userAgent);
    var body = 'Timestamp: ' + new Date().toISOString() +
      '\nUser ID: ' + mcmUserId +
      '\nPágina: ' + window.location.href +
      '\nReferral: ' + (referral || 'direto') +
      '\nDispositivo: ' + (isMobile ? 'Mobile' : 'Desktop') +
      '\nIdioma: ' + getCurrentLang() +
      '\nEcrã: ' + window.innerWidth + 'x' + window.innerHeight +
      '\nUser Agent: ' + navigator.userAgent;
    if (extraContent) body += '\n\n--- Dados Adicionais ---\n' + extraContent;

    var formData = new URLSearchParams();
    formData.append(GFORM_FIELD_ACTION, actionType);
    formData.append(GFORM_FIELD_UID, mcmUserId);
    formData.append(GFORM_FIELD_BODY, body);

    try {
      fetch(GFORM_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });
    } catch(e) {}
  }

  function getMcmPageTitle() {
    return document.title.replace(' | McMinsky', '').trim();
  }

  // Track event page visit automatically
  var isEventPage = !!document.querySelector('.event-content');
  if (isEventPage) {
    mcmTrack(getMcmPageTitle() + ': visita');
  }

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
  // EVENTS LOADER (from manifest.json)
  // ========================================
  const eventsContainer = document.querySelector('#events-container');

  if (eventsContainer) {
    const eventsBasePath = isEnglish ? '../events/' : 'events/';
    const eventsManifestPath = eventsBasePath + 'manifest.json';
    const eventsHtmlPath = isEnglish ? eventsBasePath + 'en/' : eventsBasePath;

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

      const datedEvents = events.filter(function(e) { return e.date && !e.continuous; });
      const continuousEvents = events.filter(function(e) { return !e.date || e.continuous; });

      const futureEvents = datedEvents.filter(function(e) {
        const eventDate = new Date(e.date);
        return eventDate >= today;
      });

      futureEvents.sort(function(a, b) {
        return new Date(a.date) - new Date(b.date);
      });

      return futureEvents.concat(continuousEvents);
    }

    function renderEvents(events) {
      const sortedEvents = sortEvents(events);

      sortedEvents.forEach(function(event) {
        const card = document.createElement('a');
        card.href = eventsHtmlPath + event.slug + '.html';
        card.className = 'offer-card offer-card-link';

        const dateFormatted = isEnglish ? formatDateEn(event.date) : formatDatePt(event.date);

        let spotsText;
        if (event.spotsText) {
          spotsText = event.spotsText;
        } else if (event.spots) {
          spotsText = isEnglish ? event.spots + ' spots' : event.spots + ' vagas';
        } else {
          spotsText = isEnglish ? 'Limited spots' : 'Vagas limitadas';
        }

        let mediaHtml = '';
        if (event.video) {
          mediaHtml = '<div class="offer-card-media"><video autoplay muted loop playsinline><source src="' + event.video + '" type="video/mp4"></video></div>';
        } else if (event.image) {
          mediaHtml = '<div class="offer-card-media"><img src="' + event.image + '" alt="' + event.title + '" loading="lazy"></div>';
        }

        card.innerHTML = mediaHtml +
          '<span class="offer-date">' + dateFormatted + '</span>' +
          '<h3 class="offer-title">' + event.title + '</h3>' +
          '<span class="offer-category">' + event.category + '</span>' +
          '<p class="offer-description">' + event.description + '</p>' +
          '<div class="offer-meta"><span class="offer-price">' + event.price + '</span><span class="offer-spots">' + spotsText + '</span></div>';

        eventsContainer.appendChild(card);
      });
    }

    fetch(eventsManifestPath)
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to load events manifest');
        return response.json();
      })
      .then(function(slugs) {
        var fetchPromises = slugs.map(function(slug) {
          return fetch(eventsHtmlPath + slug + '.html')
            .then(function(response) {
              if (!response.ok) throw new Error('Failed to load event: ' + slug);
              return response.text();
            })
            .then(function(html) {
              var parser = new DOMParser();
              var doc = parser.parseFromString(html, 'text/html');

              var title = doc.querySelector('title') ? doc.querySelector('title').textContent.replace(' | McMinsky', '') : slug;
              var description = doc.querySelector('meta[name="description"]') ? doc.querySelector('meta[name="description"]').getAttribute('content') : '';
              var category = doc.querySelector('meta[name="category"]') ? doc.querySelector('meta[name="category"]').getAttribute('content') : '';
              var date = doc.querySelector('meta[name="event-date"]') ? doc.querySelector('meta[name="event-date"]').getAttribute('content') : null;
              var price = doc.querySelector('meta[name="event-price"]') ? doc.querySelector('meta[name="event-price"]').getAttribute('content') : '';
              var spots = doc.querySelector('meta[name="event-spots"]') ? doc.querySelector('meta[name="event-spots"]').getAttribute('content') : null;
              var spotsText = doc.querySelector('meta[name="event-spots-text"]') ? doc.querySelector('meta[name="event-spots-text"]').getAttribute('content') : null;
              var continuous = doc.querySelector('meta[name="event-continuous"]') ? doc.querySelector('meta[name="event-continuous"]').getAttribute('content') === 'true' : false;
              var video = doc.querySelector('meta[name="event-video"]') ? doc.querySelector('meta[name="event-video"]').getAttribute('content') : null;
              var image = doc.querySelector('meta[property="og:image"]') ? doc.querySelector('meta[property="og:image"]').getAttribute('content') : '';

              return {
                slug: slug,
                title: title,
                description: description,
                category: category,
                date: date,
                price: price,
                spots: spots,
                spotsText: spotsText,
                continuous: continuous,
                video: video,
                image: image
              };
            });
        });

        return Promise.all(fetchPromises);
      })
      .then(function(events) {
        renderEvents(events);
      })
      .catch(function(error) {
        console.error('Error loading events:', error);
      });
  }

  // ========================================
  // EVENT PAGE - CARD-BASED QUIZ
  // ========================================
  const quizContainer = document.querySelector('.event-quiz');
  const eventReveal = document.querySelector('.event-reveal');

  if (quizContainer) {
    initCardQuiz(quizContainer);
  }

  function initCardQuiz(container) {
    const questions = container.querySelectorAll('.quiz-question');
    if (questions.length === 0) return;

    let currentIndex = 0;

    // Create progress dots
    const progressContainer = document.createElement('div');
    progressContainer.className = 'quiz-progress';
    questions.forEach(function(_, i) {
      const dot = document.createElement('div');
      dot.className = 'quiz-progress-dot' + (i === 0 ? ' active' : '');
      progressContainer.appendChild(dot);
    });

    // Wrap questions in cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'quiz-cards-container';

    // Transform each question into a card
    questions.forEach(function(question, index) {
      const card = document.createElement('div');
      card.className = 'quiz-card' + (index === 0 ? ' active' : '');
      card.dataset.index = index;

      // Add card number
      const cardNumber = document.createElement('div');
      cardNumber.className = 'quiz-card-number';
      cardNumber.textContent = (isEnglish ? 'Question ' : 'Pergunta ') + (index + 1) + ' / ' + questions.length;
      card.appendChild(cardNumber);

      // Move question content to card
      const questionText = question.querySelector('.quiz-question-text');
      const optionsContainer = question.querySelector('.quiz-options');

      if (questionText) {
        const text = document.createElement('p');
        text.className = 'quiz-question-text';
        text.textContent = questionText.textContent.replace(/^\d+\.\s*/, '');
        card.appendChild(text);
      }

      if (optionsContainer) {
        const newOptions = document.createElement('div');
        newOptions.className = 'quiz-options';

        const options = optionsContainer.querySelectorAll('.quiz-option');
        options.forEach(function(opt) {
          const newOpt = document.createElement('label');
          newOpt.className = 'quiz-option';
          const input = opt.querySelector('input');
          const textContent = opt.textContent.trim();

          newOpt.innerHTML = '<input type="radio" name="q' + index + '" value="' + (input ? input.value : '') + '"><span>' + textContent + '</span>';

          // Handle option click - auto advance
          newOpt.addEventListener('click', function() {
            // Select this option
            newOptions.querySelectorAll('.quiz-option').forEach(function(o) {
              o.classList.remove('selected');
            });
            newOpt.classList.add('selected');

            // Wait a moment for visual feedback then advance
            setTimeout(function() {
              advanceToNext(index);
            }, 400);
          });

          newOptions.appendChild(newOpt);
        });

        card.appendChild(newOptions);
      }

      cardsContainer.appendChild(card);
    });

    // Clear and rebuild quiz container
    container.innerHTML = '';
    container.appendChild(progressContainer);
    container.appendChild(cardsContainer);

    // Advance to next card or complete
    function advanceToNext(fromIndex) {
      const cards = cardsContainer.querySelectorAll('.quiz-card');
      const dots = progressContainer.querySelectorAll('.quiz-progress-dot');

      // Mark current as completed
      cards[fromIndex].classList.remove('active');
      cards[fromIndex].classList.add('completed');
      dots[fromIndex].classList.remove('active');
      dots[fromIndex].classList.add('completed');

      const nextIndex = fromIndex + 1;

      if (nextIndex < cards.length) {
        // Show next card
        cards[nextIndex].classList.add('active');
        dots[nextIndex].classList.add('active');
        currentIndex = nextIndex;
      } else {
        // Quiz complete - show completion animation
        showQuizComplete();
      }
    }

    function showQuizComplete() {
      mcmTrack(getMcmPageTitle() + ': quiz', 'Quiz concluído');

      const completeHtml = `
        <div class="quiz-complete">
          <div class="quiz-complete-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h3 class="quiz-complete-title">${isEnglish ? 'Perfect!' : 'Perfeito!'}</h3>
          <p class="quiz-complete-text">${isEnglish ? 'Here\'s what we prepared for you...' : 'Aqui está o que preparámos para ti...'}</p>
        </div>
      `;

      container.innerHTML = completeHtml;

      // Reveal hidden content after animation
      setTimeout(function() {
        if (eventReveal) {
          eventReveal.classList.add('visible');
          // Smooth scroll to reveal
          setTimeout(function() {
            eventReveal.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 300);
        }
        // Fade out quiz completion
        setTimeout(function() {
          container.style.opacity = '0';
          container.style.transition = 'opacity 0.5s ease';
          setTimeout(function() {
            container.style.display = 'none';
          }, 500);
        }, 1500);
      }, 800);
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

      // Track in Google Forms
      mcmTrack((eventTitle || 'Evento') + ': contacto', 'Nome: ' + name + '\nEmail: ' + email + '\nTelefone: ' + (phone || 'N/A') + '\nMensagem: ' + (message || 'N/A'));

      // Open user's email client
      window.location.href = mailtoLink;
    });
  }

  // ========================================
  // EVENT PAGE - AUTO-INJECT CONTACT FORM
  // ========================================
  var eventContentEl = document.querySelector('.event-content');
  if (eventContentEl && !document.querySelector('#event-contact-form')) {
    var evtPageTitle = getMcmPageTitle();

    // Inject contact form
    var formWrapper = document.createElement('div');
    formWrapper.id = 'event-form-section';
    formWrapper.style.cssText = 'margin-top: var(--space-lg);';

    formWrapper.innerHTML = isEnglish
      ? '<h2 style="color: var(--gold); margin-bottom: var(--space-md); font-family: var(--font-display); font-size: 1.8rem;">Registration / Contact</h2>' +
        '<form id="event-contact-form" class="contact-form">' +
          '<div class="form-group"><label for="event-name" class="form-label">Name</label><input type="text" id="event-name" class="form-input" required></div>' +
          '<div class="form-group"><label for="event-email" class="form-label">Email</label><input type="email" id="event-email" class="form-input" required></div>' +
          '<div class="form-group"><label for="event-phone" class="form-label">Phone <span style="color:var(--gray)">(optional)</span></label><input type="tel" id="event-phone" class="form-input"></div>' +
          '<div class="form-group"><label for="event-message" class="form-label">Message <span style="color:var(--gray)">(optional)</span></label><textarea id="event-message" class="form-textarea"></textarea></div>' +
          '<button type="submit" class="btn btn-primary form-submit">Register</button>' +
          '<p style="text-align:center;margin-top:var(--space-sm);color:var(--gray);font-size:0.8rem;">Your email client will open with the message pre-filled.</p>' +
        '</form>'
      : '<h2 style="color: var(--gold); margin-bottom: var(--space-md); font-family: var(--font-display); font-size: 1.8rem;">Inscrição / Contacto</h2>' +
        '<form id="event-contact-form" class="contact-form">' +
          '<div class="form-group"><label for="event-name" class="form-label">Nome</label><input type="text" id="event-name" class="form-input" required></div>' +
          '<div class="form-group"><label for="event-email" class="form-label">Email</label><input type="email" id="event-email" class="form-input" required></div>' +
          '<div class="form-group"><label for="event-phone" class="form-label">Telefone <span style="color:var(--gray)">(opcional)</span></label><input type="tel" id="event-phone" class="form-input"></div>' +
          '<div class="form-group"><label for="event-message" class="form-label">Mensagem <span style="color:var(--gray)">(opcional)</span></label><textarea id="event-message" class="form-textarea"></textarea></div>' +
          '<button type="submit" class="btn btn-primary form-submit">Inscrever</button>' +
          '<p style="text-align:center;margin-top:var(--space-sm);color:var(--gray);font-size:0.8rem;">O seu cliente de email será aberto com a mensagem pré-preenchida.</p>' +
        '</form>';

    eventContentEl.appendChild(formWrapper);

    // Redirect existing "Inscrever"/"Register" button to scroll to the form
    var existingRegBtn = eventContentEl.querySelector('.event-details .btn');
    if (existingRegBtn) {
      existingRegBtn.href = '#event-form-section';
      existingRegBtn.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector('#event-form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // Attach submit handler to injected form
    var injectedForm = document.querySelector('#event-contact-form');
    if (injectedForm) {
      injectedForm.addEventListener('submit', function(e) {
        e.preventDefault();

        var name = injectedForm.querySelector('#event-name').value.trim();
        var email = injectedForm.querySelector('#event-email').value.trim();
        var phone = injectedForm.querySelector('#event-phone') ? injectedForm.querySelector('#event-phone').value.trim() : '';
        var message = injectedForm.querySelector('#event-message') ? injectedForm.querySelector('#event-message').value.trim() : '';
        var title = evtPageTitle || 'Evento';

        var emailBody = 'Nome: ' + name + '\nEmail: ' + email;
        if (phone) emailBody += '\nTelefone: ' + phone;
        emailBody += '\n\nEvento: ' + title;
        if (message) emailBody += '\n\nMensagem: ' + message;
        emailBody += '\n\n---\nEnviado através do formulário do evento no website McMinsky';

        var subject = isEnglish ? 'Event Registration: ' + title : 'Inscrição Evento: ' + title;
        var mailtoLink = 'mailto:mcminsky@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(emailBody);

        // Track in Google Forms
        mcmTrack(title + ': contacto', 'Nome: ' + name + '\nEmail: ' + email + '\nTelefone: ' + (phone || 'N/A') + '\nMensagem: ' + (message || 'N/A'));

        // Open email client
        window.location.href = mailtoLink;
      });
    }
  }

  // ========================================
  // ARTICLES LOADER (from manifest.json)
  // ========================================
  const articlesContainer = document.querySelector('#articles-container');

  if (articlesContainer) {
    const articlesBasePath = isEnglish ? '../articles/' : 'articles/';
    const articlesManifestPath = articlesBasePath + 'manifest.json';
    const articlesHtmlPath = isEnglish ? articlesBasePath + 'en/' : articlesBasePath;

    fetch(articlesManifestPath)
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to load articles manifest');
        return response.json();
      })
      .then(function(slugs) {
        // Fetch metadata from each article HTML
        const fetchPromises = slugs.map(function(slug) {
          return fetch(articlesHtmlPath + slug + '.html')
            .then(function(response) {
              if (!response.ok) throw new Error('Failed to load article: ' + slug);
              return response.text();
            })
            .then(function(html) {
              // Parse HTML to extract meta tags
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');

              const title = doc.querySelector('title') ? doc.querySelector('title').textContent.replace(' | McMinsky', '') : slug;
              const description = doc.querySelector('meta[name="description"]') ? doc.querySelector('meta[name="description"]').getAttribute('content') : '';
              const category = doc.querySelector('meta[name="category"]') ? doc.querySelector('meta[name="category"]').getAttribute('content') : '';
              const readingTime = doc.querySelector('meta[name="reading-time"]') ? doc.querySelector('meta[name="reading-time"]').getAttribute('content') : '5';
              const image = doc.querySelector('meta[property="og:image"]') ? doc.querySelector('meta[property="og:image"]').getAttribute('content') : '';

              return {
                slug: slug,
                title: title,
                description: description,
                category: category,
                readingTime: readingTime,
                image: image
              };
            });
        });

        return Promise.all(fetchPromises);
      })
      .then(function(articles) {
        renderArticles(articles);
      })
      .catch(function(error) {
        console.error('Error loading articles:', error);
      });
  }

  function renderArticles(articles) {
    if (!articlesContainer) return;

    articles.forEach(function(article) {
      const articlesHtmlPath = isEnglish ? '../articles/en/' : 'articles/';
      const readTimeText = isEnglish ? article.readingTime + ' min read' : article.readingTime + ' min leitura';

      const card = document.createElement('a');
      card.href = articlesHtmlPath + article.slug + '.html';
      card.className = 'article-card';

      card.innerHTML = `
        <div class="article-image">
          <img src="${article.image}" alt="${article.title}" loading="lazy">
        </div>
        <div class="article-body">
          <span class="article-category">${article.category}</span>
          <h3 class="article-title">${article.title}</h3>
          <p class="article-excerpt">${article.description}</p>
          <div class="article-meta">
            <span>${article.category}</span>
            <span>${readTimeText}</span>
          </div>
        </div>
      `;

      articlesContainer.appendChild(card);
    });
  }

  // ========================================
  // PAGES/TOOLS LOADER (from manifest.json)
  // ========================================
  const pagesContainer = document.querySelector('#pages-container');

  if (pagesContainer) {
    const pagesBasePath = isEnglish ? '../pages/' : 'pages/';
    const pagesManifestPath = pagesBasePath + 'manifest.json';
    const pagesHtmlPath = isEnglish ? pagesBasePath + 'en/' : pagesBasePath;

    fetch(pagesManifestPath)
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to load pages manifest');
        return response.json();
      })
      .then(function(slugs) {
        // Fetch metadata from each page HTML
        const fetchPromises = slugs.map(function(slug) {
          return fetch(pagesHtmlPath + slug + '.html')
            .then(function(response) {
              if (!response.ok) throw new Error('Failed to load page: ' + slug);
              return response.text();
            })
            .then(function(html) {
              // Parse HTML to extract meta tags
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');

              const title = doc.querySelector('title') ? doc.querySelector('title').textContent.replace(' | McMinsky', '') : slug;
              const description = doc.querySelector('meta[name="short-description"]') ? doc.querySelector('meta[name="short-description"]').getAttribute('content') : '';
              const icon = doc.querySelector('meta[name="icon"]') ? doc.querySelector('meta[name="icon"]').getAttribute('content') : slug.charAt(0).toUpperCase();

              return {
                slug: slug,
                title: title,
                description: description,
                icon: icon
              };
            });
        });

        return Promise.all(fetchPromises);
      })
      .then(function(pages) {
        renderPages(pages);
      })
      .catch(function(error) {
        console.error('Error loading pages:', error);
      });
  }

  function renderPages(pages) {
    if (!pagesContainer) return;

    pages.forEach(function(page) {
      const pagesHtmlPath = isEnglish ? '../pages/en/' : 'pages/';

      const item = document.createElement('a');
      item.href = pagesHtmlPath + page.slug + '.html';
      item.className = 'page-item';

      item.innerHTML = `
        <div class="page-icon">${page.icon}</div>
        <div class="page-info">
          <h3>${page.title}</h3>
          <p>${page.description}</p>
        </div>
      `;

      pagesContainer.appendChild(item);
    });
  }

})();
