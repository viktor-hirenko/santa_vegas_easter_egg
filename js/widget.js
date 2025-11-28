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

  // Состояние
  let isSoundPlaying = false
  let isAnimationPlaying = false
  let isStarClicked = false
  let showDebugZones = false // Флаг для показа визуализации кликабельных зон
  let resizeTimeout = null // Таймер для debounce resize события

  // ============================================
  // SVG КЛИКАБЕЛЬНЫЕ ЗОНЫ
  // ============================================

  /**
   * КОНФИГУРАЦИЯ КЛИКАБЕЛЬНЫХ ЗОН ВНУТРИ SVG
   *
   * Каждая зона соответствует определенной части анимации Санты.
   * Зона появляется только когда Санта находится в соответствующей позиции.
   *
   * Параметры каждой зоны:
   * - id: ID элемента в SVG файле (группа анимации Санты)
   * - paddingX: Отступ по горизонтали (слева и справа) в пикселях SVG
   * - paddingY: Отступ по вертикали (сверху и снизу) в пикселях SVG
   * - startTime: Время начала показа зоны в миллисекундах (от начала анимации)
   * - endTime: Время окончания показа зоны в миллисекундах (от начала анимации)
   */
  const SVG_CLICK_TARGETS = [
    {
      id: 'eVIMzGcw2oK2_to', // ID группы анимации: нижняя траектория Санты
      paddingX: 110, // Отступ слева и справа: 100px
      paddingY: 80, // Отступ сверху и снизу: 70px
      startTime: 0, // Зона активна с 0 мс (начало анимации)
      endTime: 5100, // Зона активна до 5100 мс (5.1 секунд)
    },
    {
      id: 'eVIMzGcw2oK6_to', // ID группы анимации: верхняя траектория Санты
      paddingX: 110, // Отступ слева и справа: 100px
      paddingY: 80, // Отступ сверху и снизу: 70px
      startTime: 5500, // Зона активна с 5500 мс (5.5 секунд)
      endTime: 10550, // Зона активна до 10550 мс (10.55 секунд)
    },
    {
      id: 'eVIMzGcw2oK4_to', // ID группы анимации: правый выход Санты
      paddingX: 70, // Отступ слева и справа: 50px
      paddingY: 70, // Отступ сверху и снизу: 50px
      startTime: 11000, // Зона активна с 11000 мс (11 секунд)
      endTime: 12500, // Зона активна до 12500 мс (12.5 секунд)
    },
    {
      id: 'eVIMzGcw2oK5_to', // ID группы анимации: левый выход Санты
      paddingX: 70, // Отступ слева и справа: 50px
      paddingY: 70, // Отступ сверху и снизу: 50px
      startTime: 12500, // Зона активна с 12500 мс (12.5 секунд)
      endTime: SANTA_ANIMATION_DURATION, // Зона активна до конца анимации
    },
  ]

  // Константа для создания SVG элементов
  const SVG_NS = 'http://www.w3.org/2000/svg'

  // Массив созданных кликабельных зон (SVG <rect> элементы)
  let svgClickOverlays = []

  // Время начала анимации Санты (для расчета текущего времени)
  let santaAnimationStartTime = null

  // ID анимации обновления зон (для остановки через cancelAnimationFrame)
  let santaZoneAnimationId = null

  // Обработчик для пересоздания зон после перезагрузки SVG (для удаления при необходимости)
  let svgReloadHandler = null

  /**
   * ПОЛУЧЕНИЕ ДОСТУПА К SVG ДОКУМЕНТУ
   *
   * Возвращает contentDocument элемента <object>, который содержит SVG.
   * Это нужно для поиска элементов внутри SVG и создания кликабельных зон.
   */
  function getSvgDocument() {
    if (!santaAnimation) return null
    return santaAnimation.contentDocument || null
  }

  /**
   * ОЧИСТКА КЛИКАБЕЛЬНЫХ ЗОН
   *
   * Удаляет все созданные зоны из DOM:
   * 1. Удаляет обработчики событий
   * 2. Удаляет элементы из SVG
   * 3. Очищает массив svgClickOverlays
   *
   * Вызывается перед созданием новых зон (в rebuildSvgClickZones).
   */
  function cleanupSvgClickZones() {
    svgClickOverlays.forEach(overlay => {
      // Удаляем обработчик клика
      overlay.removeEventListener('click', handleSvgZoneClick)
      // Удаляем элемент из DOM
      overlay.remove()
    })
    // Очищаем массив
    svgClickOverlays = []
  }

  /**
   * СОЗДАНИЕ КЛИКАБЕЛЬНЫХ ЗОН ВНУТРИ SVG
   *
   * Эта функция:
   * 1. Находит элементы в SVG по ID из конфигурации
   * 2. Получает их границы (bounding box)
   * 3. Создает прямоугольники (<rect>) с отступами (padding)
   * 4. Добавляет стили для визуализации и обработчики кликов
   *
   * РАСЧЕТ РАЗМЕРОВ И СМЕЩЕНИЙ:
   * - x = bbox.x - paddingX (смещаем влево на paddingX)
   * - y = bbox.y - paddingY (смещаем вверх на paddingY)
   * - width = bbox.width + paddingX * 2 (ширина элемента + padding слева + padding справа)
   * - height = bbox.height + paddingY * 2 (высота элемента + padding сверху + padding снизу)
   */
  function rebuildSvgClickZones() {
    if (!santaAnimation) return

    // Очищаем предыдущие зоны (если были)
    cleanupSvgClickZones()

    // Получаем доступ к SVG документу через contentDocument
    const doc = getSvgDocument()
    if (!doc || !doc.documentElement) {
      console.warn('[SantaWidget] contentDocument недоступен')
      return
    }

    // Определяем, мобильный ли это экран (ширина контейнера <= 600px)
    const containerWidth = santaAnimationWrapper?.offsetWidth || window.innerWidth
    const isMobile = containerWidth <= 600
    // Множитель для padding на мобильных (увеличиваем на 50%)
    const paddingMultiplier = isMobile ? 1.7 : 1

    // Проходим по каждой зоне из конфигурации
    SVG_CLICK_TARGETS.forEach(config => {
      // Ищем элемент в SVG по ID (это группа анимации Санты)
      const target = doc.getElementById(config.id)
      if (!target) {
        console.warn(`[SantaWidget] Не найден слой ${config.id} в SVG`)
        return
      }

      try {
        // ПОЛУЧЕНИЕ ГРАНИЦ ЭЛЕМЕНТА
        // getBBox() возвращает объект с координатами и размерами:
        // { x, y, width, height } - все в пикселях SVG
        const bbox = target.getBBox()

        // ПОЛУЧЕНИЕ ОТСТУПОВ ИЗ КОНФИГУРАЦИИ С УЧЕТОМ МОБИЛЬНЫХ УСТРОЙСТВ
        const paddingX = (config.paddingX ?? 0) * paddingMultiplier // Отступ по горизонтали (px)
        const paddingY = (config.paddingY ?? 0) * paddingMultiplier // Отступ по вертикали (px)

        // СОЗДАНИЕ ПРЯМОУГОЛЬНИКА-ЗОНЫ
        const overlay = doc.createElementNS(SVG_NS, 'rect')

        // РАСЧЕТ ПОЗИЦИИ (X, Y) - СМЕЩЕНИЕ ВЛЕВО И ВВЕРХ НА PADDING
        // x: смещаем влево на paddingX, чтобы зона была больше элемента
        overlay.setAttribute('x', bbox.x - paddingX)
        // y: смещаем вверх на paddingY, чтобы зона была больше элемента
        overlay.setAttribute('y', bbox.y - paddingY)

        // РАСЧЕТ ШИРИНЫ - ДОБАВЛЯЕМ PADDING СЛЕВА И СПРАВА
        // width: ширина элемента + padding слева (paddingX) + padding справа (paddingX)
        overlay.setAttribute('width', bbox.width + paddingX * 2)

        // РАСЧЕТ ВЫСОТЫ - ДОБАВЛЯЕМ PADDING СВЕРХУ И СНИЗУ
        // height: высота элемента + padding сверху (paddingY) + padding снизу (paddingY)
        overlay.setAttribute('height', bbox.height + paddingY * 2)

        // Скругление углов для визуализации
        overlay.setAttribute('rx', 200)
        overlay.setAttribute('ry', 200)

        // ПРОВЕРКА: показывать ли визуализацию зон (управляется через postMessage)
        if (showDebugZones) {
          // Визуализация для отладки (красные полупрозрачные прямоугольники)
          overlay.style.fill = 'rgba(255, 0, 0, 0.3)' // Красный фон, 30% прозрачности
          overlay.style.stroke = 'rgba(255, 0, 0, 0.8)' // Красная обводка, 80% непрозрачности
          overlay.style.strokeWidth = '2' // Толщина обводки: 2px
          // Если debug включен - зоны сразу видны и активны
          overlay.style.display = 'block'
          overlay.style.pointerEvents = 'auto'
        } else {
          // Без визуализации (прозрачные зоны)
          overlay.style.fill = 'transparent'
          overlay.style.stroke = 'none'
          // СОСТОЯНИЕ ПО УМОЛЧАНИЮ: зона скрыта и неактивна
          overlay.style.pointerEvents = 'none' // Не реагирует на клики
          overlay.style.display = 'none' // Скрыта
        }
        overlay.style.cursor = 'pointer' // Курсор-указатель при наведении

        // Сохраняем данные для управления зоной
        overlay.dataset.santaZone = config.id // ID зоны
        overlay.dataset.startTime = config.startTime // Время начала показа
        overlay.dataset.endTime = config.endTime // Время окончания показа

        // ОБРАБОТЧИК КЛИКА
        overlay.addEventListener('click', handleSvgZoneClick)

        // ВСТАВЛЯЕМ ЗОНУ В SVG (внутрь целевого элемента)
        target.appendChild(overlay)

        // Сохраняем ссылку на зону для управления
        svgClickOverlays.push(overlay)
      } catch (error) {
        console.error('[SantaWidget] Не удалось создать кликабельную зону', config.id, error)
      }
    })

    // Зоны созданы, но скрыты по умолчанию (display: none)
    // Они будут показаны через startSvgZonesAnimation() в нужное время
  }

  /**
   * ОБНОВЛЕНИЕ ВИЗУАЛИЗАЦИИ ЗОН БЕЗ ПЕРЕСОЗДАНИЯ
   *
   * Эта функция обновляет только стили визуализации (fill/stroke) существующих зон,
   * не пересоздавая их. Это предотвращает изменение размеров зон при включении/выключении
   * debug во время анимации.
   */
  function updateSvgZonesVisualization() {
    svgClickOverlays.forEach(overlay => {
      if (showDebugZones) {
        // Визуализация для отладки (красные полупрозрачные прямоугольники)
        overlay.style.fill = 'rgba(255, 0, 0, 0.3)' // Красный фон, 30% прозрачности
        overlay.style.stroke = 'rgba(255, 0, 0, 0.8)' // Красная обводка, 80% непрозрачности
        overlay.style.strokeWidth = '2' // Толщина обводки: 2px
      } else {
        // Без визуализации (прозрачные зоны)
        overlay.style.fill = 'transparent'
        overlay.style.stroke = 'none'
      }
    })
  }

  /**
   * ОБНОВЛЕНИЕ ВИДИМОСТИ И АКТИВНОСТИ ЗОН В ЗАВИСИМОСТИ ОТ ВРЕМЕНИ АНИМАЦИИ
   *
   * Эта функция вызывается каждый кадр (через requestAnimationFrame) и проверяет,
   * какие зоны должны быть видны в текущий момент времени.
   *
   * ЛОГИКА:
   * 1. Вычисляем текущее время анимации (сколько мс прошло с начала)
   * 2. Для каждой зоны проверяем, находится ли текущее время в интервале [startTime, endTime]
   * 3. Если да - показываем зону (display: block, pointerEvents: auto)
   * 4. Если нет - скрываем зону (display: none, pointerEvents: none)
   */
  function updateSvgZonesVisibility() {
    if (!santaAnimationStartTime) return

    // ВЫЧИСЛЕНИЕ ТЕКУЩЕГО ВРЕМЕНИ АНИМАЦИИ
    // currentTime = текущее время - время начала анимации (в миллисекундах)
    const currentTime = Date.now() - santaAnimationStartTime

    // Проходим по всем созданным зонам
    svgClickOverlays.forEach(overlay => {
      // Получаем временные интервалы из data-атрибутов
      const startTime = parseInt(overlay.dataset.startTime, 10) // Время начала (мс)
      const endTime = parseInt(overlay.dataset.endTime, 10) // Время окончания (мс)

      // ПРОВЕРКА: находится ли текущее время в интервале активности зоны
      if (currentTime >= startTime && currentTime <= endTime) {
        // ЗОНА ДОЛЖНА БЫТЬ ВИДНА И АКТИВНА
        overlay.style.display = 'block' // Показываем зону
        overlay.style.pointerEvents = 'auto' // Разрешаем клики
      } else {
        // ЗОНА ДОЛЖНА БЫТЬ СКРЫТА И НЕАКТИВНА
        overlay.style.display = 'none' // Скрываем зону
        overlay.style.pointerEvents = 'none' // Блокируем клики
      }
    })
  }

  /**
   * ЗАПУСК АНИМАЦИИ ОБНОВЛЕНИЯ ЗОН
   *
   * Эта функция запускает цикл обновления видимости зон через requestAnimationFrame.
   * Зоны будут показываться/скрываться в зависимости от времени анимации Санты.
   *
   * ПРОЦЕСС:
   * 1. Запоминаем время начала анимации
   * 2. Запускаем цикл requestAnimationFrame
   * 3. В каждом кадре вызываем updateSvgZonesVisibility()
   * 4. Продолжаем пока не прошло полная длительность анимации (SANTA_ANIMATION_DURATION)
   * 5. После окончания скрываем все зоны
   */
  function startSvgZonesAnimation() {
    // Останавливаем предыдущую анимацию (если была)
    if (santaZoneAnimationId) {
      cancelAnimationFrame(santaZoneAnimationId)
    }

    // ЗАПОМИНАЕМ ВРЕМЯ НАЧАЛА АНИМАЦИИ
    // Это нужно для расчета текущего времени в updateSvgZonesVisibility()
    santaAnimationStartTime = Date.now()

    // Функция анимации (вызывается каждый кадр)
    const animate = () => {
      // Обновляем видимость всех зон в зависимости от текущего времени
      updateSvgZonesVisibility()

      // ПРОВЕРКА: продолжать ли анимацию
      const elapsed = Date.now() - santaAnimationStartTime // Прошедшее время (мс)
      if (elapsed < SANTA_ANIMATION_DURATION) {
        // Анимация еще не закончилась
        // Продолжаем цикл
        santaZoneAnimationId = requestAnimationFrame(animate)
      } else {
        // АНИМАЦИЯ ЗАКОНЧИЛАСЬ - скрываем все зоны
        svgClickOverlays.forEach(overlay => {
          overlay.style.display = 'none'
          overlay.style.pointerEvents = 'none'
        })
        santaZoneAnimationId = null
      }
    }

    // Запускаем первый кадр анимации
    santaZoneAnimationId = requestAnimationFrame(animate)
  }

  /**
   * ОСТАНОВКА АНИМАЦИИ ЗОН
   *
   * Эта функция:
   * 1. Останавливает цикл requestAnimationFrame
   * 2. Сбрасывает время начала анимации
   * 3. Скрывает все зоны
   *
   * Вызывается при:
   * - Окончании анимации Санты
   * - Клике на Санту (когда его поймали)
   */
  function stopSvgZonesAnimation() {
    // Останавливаем цикл анимации
    if (santaZoneAnimationId) {
      cancelAnimationFrame(santaZoneAnimationId)
      santaZoneAnimationId = null
    }

    // Сбрасываем время начала
    santaAnimationStartTime = null

    // СКРЫВАЕМ ВСЕ ЗОНЫ
    svgClickOverlays.forEach(overlay => {
      overlay.style.display = 'none' // Скрываем
      overlay.style.pointerEvents = 'none' // Блокируем клики
    })
  }

  /**
   * ОБРАБОТЧИК КЛИКА ПО SVG ЗОНЕ
   *
   * Вызывается когда пользователь кликает на кликабельную зону (красный прямоугольник).
   *
   * ДЕЙСТВИЯ:
   * 1. Предотвращает всплытие события (stopPropagation)
   * 2. Предотвращает стандартное поведение (preventDefault)
   * 3. Вызывает handleSantaClick() - основную функцию обработки клика на Санту
   */
  function handleSvgZoneClick(event) {
    event.preventDefault() // Предотвращаем стандартное поведение
    event.stopPropagation() // Останавливаем всплытие события
    handleSantaClick(event) // Вызываем основную функцию обработки клика на Санту
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

    // Обработчик postMessage от родительского окна
    window.addEventListener('message', function (event) {
      // Проверяем, что сообщение от родителя
      if (event.data && typeof event.data === 'object') {
        // Обработка команды показа/скрытия debug зон
        if (event.data.type === 'showDebugZones') {
          showDebugZones = event.data.value === true
          console.log('showDebugZones установлен в:', showDebugZones)
          // Обновляем только визуализацию существующих зон, не пересоздавая их
          // Это предотвращает изменение размеров зон при включении debug во время анимации
          if (svgClickOverlays.length > 0) {
            updateSvgZonesVisualization()
          }
        }
        // Обработка команды активации группы 2 (активная пасхалка)
        if (event.data.type === 'activateGroup2') {
          console.log('Получена команда активации Группы 2')
          activateGroup2()
        }
      }
    })

    // Обработчик изменения размера окна/контейнера для пересчета padding зон
    window.addEventListener('resize', function () {
      // Debounce: пересчитываем только если зоны уже созданы и анимация активна
      if (svgClickOverlays.length > 0 && isAnimationPlaying) {
        clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(() => {
          console.log('Размер контейнера изменился, пересчитываем зоны')
          rebuildSvgClickZones()
        }, 150) // Небольшая задержка для оптимизации
      }
    })

    // Обработчик изменения ориентации устройства (для мобильных)
    window.addEventListener('orientationchange', function () {
      // Пересчитываем зоны после изменения ориентации
      if (svgClickOverlays.length > 0 && isAnimationPlaying) {
        setTimeout(() => {
          console.log('Ориентация изменилась, пересчитываем зоны')
          rebuildSvgClickZones()
        }, 200) // Задержка для завершения изменения ориентации
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

    // Удаляем старый обработчик, если он был (на случай повторного вызова)
    if (svgReloadHandler && santaAnimation) {
      santaAnimation.removeEventListener('load', svgReloadHandler)
      svgReloadHandler = null
    }

    // Показываем wrapper с анимацией
    santaAnimationWrapper.style.display = 'block'
    santaAnimationWrapper.style.opacity = '1'

    // ТОЛЬКО ПОСЛЕ показа wrapper создаем SVG зоны
    // Флаг для предотвращения двойного создания зон
    let zonesCreated = false

    // Функция для создания зон
    const createSvgZones = () => {
      // Предотвращаем двойное создание
      if (zonesCreated) {
        console.log('[SantaWidget] Зоны уже созданы, пропускаем')
        return true
      }

      const doc = getSvgDocument()
      if (doc && doc.documentElement) {
        rebuildSvgClickZones()
        // Запускаем анимацию обновления зон (зоны будут показываться по времени)
        startSvgZonesAnimation()
        zonesCreated = true
        console.log('✅ Кликабельные зоны созданы, анимация запущена')
        return true
      }
      console.warn('[SantaWidget] Не удалось создать зоны - SVG документ недоступен')
      return false
    }

    // Перезагружаем SVG для перезапуска анимации
    const currentSrc = santaAnimation.data
    console.log('Перезагружаем SVG:', currentSrc)
    santaAnimation.data = ''

    // Обработчик для пересоздания зон после перезагрузки SVG
    svgReloadHandler = () => {
      setTimeout(() => {
        if (isAnimationPlaying && !zonesCreated) {
          // Проверяем, что анимация все еще активна и зоны еще не созданы
          createSvgZones()
          console.log('✅ SVG перезагружен, зоны пересозданы')
        }
      }, 150) // Увеличиваем задержку для гарантии загрузки SVG
    }
    santaAnimation.addEventListener('load', svgReloadHandler, { once: true })

    setTimeout(() => {
      santaAnimation.data = currentSrc.split('?')[0] + '?v=' + Date.now()
      console.log('SVG перезагружен')

      // Пробуем создать зоны после перезагрузки (если SVG уже загружен)
      // Используем большую задержку, чтобы дать время SVG загрузиться
      setTimeout(() => {
        if (isAnimationPlaying && !zonesCreated) {
          if (!createSvgZones()) {
            // SVG еще не загружен, ждем события load (обработчик уже добавлен выше)
            console.log('[SantaWidget] Ожидаем загрузки SVG для создания зон')
          }
        }
      }, 200) // Увеличиваем задержку
    }, 10)

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

    // Останавливаем анимацию SVG зон (скрывает все зоны)
    stopSvgZonesAnimation()

    // Удаляем обработчик загрузки SVG (если был)
    if (svgReloadHandler && santaAnimation) {
      santaAnimation.removeEventListener('load', svgReloadHandler)
      svgReloadHandler = null
    }

    // Скрываем wrapper
    console.log('Скрываем wrapper и кликабельную зону')
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

    // Останавливаем анимацию SVG зон (скрывает все зоны)
    stopSvgZonesAnimation()

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
