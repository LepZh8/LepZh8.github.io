(() => {
  'use strict';
  const config = JSON.parse(document.getElementById('lep-blog-config').textContent);
  const key = 'lepzh.blog.auth';
  const token = `v${config.version}:${config.passwordHash}`;
  const guestToken = `v${config.version}:guest:${config.guestPasswordHash}`;
  const postPaths = new Set(config.postPaths.map(path => decodeURIComponent(path)));
  function isPost(value) {
    try {
      const url = new URL(value, location.origin + '/blog/');
      return (url.origin === location.origin || url.hostname === 'lepzh.top') && postPaths.has(decodeURIComponent(url.pathname));
    } catch { return false; }
  }
  window.LEP_BLOG_ACCESS = { isPost };
  const root = document.documentElement;
  const form = document.getElementById('lep-blog-form');
  const input = document.getElementById('lep-blog-password');
  const message = document.getElementById('lep-blog-message');
  message.textContent = '';
  let attempt = 0;
  function updateTitle() {
    const page = document.getElementById('body-wrap');
    if (!page?.dataset.lepTitle) return;
    const title = page.classList.contains('post') && root.dataset.lepBlogMode !== 'full' ? '博客文章 · 访客模式' : page.dataset.lepTitle;
    if (document.title !== title) document.title = title;
  }
  function check() {
    let mode = '';
    try {
      const stored = sessionStorage.getItem(key);
      mode = stored === token ? 'full' : stored === guestToken ? 'guest' : '';
    }
    catch { message.textContent = '浏览器禁止会话存储，请允许本站存储后重试。'; }
    const changed = root.dataset.lepBlogMode !== mode;
    root.dataset.lepBlogMode = mode;
    root.classList.toggle('lep-blog-guest', mode === 'guest');
    root.classList.toggle('lep-blog-unlocked', !!mode);
    document.getElementById('lep-blog-lock').textContent = mode === 'guest' ? '访客模式 · 切换密码' : '锁定博客';
    if (changed) document.getElementById('local-search-results')?.replaceChildren();
    updateTitle();
    if (!mode) input.focus();
    return mode;
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
      const acceptedToken = hash === config.passwordHash ? token : hash === config.guestPasswordHash ? guestToken : null;
      if (!acceptedToken) {
        message.textContent = '密码不正确，请重试。'; input.select(); return;
      }
      try { sessionStorage.setItem(key, acceptedToken); }
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
    check();
    input.value = ''; message.textContent = ''; input.focus();
  });
  // Full navigations, BFCache restores and theme PJAX transitions share one gate.
  window.addEventListener('pageshow', check);
  document.addEventListener('pjax:send', check);
  document.addEventListener('pjax:complete', check);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  // PJAX replaces the title before its completion event. Keep article titles masked for guests.
  const titleNode = document.querySelector('title');
  if (titleNode) new MutationObserver(updateTitle).observe(titleNode, {childList:true,subtree:true,characterData:true});
  check();
})();
