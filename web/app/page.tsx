import fs from "fs";
import path from "path";
import ScriptLoader from "./ScriptLoader";

const bodyHtml = fs.readFileSync(
  path.join(process.cwd(), "app", "home-body.html"),
  "utf8"
);

const scriptItems = [
  {
    "src": "/webflow/jquery-3.5.1.min.dc5e7f18c8.js",
    "inline": null
  },
  {
    "src": "/webflow/sayso-v2.schunk.36b8fb49256177c8.js",
    "inline": null
  },
  {
    "src": "/webflow/sayso-v2.schunk.288df1f54663a3bc.js",
    "inline": null
  },
  {
    "src": "/webflow/sayso-v2.schunk.3628d3ef9525bbf8.js",
    "inline": null
  },
  {
    "src": "/webflow/sayso-v2.schunk.2e9a6c851ce4cf63.js",
    "inline": null
  },
  {
    "src": "/webflow/sayso-v2.412620ba.654c8709c33a3bdb.js",
    "inline": null
  },
  {
    "src": "/webflow/gsap.min.js",
    "inline": null
  },
  {
    "src": "/webflow/ScrollTrigger.min.js",
    "inline": null
  },
  {
    "src": "/webflow/SplitText.min.js",
    "inline": null
  },
  {
    "src": "/webflow/CustomEase.min.js",
    "inline": null
  },
  {
    "src": "/webflow/InertiaPlugin.min.js",
    "inline": null
  },
  {
    "src": "/webflow/Observer.min.js",
    "inline": null
  },
  {
    "src": "/webflow/Draggable.min.js",
    "inline": null
  },
  {
    "src": "/webflow/DrawSVGPlugin.min.js",
    "inline": null
  },
  {
    "src": "/webflow/ScrambleTextPlugin.min.js",
    "inline": null
  },
  {
    "src": "/webflow/MorphSVGPlugin.min.js",
    "inline": null
  },
  {
    "src": "/webflow/Flip.min.js",
    "inline": null
  },
  {
    "src": null,
    "inline": "gsap.registerPlugin(ScrollTrigger,SplitText,CustomEase,InertiaPlugin,Observer,Draggable,DrawSVGPlugin,ScrambleTextPlugin,MorphSVGPlugin,Flip);"
  },
  {
    "src": "/webflow/lenis.min.js",
    "inline": null
  },
  {
    "src": null,
    "inline": "window.onWeglotReady = function() {};\n  window.onGsapReady = function(cb) {\n    if (window.__gsapReady) cb();\n    else window.addEventListener('gsapReady', cb, { once: true });\n  };\n\n  function loadGsap() {\n    var base = 'https://cdn.prod.website-files.com/gsap/3.15.0/';\n    var files = [\n      'gsap.min.js',\n      'ScrollTrigger.min.js',\n      'SplitText.min.js',\n      'CustomEase.min.js',\n      'InertiaPlugin.min.js',\n      'Observer.min.js',\n      'Draggable.min.js',\n      'DrawSVGPlugin.min.js',\n      'ScrambleTextPlugin.min.js',\n      'MorphSVGPlugin.min.js',\n      'Flip.min.js'\n    ];\n    var loaded = 0;\n    files.forEach(function(file) {\n      var s = document.createElement('script');\n      s.src = base + file;\n      s.onload = function() {\n        if (++loaded === files.length) {\n          gsap.registerPlugin(\n            ScrollTrigger, SplitText, CustomEase, InertiaPlugin,\n            Observer, Draggable, DrawSVGPlugin, ScrambleTextPlugin,\n            MorphSVGPlugin, Flip\n          );\n          window.__gsapReady = true;\n          window.dispatchEvent(new CustomEvent('gsapReady'));\n        }\n      };\n      s.onerror = function() {\n        console.error('Failed to load GSAP file:', file);\n      };\n      document.head.appendChild(s);\n    });\n  }\n\n  function loadSlater() {\n    var src = window.location.host.includes(\"webflow.io\")\n      ? \"https://slater.app/17378.js\"\n      : \"https://assets.slater.app/slater/17378.js?v=1.0\";\n    var s = document.createElement('script');\n    s.src = src;\n    s.type = 'module';\n    document.head.appendChild(s);\n  }\n\n  function startDeferredLoading() {\n    loadGsap();                      \n    window.onGsapReady(loadSlater); \n  }\n\n  if (document.readyState === 'complete') {\n    setTimeout(startDeferredLoading, 100);\n  } else {\n    window.addEventListener('load', function() {\n      setTimeout(startDeferredLoading, 100);\n    });\n  }"
  },
  {
    "src": null,
    "inline": "const forms = document.querySelectorAll('#newsletter, #newsletter-mob');\nconst navbarToggles = document.querySelectorAll('.navbar-dd_toggle');\nconst resetButtons = document.querySelectorAll('.hm_back-button, .hamburger-menu');\nforms.forEach(form => {\n  const input = form.querySelector('.hs-input');\n  const submitBtn = form.querySelector('.hs-submit');\n  const errorMsg = form.querySelector('.hs_error-message');\n  const successMsg = form.querySelector('.hs_success-message');\n  const parentBlock = submitBtn.closest('.hs-submit_block');\n\n  function isValidEmail(email) {\n    const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n    return regex.test(email);\n  }\n\n  submitBtn.addEventListener('click', function (e) {\n    \n    const email = input.value.trim();\n    if (!isValidEmail(email)) {\n      e.preventDefault();\n      errorMsg.style.display = 'block';\n      submitBtn.classList.add('disable');\n      successMsg.style.display = 'none';\n      if (parentBlock) {\n        parentBlock.classList.add('disable');\n      }\n    }\n  });\n\n  input.addEventListener('input', function () {\n    errorMsg.style.display = 'none';\n    successMsg.style.display = 'none';\n    submitBtn.classList.remove('disable');\n    submitBtn.classList.remove('success');\n    if (parentBlock) {\n      parentBlock.classList.remove('success');\n      parentBlock.classList.remove('disable');\n    }\n  });\n\n  const observer = new MutationObserver(function (mutations) {\n    mutations.forEach(function (mutation) {\n      mutation.addedNodes.forEach(function (node) {\n        if (node.nodeType === 1) {\n          const text = node.textContent.trim();\n          if (text.includes('Thanks for subscribing')) {\n            node.style.display = 'none';\n            submitBtn.classList.add('success');\n            if (parentBlock) {\n              parentBlock.classList.add('success');\n            }\n            successMsg.style.display = 'block';\n            errorMsg.style.display = 'none';\n            submitBtn.classList.remove('disable');\n            if (parentBlock) {\n              parentBlock.classList.remove('disable');\n            }\n          }\n        }\n      });\n    });\n  });\n\n  observer.observe(form, { childList: true, subtree: true });\n});\n  \nfunction resetForm(form) {\n  const input = form.querySelector('.hs-input');\n  const submitBtn = form.querySelector('.hs-submit');\n  const errorMsg = form.querySelector('.hs_error-message');\n  const successMsg = form.querySelector('.hs_success-message');\n  const parentBlock = submitBtn.closest('.hs-submit_block');\n  const checkbox = form.querySelector('.hs-checkbox_input');\n\n  if (input) input.value = '';\n  if (checkbox) checkbox.checked = false;\n  if (errorMsg) errorMsg.style.display = 'none';\n  if (successMsg) successMsg.style.display = 'none';\n\n  if (submitBtn) {\n    submitBtn.classList.remove('disable', 'success');\n    if (parentBlock) parentBlock.classList.remove('disable', 'success');\n  }\n}\n  \n  \nfunction resetAllForms() {\n  forms.forEach(form => resetForm(form));\n}\n\nnavbarToggles.forEach(toggle => {\n  toggle.addEventListener('mouseenter', resetAllForms);\n});\n  \nresetButtons.forEach(button => {\n  button.addEventListener('click', resetAllForms);\n});"
  },
  {
    "src": null,
    "inline": "document.addEventListener('DOMContentLoaded', () => {\n  const forms = document.querySelectorAll('#dev-newsletter-2, #dev-newsletter-mob-2, #newsletter-2, #newsletter-mob-2'); \n  const navbarToggles = document.querySelectorAll('.navbar-dd_toggle');\n  const resetButtons = document.querySelectorAll('.hm_back-button, .hamburger-menu');\n\n  forms.forEach(form => {\n    const input = form.querySelector('.hs-input');\n    const submitBtn = form.querySelector('.hs-submit');\n    const errorMsg = form.querySelector('.hs_error-message');\n    const successMsg = form.querySelector('.hs_success-message');\n    const parentBlock = submitBtn.closest('.hs-submit_block');\n\n    function isValidEmail(email) {\n      const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n      return regex.test(email);\n    }\n\n    function showSuccess() {\n      submitBtn.classList.add('success');\n      if (parentBlock) parentBlock.classList.add('success');\n      successMsg.style.display = 'block';\n      errorMsg.style.display = 'none';\n      submitBtn.classList.remove('disable');\n      if (parentBlock) parentBlock.classList.remove('disable');\n    }\n\n    function showError() {\n      errorMsg.style.display = 'block';\n      successMsg.style.display = 'none';\n      submitBtn.classList.add('disable');\n      if (parentBlock) parentBlock.classList.add('disable');\n    }\n\n    async function ajaxSubmit() {\n      try {\n        const formData = new FormData(form);\n        await fetch(form.action, {\n          method: (form.method || 'POST').toUpperCase(),\n          body: formData,\n          mode: 'no-cors'\n        });\n        showSuccess();\n      } catch (err) {\n        showError();\n      }\n    }\n\n    form.addEventListener('submit', function(e) {\n      e.preventDefault();\n      const email = input.value.trim();\n      if (!isValidEmail(email)) {\n        showError();\n        return;\n      }\n      ajaxSubmit();\n    });\n\n    input.addEventListener('input', function () {\n      errorMsg.style.display = 'none';\n      successMsg.style.display = 'none';\n      submitBtn.classList.remove('disable');\n      submitBtn.classList.remove('success');\n      if (parentBlock) {\n        parentBlock.classList.remove('success');\n        parentBlock.classList.remove('disable');\n      }\n    });\n\n    const observer = new MutationObserver(function (mutations) {\n      mutations.forEach(function (mutation) {\n        mutation.addedNodes.forEach(function (node) {\n          if (node.nodeType === 1) {\n            const text = node.textContent.trim();\n            if (text.includes('Thanks for subscribing')) {\n              node.style.display = 'none';\n              showSuccess();\n            }\n          }\n        });\n      });\n    });\n\n    observer.observe(form, { childList: true, subtree: true });\n  });\n\n  function resetForm(form) {\n    const input = form.querySelector('.hs-input');\n    const submitBtn = form.querySelector('.hs-submit');\n    const errorMsg = form.querySelector('.hs_error-message');\n    const successMsg = form.querySelector('.hs_success-message');\n    const parentBlock = submitBtn.closest('.hs-submit_block');\n    const checkbox = form.querySelector('.hs-checkbox_input');\n\n    if (input) input.value = '';\n    if (checkbox) checkbox.checked = false;\n    if (errorMsg) errorMsg.style.display = 'none';\n    if (successMsg) successMsg.style.display = 'none';\n\n    if (submitBtn) {\n      submitBtn.classList.remove('disable', 'success');\n      if (parentBlock) parentBlock.classList.remove('disable', 'success');\n    }\n  }\n\n  function resetAllForms() {\n    forms.forEach(form => resetForm(form));\n  }\n\n  navbarToggles.forEach(toggle => {\n    toggle.addEventListener('mouseenter', resetAllForms);\n  });\n\n  resetButtons.forEach(button => {\n    button.addEventListener('click', resetAllForms);\n  });\n\n});"
  },
  {
    "src": null,
    "inline": "(function () {\n  const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  const mq = window.matchMedia('(min-width: 768px)');\n\n  let cleanups = [];\n\n  const setup = () => {\n    const forms = document.querySelectorAll('form.hs-form_block');\n    if (!forms.length) return;\n\n    const restores = [];\n\n    forms.forEach((form) => {\n      const button = form.querySelector('.hs-submit');\n      const input = form.querySelector('.hs-input');\n      if (!button || !input) return;\n\n      const success = form.querySelector('.hs_success-message');\n      const error = form.querySelector('.hs_error-message');\n      const original = button.textContent.trim();\n      const waitText = button.getAttribute('data-wait-text') || 'Please wait';\n      const doneText = button.getAttribute('data-done-text') || 'Subscribed';\n\n      let pending = false;\n      let fallback;\n      let obs;\n\n      const visible = (el) =>\n        el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none';\n\n      const restore = () => {\n        pending = false;\n        clearTimeout(fallback);\n        button.classList.remove('is-waiting');\n        button.style.minWidth = '';\n        button.disabled = false;\n        button.textContent = original;\n      };\n\n      const finish = () => {\n        if (!pending) return;\n        if (visible(success)) {\n          pending = false;\n          clearTimeout(fallback);\n          button.classList.remove('is-waiting');\n          button.style.minWidth = '';\n          button.disabled = false;\n          button.textContent = doneText;\n        } else if (visible(error)) {\n          restore();\n        }\n      };\n\n      if (success || error) {\n        obs = new MutationObserver(finish);\n        [success, error].forEach(\n          (el) => el && obs.observe(el, { attributes: true, attributeFilter: ['style', 'class'] })\n        );\n      }\n\n      const onSubmit = () => {\n        if (pending) return;\n        if (!EMAIL.test(input.value.trim())) return;\n        pending = true;\n        button.style.minWidth = button.offsetWidth + 'px';\n        button.textContent = waitText;\n        button.classList.add('is-waiting');\n        requestAnimationFrame(() => { button.disabled = true; });\n        clearTimeout(fallback);\n        fallback = setTimeout(restore, 10000);\n      };\n\n      form.addEventListener('submit', onSubmit);\n      input.addEventListener('input', restore);\n\n      restores.push(restore);\n      cleanups.push(() => {\n        form.removeEventListener('submit', onSubmit);\n        input.removeEventListener('input', restore);\n        if (obs) obs.disconnect();\n        restore();\n      });\n    });\n\n    const restoreAll = () => restores.forEach((fn) => fn());\n    const toggles = document.querySelectorAll('.navbar-dd_toggle');\n    const resetBtns = document.querySelectorAll('.hm_back-button, .hamburger-menu');\n\n    toggles.forEach((el) => el.addEventListener('mouseenter', restoreAll));\n    resetBtns.forEach((el) => el.addEventListener('click', restoreAll));\n\n    cleanups.push(() => {\n      toggles.forEach((el) => el.removeEventListener('mouseenter', restoreAll));\n      resetBtns.forEach((el) => el.removeEventListener('click', restoreAll));\n    });\n  };\n\n  const teardown = () => {\n    cleanups.forEach((fn) => fn());\n    cleanups = [];\n  };\n\n  const apply = () => {\n    teardown();\n    if (mq.matches) setup();\n  };\n\n  document.addEventListener('DOMContentLoaded', () => {\n    apply();\n    mq.addEventListener('change', apply);\n  });\n})();"
  },
  {
    "src": null,
    "inline": "(function () {\n  const DEFAULT_SPEED = 75;\n\n  const imagesReady = (scope) => {\n    const imgs = Array.from(scope.querySelectorAll('img'));\n    if (!imgs.length) return Promise.resolve();\n    return Promise.all(\n      imgs.map((img) =>\n        img.complete\n          ? Promise.resolve()\n          : new Promise((res) => {\n              img.addEventListener('load', res, { once: true });\n              img.addEventListener('error', res, { once: true });\n            })\n      )\n    );\n  };\n\n  const buildCarousel = (carousel) => {\n    const track = carousel.querySelector('[data-carousel-track]');\n    if (!track) return null;\n\n    const base = track.querySelector('[data-carousel-item]');\n    if (!base) return null;\n\n    track.querySelectorAll('[data-carousel-item]:not(:first-child)').forEach((el) => el.remove());\n    gsap.set(track, { clearProps: 'transform,translate,rotate,scale' });\n\n    Object.assign(track.style, {\n      display: 'flex',\n      flexWrap: 'nowrap',\n      willChange: 'transform'\n    });\n    base.style.flex = '0 0 auto';\n\n    const containerWidth = carousel.getBoundingClientRect().width;\n    const itemWidth = base.getBoundingClientRect().width;\n    if (!itemWidth) return null;\n\n    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;\n    const period = itemWidth + gap;\n    const copies = Math.max(2, Math.ceil(containerWidth / period) + 1);\n\n    const frag = document.createDocumentFragment();\n    for (let i = 1; i < copies; i++) {\n      const clone = base.cloneNode(true);\n      clone.setAttribute('aria-hidden', 'true');\n      clone.style.flex = '0 0 auto';\n      frag.appendChild(clone);\n    }\n    track.appendChild(frag);\n\n    const speed = parseFloat(carousel.dataset.carouselSpeed) || DEFAULT_SPEED;\n\n    return gsap.to(track, {\n      x: -period,\n      ease: 'none',\n      repeat: -1,\n      duration: period / speed\n    });\n  };\n\n  const initCarousels = () => {\n    const carousels = document.querySelectorAll('[data-carousel]');\n    if (!carousels.length) return;\n\n    let tweens = [];\n    const build = () => {\n      tweens.forEach((t) => t && t.kill());\n      tweens = Array.from(carousels, buildCarousel);\n    };\n\n    Promise.all(Array.from(carousels, imagesReady)).then(build);\n\n    let lastWidth = window.innerWidth;\n    let rid;\n    window.addEventListener('resize', () => {\n      if (window.innerWidth === lastWidth) return;\n      lastWidth = window.innerWidth;\n      clearTimeout(rid);\n      rid = setTimeout(build, 200);\n    });\n  };\n\n  initCarousels();\n})();"
  },
  {
    "src": null,
    "inline": "(function () {\n  const NS = 'http://www.w3.org/2000/svg';\n  const DOT = 2;\n  const TARGET = 12;\n  const COLOR = '#C2C6CD';\n \n  const positions = (length) => {\n    const span = Math.max(0, length - DOT);\n    const n = Math.max(1, Math.round(span / TARGET));\n    const step = span / n;\n    const arr = [];\n    for (let i = 0; i <= n; i++) arr.push(Math.round(i * step));\n    return arr;\n  };\n \n  const drawFrame = (item) => {\n    let svg = item.querySelector(':scope > .dotted-frame_svg');\n    if (!svg) {\n      svg = document.createElementNS(NS, 'svg');\n      svg.setAttribute('class', 'dotted-frame_svg');\n      svg.setAttribute('xmlns', NS);\n      item.appendChild(svg);\n    }\n \n    const w = Math.round(item.offsetWidth);\n    const h = Math.round(item.offsetHeight);\n    if (!w || !h) return;\n \n    svg.setAttribute('width', w);\n    svg.setAttribute('height', h);\n    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);\n    while (svg.firstChild) svg.removeChild(svg.firstChild);\n \n    const addDot = (x, y) => {\n      const r = document.createElementNS(NS, 'rect');\n      r.setAttribute('x', x);\n      r.setAttribute('y', y);\n      r.setAttribute('width', DOT);\n      r.setAttribute('height', DOT);\n      r.setAttribute('fill', COLOR);\n      r.setAttribute('shape-rendering', 'crispEdges');\n      svg.appendChild(r);\n    };\n \n    const xs = positions(w);\n    const ys = positions(h);\n    const lastY = ys[ys.length - 1];\n \n    xs.forEach((x) => {\n      addDot(x, 0);\n      addDot(x, h - DOT);\n    });\n \n    ys.forEach((y) => {\n      if (y === 0 || y === lastY) return;\n      addDot(0, y);\n      addDot(w - DOT, y);\n    });\n  };\n \n  const init = () => {\n    const items = document.querySelectorAll('[data-dotted-frame]');\n    if (!items.length) return;\n    items.forEach((item) => {\n      drawFrame(item);\n      if (window.ResizeObserver) {\n        new ResizeObserver(() => drawFrame(item)).observe(item);\n      }\n    });\n  };\n \n  document.addEventListener('DOMContentLoaded', init);\n})();"
  },
  {
    "src": "https://hubspotonwebflow.com/assets/js/form-124.js",
    "inline": null
  }
] as const;

export default function Home() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <ScriptLoader items={scriptItems as unknown as { src: string | null; inline: string | null }[]} />
    </>
  );
}
