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
    STAR_CLICKED: 'starClicked',
  }

  // Сообщения для postMessage
  const EVENTS = {
    SANTA_CLICKED: {
      type: 'santaClicked',
      source: 'santa-vegas-widget',
    },
    SOUND_ON: {
      type: 'sound_on',
      source: 'santa-vegas-widget',
    },
    SOUND_OFF: {
      type: 'sound_off',
      source: 'santa-vegas-widget',
    },
  }

  // ============================================
  // ЭЛЕМЕНТЫ DOM
  // ============================================

  // Элементы DOM
  const soundToggle = document.getElementById('soundToggle')
  const soundIcon = document.getElementById('soundIcon')
  const bgMusic = document.getElementById('bgMusic')
  const santaAnimationWrapper = document.getElementById('santaAnimationWrapper')
  const santaAnimation = document.getElementById('santaAnimation')
  const santaClickZoneTop = document.getElementById('santaClickZoneTop')
  const santaClickZoneBottom = document.getElementById('santaClickZoneBottom')
  const starLayer = document.getElementById('starLayer')
  const starClickZone = document.getElementById('starClickZone')
  const lampsLayer = document.getElementById('lampsLayer')
  const partyLight = document.getElementById('partyLight')
  const baseLogoLayer = document.getElementById('baseLogoLayer')

  // Состояние
  let isSoundPlaying = false
  let canShowSanta = false
  let isAnimationPlaying = false
  let clickZoneTimeout = null
  let isStarClicked = false

  // Вспомогательная функция для управления зонами Санты
  function setSantaClickZonesDisplay(display) {
    if (santaClickZoneTop) santaClickZoneTop.style.display = display
    if (santaClickZoneBottom) santaClickZoneBottom.style.display = display
  }

  // Проверяем query параметр для показа Санты
  function checkShowSantaFromUrl() {
    const urlParams = new URLSearchParams(window.location.search)
    const showSantaParam = urlParams.get(URL_PARAMS.SHOW_SANTA)

    console.log('Query параметр showSanta:', showSantaParam)

    // Если параметр есть и равен 'true', показываем Санту
    if (showSantaParam !== null) {
      canShowSanta = showSantaParam === 'true'
    } else {
      // По умолчанию показываем, если параметр не указан
      canShowSanta = true
    }

    console.log('canShowSanta установлен в:', canShowSanta)
    return canShowSanta
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

    // 1. Скрыть звезду с fade эффектом
    if (starLayer) {
      starLayer.classList.add('fade-out')
      console.log('Начинаем fade-out для звезды')

      setTimeout(() => {
        starLayer.style.display = 'none'
        if (starClickZone) {
          starClickZone.style.display = 'none'
        }
        console.log('Звезда скрыта после fade-out')
      }, 500) // Ждем окончания fade-out анимации
    }

    // 2. Сменить гирлянды на праздничные
    if (lampsLayer) {
      lampsLayer.src = 'img/new/lamps_827x256_party.svg'
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

  // Проверка состояния виджета при загрузке
  function checkWidgetState() {
    const urlParams = new URLSearchParams(window.location.search)
    const showSantaParam = urlParams.get(URL_PARAMS.SHOW_SANTA)
    const starClickedParam = urlParams.get(URL_PARAMS.STAR_CLICKED)
    const santaCaught = localStorage.getItem(STORAGE_KEYS.SANTA_CLICKED)

    console.log('Проверка состояния виджета:')
    console.log('- showSanta параметр:', showSantaParam)
    console.log('- starClicked параметр:', starClickedParam)
    console.log('- santaClicked в localStorage:', santaCaught)

    // Случай 1: ?showSanta=false ИЛИ Санта уже была поймана (Группа 3)
    if (showSantaParam === 'false' || santaCaught === 'true') {
      console.log('Режим: Праздничная версия БЕЗ Санты (Группа 3)')
      activatePartyMode(false)
      return WIDGET_STATES.PARTY_NO_SANTA
    }

    // Случай 2: ?starClicked=true - звезда уже кликнута, показываем праздничный режим с Сантой (Группа 2)
    if (starClickedParam === 'true') {
      console.log('Режим: Активная пасхалка (звезда кликнута, показываем Санту) - Группа 2')
      isStarClicked = true
      activatePartyMode(true)
      startSantaAnimation()
      return WIDGET_STATES.ACTIVE_EASTER_EGG
    }

    // Случай 3: Стандартный режим (Группа 1)
    console.log('Режим: Стандартный (со звездой) - Группа 1')
    return WIDGET_STATES.DEFAULT
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
      lampsLayer.src = 'img/new/lamps_827x256_party.svg'
    }

    // Показать праздничную подсветку
    if (partyLight) {
      partyLight.style.display = 'block'
    }

    // Установить флаг для показа Санты
    if (showSanta) {
      console.log('Режим с Сантой: Санта будет показана')
      canShowSanta = true
    } else {
      console.log('Режим без Санты: Санта не будет показана')
      canShowSanta = false
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
      starClickZone.addEventListener('click', handleStarClick)
      console.log('Обработчик клика на звезду добавлен')
    }

    // Добавляем обработчики клика на кликабельные зоны Санты
    if (santaClickZoneTop) {
      santaClickZoneTop.addEventListener('click', function (event) {
        console.log('Клик по верхней зоне ловли Санты')
        handleSantaClick(event)
      })
    }
    if (santaClickZoneBottom) {
      santaClickZoneBottom.addEventListener('click', function (event) {
        console.log('Клик по нижней зоне ловли Санты')
        handleSantaClick(event)
      })
    }

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

    // Показываем кликабельную зону
    setSantaClickZonesDisplay('block')
    console.log('Кликабельная зона показана')

    // Перезагружаем SVG для перезапуска анимации
    const currentSrc = santaAnimation.data
    console.log('Перезагружаем SVG:', currentSrc)
    santaAnimation.data = ''
    // Небольшая задержка перед перезагрузкой
    setTimeout(() => {
      santaAnimation.data = currentSrc
      console.log('SVG перезагружен')
    }, 10)

    // Скрываем кликабельную зону через 14 секунд
    if (clickZoneTimeout) {
      clearTimeout(clickZoneTimeout)
    }
    clickZoneTimeout = setTimeout(() => {
      console.log('Скрываем кликабельную зону (14 сек прошло)')
      setSantaClickZonesDisplay('none')
    }, 14000)

    // Скрываем анимацию после завершения (14 секунд - полная длительность SVG)
    setTimeout(() => {
      handleAnimationEnd()
    }, 14000)
  }

  // Обработка окончания анимации
  function handleAnimationEnd() {
    console.log('handleAnimationEnd вызвана')

    // Скрываем wrapper
    console.log('Скрываем wrapper и кликабельную зону')
    santaAnimationWrapper.style.display = 'none'
    santaAnimationWrapper.style.opacity = '0'
    setSantaClickZonesDisplay('none')

    // Очищаем таймаут если он еще активен
    if (clickZoneTimeout) {
      clearTimeout(clickZoneTimeout)
      clickZoneTimeout = null
    }

    isAnimationPlaying = false
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

    // Мгновенно скрываем кликабельную зону
    setSantaClickZonesDisplay('none')

    // Очищаем таймаут зоны
    if (clickZoneTimeout) {
      clearTimeout(clickZoneTimeout)
      clickZoneTimeout = null
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
