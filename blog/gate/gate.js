(() => {
  'use strict';
  const config = JSON.parse(document.getElementById('lep-blog-config').textContent);
  const key = 'lepzh.blog.auth';
  const token = `v${config.version}:${config.passwordHash}`;
  const root = document.documentElement;
  const form = document.getElementById('lep-blog-form');
  const input = document.getElementById('lep-blog-password');
  const message = document.getElementById('lep-blog-message');
  message.textContent = '';
  let attempt = 0;
  function check() {
    let valid = false;
    try { valid = sessionStorage.getItem(key) === token; }
    catch { message.textContent = '浏览器禁止会话存储，请允许本站存储后重试。'; }
    root.classList.toggle('lep-blog-unlocked', valid);
    if (!valid) input.focus();
    return valid;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const current = ++attempt;
    const button = form.querySelector('button');
    button.disabled = true;
    message.textContent = '';
    try {
      if (!crypto.subtle) throw new Error('请通过 HTTPS 或 localhost 访问博客。');
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.value));
      if (current !== attempt) return;
      const hash = Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
      if (hash !== config.passwordHash) {
        message.textContent = '密码不正确，请重试。'; input.select(); return;
      }
      try { sessionStorage.setItem(key, token); }
      catch { throw new Error('无法保存会话，请允许本站使用会话存储后重试。'); }
      input.value = '';
      check();
      // Hidden theme components may need their dimensions recalculated.
      window.dispatchEvent(new Event('resize'));
      const content = document.getElementById('body-wrap');
      if (content) { content.setAttribute('tabindex', '-1'); content.focus({preventScroll:true}); }
    } catch (error) { message.textContent = error.message || '验证失败，请刷新后重试。'; }
    finally { button.disabled = false; }
  });
  document.getElementById('lep-blog-lock').addEventListener('click', () => {
    ++attempt;
    try { sessionStorage.removeItem(key); } catch {}
    root.classList.remove('lep-blog-unlocked');
    input.value = ''; message.textContent = ''; input.focus();
  });
  // Full navigations, BFCache restores and theme PJAX transitions share one gate.
  window.addEventListener('pageshow', check);
  document.addEventListener('pjax:send', check);
  document.addEventListener('pjax:complete', check);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  check();
})();
