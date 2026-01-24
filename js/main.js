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
  // LANGUAGE DETECTION (for dynamic loaders)
  // ========================================
  const isEnglish = getCurrentLang() === 'en';

  // ========================================
  // EVENTS LOADER (from manifest.json)
  // ========================================
  const eventsContainer = document.querySelector('#events-container');

  // Determine the base path for events and manifest
  // Manifest is always in /events/, but event pages are in /events/ (PT) or /events/en/ (EN)
  const manifestBasePath = isEnglish ? '../events/' : 'events/';
  const eventsBasePath = isEnglish ? '../events/en/' : 'events/';
  const manifestPath = manifestBasePath + 'manifest.json';

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

      // Open user's email client
      window.location.href = mailtoLink;
    });
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
