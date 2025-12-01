// Santa Vegas Widget - основная логика
;(function () {
  'use strict'

  // ============================================
  // КОНСТАНТЫ И КОНФИГУРАЦИЯ
  // ============================================

  // Состояния виджета
  const WIDGET_STATES = {
    DEFAULT: 'default', // Группа 1: стандартный режим (со звездой)
    ACTIVE_EASTER_EGG: 'active', // Группа 2: активная пасхалка (с Сантой)
    PARTY_NO_SANTA: 'party-no-santa', // Группа 3: пойманная пасхалка (без Санты)
  }

  // Ключи хранилища
  const STORAGE_KEYS = {
    SANTA_CLICKED: 'santaClicked',
  }

  // URL параметры
  const URL_PARAMS = {
    SHOW_SANTA: 'showSanta',
  }

  // Сообщения для postMessage
  const EVENTS = {
    SOUND_ON: {
      type: 'sound_on',
      source: 'santa-vegas-widget',
    },
    SOUND_OFF: {
      type: 'sound_off',
      source: 'santa-vegas-widget',
    },
    SANTA_CLICKED: {
      type: 'santaClicked',
      source: 'santa-vegas-widget',
    },
    HIDE_STAR_DEBUG_ZONE: {
      type: 'hideStarDebugZone',
      source: 'santa-vegas-widget',
    },
    STAR_CLICKED: {
      type: 'starClicked',
      source: 'santa-vegas-widget',
    },
    ANIMATION_ENDED: {
      type: 'animationEnded',
      source: 'santa-vegas-widget',
    },
  }

  // Длительность анимации Санты (мс)
  const SANTA_ANIMATION_DURATION = 14000 // 14 секунд

  // ============================================
  // ЭЛЕМЕНТЫ DOM
  // ============================================

  // Элементы DOM
  const soundToggle = document.getElementById('soundToggle')
  const soundIcon = document.getElementById('soundIcon')
  const bgMusic = document.getElementById('bgMusic')
  const santaAnimationWrapper = document.getElementById('santaAnimationWrapper')
  const santaAnimation = document.getElementById('santaAnimation')
  const starLayer = document.getElementById('starLayer')
  const starClickZone = document.getElementById('starClickZone')
  const lampsLayer = document.getElementById('lampsLayer')
  const partyLight = document.getElementById('partyLight')
  const baseLogoLayer = document.getElementById('baseLogoLayer')

  // Элементы кликабельных зон для Санты
  const santaClickZoneBottom = document.getElementById('santaClickZoneBottom')
  const santaClickZoneTop = document.getElementById('santaClickZoneTop')

  // Состояние
  let isSoundPlaying = false
  let isAnimationPlaying = false
  let isStarClicked = false
  let showDebugZones = false // Флаг для показа визуализации кликабельных зон
  let zoneTimers = [] // Массив таймеров для управления зонами

  // ============================================
  // УПРАВЛЕНИЕ КЛИКАБЕЛЬНЫМИ ЗОНАМИ ДЛЯ САНТЫ
  // ============================================

  /**
   * Управление видимостью кликабельных зон для Санты
   * Нижняя зона: 0-5 секунд
   * Верхняя зона: 5.5-14 секунд (с задержкой 500мс)
   */
  function manageSantaClickZones() {
    // Очищаем все предыдущие таймеры
    clearAllZoneTimers()

    // Скрываем обе зоны по умолчанию
    if (santaClickZoneBottom) {
      santaClickZoneBottom.style.display = 'none'
    }
    if (santaClickZoneTop) {
      santaClickZoneTop.style.display = 'none'
    }

    // Показываем нижнюю зону сразу (0-5 секунд)
    if (santaClickZoneBottom) {
      santaClickZoneBottom.style.display = 'block'
      // Скрываем нижнюю зону через 5 секунд
      const hideBottomTimer = setTimeout(() => {
        if (santaClickZoneBottom) {
          santaClickZoneBottom.style.display = 'none'
        }
      }, 5000)
      zoneTimers.push(hideBottomTimer)
    }

    // Показываем верхнюю зону через 5.5 секунд (с задержкой 500мс)
    const showTopTimer = setTimeout(() => {
      if (santaClickZoneTop && isAnimationPlaying) {
        santaClickZoneTop.style.display = 'block'
      }
    }, 5500)
    zoneTimers.push(showTopTimer)

    // Скрываем верхнюю зону в конце анимации
    const hideTopTimer = setTimeout(() => {
      if (santaClickZoneTop) {
        santaClickZoneTop.style.display = 'none'
      }
    }, SANTA_ANIMATION_DURATION)
    zoneTimers.push(hideTopTimer)
  }

  /**
   * Очистка всех таймеров зон
   */
  function clearAllZoneTimers() {
    zoneTimers.forEach(timer => clearTimeout(timer))
    zoneTimers = []
  }

  /**
   * Обновление визуализации зон для debug режима
   */
  function updateZonesVisualization() {
    if (santaClickZoneBottom) {
      if (showDebugZones) {
        santaClickZoneBottom.style.border = '2px solid rgba(255, 0, 0, 0.8)'
        santaClickZoneBottom.style.backgroundColor = 'rgba(255, 0, 0, 0.2)'
      } else {
        santaClickZoneBottom.style.border = 'none'
        santaClickZoneBottom.style.backgroundColor = 'transparent'
      }
    }
    if (santaClickZoneTop) {
      if (showDebugZones) {
        santaClickZoneTop.style.border = '2px solid rgba(255, 0, 0, 0.8)'
        santaClickZoneTop.style.backgroundColor = 'rgba(255, 0, 0, 0.2)'
      } else {
        santaClickZoneTop.style.border = 'none'
        santaClickZoneTop.style.backgroundColor = 'transparent'
      }
    }
  }

  // Обработка клика на звезду
  function handleStarClick() {
    console.log('handleStarClick вызвана, isStarClicked:', isStarClicked)

    if (isStarClicked) {
      console.log('Звезда уже была нажата')
      return
    }

    isStarClicked = true
    console.log('⭐ Звезда нажата! Активируем праздничный режим и Санту')

    // Сразу скрываем кликабельную зону звезды при клике
    if (starClickZone) {
      console.log('Скрываем starClickZone:', starClickZone)
      // Используем setProperty с important, чтобы переопределить любые CSS правила
      starClickZone.style.setProperty('display', 'none')
      console.log('Кликабельная зона звезды скрыта')
    } else {
      console.warn('starClickZone не найден при попытке скрыть')
    }

    // Скрываем debug overlay на тестовой странице (если есть)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(EVENTS.HIDE_STAR_DEBUG_ZONE, '*')
      // Уведомляем родителя о клике на звезду (для скрытия чекбокса)
      window.parent.postMessage(EVENTS.STAR_CLICKED, '*')
    }

    // 1. Скрыть звезду с fade эффектом
    if (starLayer) {
      starLayer.classList.add('fade-out')
      console.log('Начинаем fade-out для звезды')

      setTimeout(() => {
        starLayer.style.display = 'none'
        console.log('Звезда скрыта после fade-out')
      }, 500) // Ждем окончания fade-out анимации
    }

    // 2. Сменить гирлянды на праздничные
    if (lampsLayer) {
      lampsLayer.src = 'img/lamps_827x256_party.svg'
      console.log('Гирлянды заменены на праздничные')
    }

    // 3. Показать праздничную подсветку
    if (partyLight) {
      partyLight.style.display = 'block'
      console.log('Праздничная подсветка показана')
    }

    // 4. Запустить анимацию Санты
    setTimeout(() => {
      console.log('Запускаем анимацию Санты через 500мс')
      startSantaAnimation()
    }, 500)
  }

  /**
   * Проверка состояния виджета при загрузке
   *
   * Виджет может работать в двух режимах:
   * 1. Напрямую (не в iframe) - параметры в URL виджета: index.html?showSanta=false
   * 2. В iframe - параметры могут быть:
   *    - В URL виджета: index.html?showSanta=true или index.html?showSanta=false (если родитель передал их в src iframe)
   *    - В URL родительской страницы: parent.html?showSanta=true или parent.html?showSanta=false (если родитель не передал их в src iframe)
   *
   * Логика: сначала проверяем URL виджета, затем (если не найдено и виджет в iframe) - URL родителя
   */
  function checkWidgetState() {
    // Проверяем параметры из собственного URL виджета
    const urlParams = new URLSearchParams(window.location.search)
    let showSantaParam = urlParams.get(URL_PARAMS.SHOW_SANTA)

    // Если параметр не найден и виджет в iframe, пытаемся прочитать из URL родительской страницы
    if (!showSantaParam && window.parent && window.parent !== window) {
      try {
        const parentUrlParams = new URLSearchParams(window.parent.location.search)
        showSantaParam = parentUrlParams.get(URL_PARAMS.SHOW_SANTA)
        console.log('Параметр showSanta прочитан из URL родительской страницы:', showSantaParam)
      } catch (error) {
        // Если нет доступа к URL родителя (CORS), игнорируем ошибку
        console.log('Нет доступа к URL родительской страницы (CORS)')
      }
    }

    const santaCaught = localStorage.getItem(STORAGE_KEYS.SANTA_CLICKED)

    console.log('Проверка состояния виджета:')
    console.log('- showSanta параметр:', showSantaParam)
    console.log('- santaClicked в localStorage:', santaCaught)

    // Случай 1: ?showSanta=false ИЛИ Санта уже была поймана (Группа 3)
    if (showSantaParam === 'false' || santaCaught === 'true') {
      console.log('Режим: Праздничная версия БЕЗ Санты (Группа 3)')
      activatePartyMode(false)
      return WIDGET_STATES.PARTY_NO_SANTA
    }

    // Случай 2: Стандартный режим (Группа 1)
    console.log('Режим: Стандартный (со звездой) - Группа 1')
    return WIDGET_STATES.DEFAULT
  }

  // Функция для активации группы 2 (активная пасхалка) через postMessage
  function activateGroup2() {
    console.log('Активация Группы 2 через postMessage')
    isStarClicked = true
    activatePartyMode(true)
    startSantaAnimation()
    // Зоны будут управляться через manageSantaClickZones() в startSantaAnimation()
  }

  // Активировать праздничный режим
  function activatePartyMode(showSanta = false) {
    console.log('Активация праздничного режима, showSanta:', showSanta)

    // Скрыть звезту
    if (starLayer) {
      starLayer.style.display = 'none'
    }
    if (starClickZone) {
      starClickZone.style.display = 'none'
    }

    // Сменить гирлянды на праздничные
    if (lampsLayer) {
      lampsLayer.src = 'img/lamps_827x256_party.svg'
    }

    // Показать праздничную подсветку
    if (partyLight) {
      partyLight.style.display = 'block'
    }
  }

  // Инициализация при загрузке
  function init() {
    // Скрываем Санту при загрузке
    santaAnimationWrapper.style.display = 'none'

    // Скрываем кликабельные зоны Санты при загрузке
    if (santaClickZoneBottom) {
      santaClickZoneBottom.style.display = 'none'
    }
    if (santaClickZoneTop) {
      santaClickZoneTop.style.display = 'none'
    }

    // Проверяем состояние виджета (localStorage + URL параметры)
    const widgetState = checkWidgetState()
    console.log('Состояние виджета при инициализации:', widgetState)

    // Настройка обработчиков событий
    soundToggle.addEventListener('click', toggleSound)

    // Обработчик для клика на звезду (только если в стандартном режиме)
    if (widgetState === WIDGET_STATES.DEFAULT && starClickZone) {
      starClickZone.addEventListener('click', function (event) {
        console.log('Клик по starClickZone зарегистрирован', event)
        handleStarClick()
      })
      console.log('Обработчик клика на звезду добавлен, starClickZone:', starClickZone)
    } else {
      console.warn('Не удалось добавить обработчик звезды:', {
        widgetState,
        starClickZone: !!starClickZone,
      })
    }

    // Обработчики кликов на зоны Санты
    if (santaClickZoneBottom) {
      santaClickZoneBottom.addEventListener('click', handleSantaClick)
    }
    if (santaClickZoneTop) {
      santaClickZoneTop.addEventListener('click', handleSantaClick)
    }

    // Обработчик postMessage от родительского окна
    window.addEventListener('message', function (event) {
      // Проверяем, что сообщение от родителя
      if (event.data && typeof event.data === 'object') {
        // Обработка команды показа/скрытия debug зон
        if (event.data.type === 'showDebugZones') {
          showDebugZones = event.data.value === true
          console.log('showDebugZones установлен в:', showDebugZones)
          updateZonesVisualization()
        }
        // Обработка команды активации группы 2 (активная пасхалка)
        if (event.data.type === 'activateGroup2') {
          console.log('Получена команда активации Группы 2')
          activateGroup2()
        }
      }
    })

    console.log('Инициализация завершена')
  }

  // Переключение звука (только музыка, анимация Санты НЕ запускается)
  function toggleSound() {
    console.log('toggleSound вызвана, isSoundPlaying:', isSoundPlaying)

    if (isSoundPlaying) {
      // Выключаем звук
      bgMusic.pause()
      bgMusic.currentTime = 0
      isSoundPlaying = false
      soundIcon.src = 'img/sound_off.svg'
      soundIcon.alt = 'Звук вимкнено'
      console.log('Звук выключен')

      // Отправляем событие sound_off родителю
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(EVENTS.SOUND_OFF, '*')
      }
    } else {
      // Включаем звук (с атрибутом loop - будет зацикливаться автоматически)
      console.log('Пытаемся включить звук')
      bgMusic
        .play()
        .then(() => {
          isSoundPlaying = true
          soundIcon.src = 'img/sound_on.svg'
          soundIcon.alt = 'Звук увімкнено'
          console.log('Звук включен')

          // Отправляем событие sound_on родителю
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(EVENTS.SOUND_ON, '*')
          }
        })
        .catch(err => {
          console.error('Ошибка воспроизведения звука:', err)
        })
    }
  }

  // Запуск анимации Санты
  function startSantaAnimation() {
    console.log('startSantaAnimation вызвана')

    if (isAnimationPlaying) {
      console.log('Анимация уже играет')
      return
    }

    // Проверяем, не была ли Санта уже поймана
    const santaCaught = localStorage.getItem(STORAGE_KEYS.SANTA_CLICKED)
    if (santaCaught === 'true') {
      console.log('Санта уже была поймана ранее')
      return
    }

    isAnimationPlaying = true
    console.log('Запускаем анимацию')

    // Показываем wrapper с анимацией
    santaAnimationWrapper.style.display = 'block'
    santaAnimationWrapper.style.opacity = '1'

    // Перезагружаем SVG для перезапуска анимации
    const currentSrc = santaAnimation.data
    console.log('Перезагружаем SVG:', currentSrc)
    santaAnimation.data = ''

    setTimeout(() => {
      santaAnimation.data = currentSrc.split('?')[0] + '?v=' + Date.now()
      console.log('SVG перезагружен')
    }, 10)

    // Запускаем управление кликабельными зонами
    manageSantaClickZones()
    updateZonesVisualization()

    // Скрываем анимацию после завершения (полная длительность SVG)
    setTimeout(() => {
      if (isAnimationPlaying) {
        // Проверяем, что анимация все еще активна (не была остановлена кликом)
        handleAnimationEnd()
      }
    }, SANTA_ANIMATION_DURATION)
  }

  // Обработка окончания анимации
  function handleAnimationEnd() {
    console.log('handleAnimationEnd вызвана')

    // Очищаем все таймеры зон
    clearAllZoneTimers()

    // Скрываем обе зоны
    if (santaClickZoneBottom) {
      santaClickZoneBottom.style.display = 'none'
    }
    if (santaClickZoneTop) {
      santaClickZoneTop.style.display = 'none'
    }

    // Скрываем wrapper
    console.log('Скрываем wrapper и кликабельные зоны')
    santaAnimationWrapper.style.display = 'none'
    santaAnimationWrapper.style.opacity = '0'

    isAnimationPlaying = false

    // Уведомляем родителя о завершении анимации
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(EVENTS.ANIMATION_ENDED, '*')
    }
  }

  // Обработка клика на Санту (в кликабельной зоне)
  function handleSantaClick(event) {
    console.log('handleSantaClick вызвана, isAnimationPlaying:', isAnimationPlaying)

    if (!isAnimationPlaying) {
      console.log('Клик игнорирован - анимация не играет')
      return
    }

    if (event) {
      event.stopPropagation()
    }

    console.log('🎅 Санту поймали! Обрабатываем клик')

    // Сохраняем в localStorage
    localStorage.setItem(STORAGE_KEYS.SANTA_CLICKED, 'true')
    console.log('Сохранено в localStorage: santaClicked = true')

    // Очищаем все таймеры зон
    clearAllZoneTimers()

    // Скрываем обе зоны
    if (santaClickZoneBottom) {
      santaClickZoneBottom.style.display = 'none'
    }
    if (santaClickZoneTop) {
      santaClickZoneTop.style.display = 'none'
    }

    // Добавляем класс для анимации вспышки
    santaAnimationWrapper.classList.add('clicked')

    // Отправляем сообщение родительскому окну
    if (window.parent && window.parent !== window) {
      console.log('Отправляем santaClicked родителю')
      window.parent.postMessage(EVENTS.SANTA_CLICKED, '*')
    } else {
      console.log('Виджет открыт напрямую - алерт для теста')
      alert('🎅 Вы поймали Санту!')
    }

    // Удаляем Санту после анимации вспышки
    setTimeout(() => {
      console.log('Убираем Санту после вспышки')
      santaAnimationWrapper.classList.remove('clicked')
      handleAnimationEnd()
    }, 500)
  }

  // Запуск инициализации после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
