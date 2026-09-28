(function () {
  'use strict';

  var APP_ID = 54789033;
  var REQUIRED_SCOPES = ['groups', 'stats', 'wall'];
  var token = '';
  var initialized = false;
  var connectButton = document.getElementById('connect');
  var copyButton = document.getElementById('copy');
  var tokenInput = document.getElementById('token');
  var tokenWrap = document.getElementById('tokenWrap');
  var statusNode = document.getElementById('status');

  function setStatus(text, className) {
    statusNode.textContent = String(text || '');
    statusNode.className = className || '';
  }

  function withTimeout(promise, milliseconds) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        window.setTimeout(function () {
          reject(new Error('VK не ответил вовремя. Закройте приложение и откройте его снова.'));
        }, milliseconds);
      })
    ]);
  }

  function normalizeScopes(value) {
    var items = Array.isArray(value) ? value : String(value || '').split(',');
    return items.map(function (item) {
      return String(item).trim().toLowerCase();
    }).filter(Boolean);
  }

  function initialize() {
    if (initialized) return Promise.resolve();
    if (typeof vkBridge === 'undefined') {
      return Promise.reject(new Error('Не загрузился официальный модуль VK.'));
    }
    return withTimeout(vkBridge.send('VKWebAppInit'), 15000).then(function () {
      initialized = true;
      connectButton.disabled = false;
      setStatus('Готово. Нажмите «Получить ключ VK».');
    });
  }

  function connect() {
    connectButton.disabled = true;
    setStatus('Запрашиваю разрешение ВКонтакте…');
    initialize().then(function () {
      return withTimeout(vkBridge.send('VKWebAppGetAuthToken', {
        app_id: APP_ID,
        scope: REQUIRED_SCOPES.join(',')
      }), 90000);
    }).then(function (result) {
      if (!result || !result.access_token) {
        throw new Error('ВКонтакте не вернул ключ доступа.');
      }
      var granted = normalizeScopes(result.scope);
      var missing = REQUIRED_SCOPES.filter(function (scope) {
        return granted.indexOf(scope) === -1;
      });
      if (missing.length) {
        throw new Error('Не выданы необходимые разрешения: ' + missing.join(', ') + '.');
      }
      token = String(result.access_token);
      tokenInput.value = token;
      tokenWrap.className = 'token-wrap visible';
      setStatus('Ключ получен. Скопируйте его и вернитесь в Google-таблицу.', 'ok');
    }).catch(function (error) {
      var message = error && error.message ? error.message : String(error);
      setStatus('Не удалось получить ключ. ' + message, 'error');
      connectButton.disabled = false;
    });
  }

  function fallbackCopy() {
    tokenInput.type = 'text';
    tokenInput.focus();
    tokenInput.select();
    document.execCommand('copy');
    tokenInput.type = 'password';
    setStatus('Ключ скопирован. Теперь вставьте его в Google-таблицу.', 'ok');
  }

  function copyToken() {
    if (!token) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(token).then(function () {
        setStatus('Ключ скопирован. Теперь вставьте его в Google-таблицу.', 'ok');
      }).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  connectButton.addEventListener('click', connect);
  copyButton.addEventListener('click', copyToken);
  initialize().catch(function (error) {
    var message = error && error.message ? error.message : String(error);
    setStatus('Откройте эту страницу через приложение ВКонтакте. ' + message, 'error');
  });
}());
