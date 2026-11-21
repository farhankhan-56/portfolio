(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const el = (t, props, kids) => { const e = document.createElement(t); Object.assign(e, props || {}); (kids || []).forEach((k) => e.append(k)); return e; };
  const ext = (href, text) => el("a", { href, textContent: text, target: "_blank", rel: "noopener noreferrer" });

  function socialLinks(target) {
    [["GitHub", SITE.github], ["LinkedIn", SITE.linkedin], ["Upwork", SITE.upwork]].forEach(([n, u]) => { if (u) target.append(ext(u, n)); });
    if (target.id === "contactLinks" && SITE.email) target.prepend(el("a", { href: "mailto:" + SITE.email, textContent: SITE.email }));
  }

  function fillContent() {
    if (SITE.intro) $("#intro").textContent = SITE.intro; else $("#intro").hidden = true;
    SITE.bio.forEach((t) => $("#bio").append(el("p", { textContent: t })));
    socialLinks($("#heroSocial")); socialLinks($("#contactLinks"));
    SERVICES.forEach((s) => $("#serviceList").append(el("li", { className: "item" }, [el("h3", { textContent: s.title })])));
    const groups = $("#skillGroups");
    let any = false;
    Object.entries(SITE.skills).forEach(([g, items]) => {
      if (!items.length) return;
      any = true;
      const names = items.map((i) => i.level ? i.name + " (" + i.level + ")" : i.name).join(", ");
      groups.append(el("div", { className: "item" }, [el("h3", { textContent: g }), el("p", { textContent: names })]));
    });
    if (!any) { $("#skills").hidden = true; document.querySelector('#nav a[href="#skills"]').hidden = true; }
    const photo = $("#photo");
    photo.addEventListener("error", () => { photo.hidden = true; });
  }

  const PROJECT_DEFAULTS = { short: "", problem: "", solution: "", features: [], tools: [], role: "", lessons: "", images: [], links: {} };
  const withProjectDefaults = (project) => ({ ...PROJECT_DEFAULTS, ...project, links: { ...project.links } });

    const projectNumber = (i) => String(i + 1).padStart(2, "0");

  function projectLinks(p, i) {
    const links = el("div", { className: "links" });
    [["live", "Live"], ["github", "GitHub"], ["demo", "Demo"]].forEach(([k, n]) => { if (p.links[k]) links.append(ext(p.links[k], n)); });
    links.append(el("button", { className: "btn", type: "button", textContent: "View details", onclick: () => openProjectDialog(i) }));
    return links;
  }

  function featureCard(p, i, flip) {
    const shot = p.images[0];
    const text = el("div", { className: "feature-text" }, [
      el("p", { className: "label", textContent: projectNumber(i) }),
      el("h3", { textContent: p.name }),
      el("p", { textContent: p.short }),
      projectLinks(p, i)
    ]);
    const kids = shot ? [el("img", { src: shot.src, alt: shot.alt, loading: "lazy" }), text] : [text];
    return el("article", { className: "feature" + (flip ? " flip" : "") }, kids);
  }

  function indexRow(p, i) {
    const shot = p.images[0];
    const row = el("button", { className: "row", type: "button", onclick: () => openProjectDialog(i) }, [
      el("span", { className: "label", textContent: projectNumber(i) }),
      el("span", { className: "row-name", textContent: p.name }),
      el("span", { className: "row-short", textContent: p.short })
    ]);
    if (shot) row.append(el("img", { className: "thumb", src: shot.src, alt: "", loading: "lazy" }));
    return el("li", {}, [row]);
  }

  function renderProjects() {
    const grid = $("#projectGrid"), index = el("ol", { className: "index" });
    let featuredCount = 0;
    PROJECTS.map(withProjectDefaults).forEach((p, i) => {
      if (!p.featured) { index.append(indexRow(p, i)); return; }
      grid.append(featureCard(p, i, featuredCount++ % 2 === 1));
    });
    grid.append(index);
  }

  function openProjectDialog(i) {
    const p = withProjectDefaults(PROJECTS[i]), body = $("#dlgBody");
    body.replaceChildren(el("h2", { id: "dlgTitle", textContent: p.name }));
    [["Problem", p.problem], ["Solution", p.solution], ["My contribution", p.role], ["Lessons learned", p.lessons]].forEach(([h, t]) => { if (t) body.append(el("h3", { textContent: h }), el("p", { textContent: t })); });
    if (p.features.length) { const ul = el("ul"); p.features.forEach((f) => ul.append(el("li", { textContent: f }))); body.append(el("h3", { textContent: "Features" }), ul); }
    if (p.tools.length) body.append(el("h3", { textContent: "Tools" }), el("p", { textContent: p.tools.join(", ") }));
    p.images.forEach((im) => body.append(el("img", { src: im.src, alt: im.alt, loading: "lazy" })));
    if (p.links.demo) body.append(el("p", {}, [ext(p.links.demo, "Watch the demo")]));
    $("#projectDialog").showModal();
  }

  function activeNav() {
    const links = [...document.querySelectorAll("#nav a")];
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
    }), { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll("main section").forEach((s) => io.observe(s));
  }

  function validateForm() {
    const f = $("#contactForm");
    const rules = { name: (v) => v.trim() ? "" : "Enter your name.", email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter a valid email address.", message: (v) => v.trim() ? "" : "Enter a message." };
    let ok = true;
    Object.keys(rules).forEach((k) => { const m = rules[k](f.elements[k].value); $("#err-" + k).textContent = m; f.elements[k].setAttribute("aria-invalid", String(!!m)); if (m) ok = false; });
    return ok;
  }

  const SEND_TIMEOUT_MS = 10000;

  async function submitForm(e) {
    e.preventDefault();
    const f = e.target, status = $("#formStatus"), btn = $("#sendBtn");
    status.textContent = "";
    if (!validateForm()) return;
    const fallback = "Message not sent." + (SITE.email ? " Email me directly at " + SITE.email + "." : "");
    if (!SITE.web3formsKey) { status.textContent = fallback; return; }
    btn.disabled = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, signal: controller.signal,
        body: JSON.stringify({ name: f.name.value, email: f.email.value, message: f.message.value, access_key: SITE.web3formsKey, botcheck: f.botcheck.checked })
      });
      const data = await res.json();
      if (data.success) { status.textContent = "Message sent. Thank you."; f.reset(); } else status.textContent = fallback;
    } catch (err) {
      console.error("Contact form request failed:", err.name);
      status.textContent = fallback;
    } finally {
      clearTimeout(timeoutId);
      btn.disabled = false;
    }
  }

  function menuToggle() {
    const btn = $("#menuBtn"), nav = $("#nav");
    if (!btn || !nav) return;
    const setOpen = (open) => {
      nav.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "✕" : "☰";
    };
    btn.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  }

  function init() {
    fillContent(); renderProjects(); activeNav(); menuToggle();

    $("#contactForm").addEventListener("submit", submitForm);
    const dlg = $("#projectDialog");
    $("#dlgClose").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    const top = $("#toTop");
    top.addEventListener("click", () => scrollTo({ top: 0 }));
    addEventListener("scroll", () => { top.hidden = scrollY < 600; }, { passive: true });
  }
  init();
})();
