import type { Metadata } from "next";
import Script from "next/script";
import PageTransition from "./PageTransition";

export const metadata: Metadata = {
  title: "Sayso | Just Say So",
  description:
    "Sayso is an agentic workflow model that handles your invoices in Slack and Gmail, and uses your initial commands to execute actions automatically based on the invoices",
  openGraph: {
    title: "Sayso | Just Say So",
    description:
      "Sayso is an agentic workflow model that handles your invoices in Slack and Gmail, and uses your initial commands to execute actions automatically based on the invoices",
    images: [
      "https://cdn.prod.website-files.com/68e8e0120513ba12c5cd12e0/69395a465cc0a72a36001c70_og-home.png",
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sayso | Just Say So",
    description:
      "Sayso is an agentic workflow model that handles your invoices in Slack and Gmail, and uses your intial commands to execute actions automatically based on the invoices",
    images: [
      "https://cdn.prod.website-files.com/68e8e0120513ba12c5cd12e0/69395a465cc0a72a36001c70_og-home.png",
    ],
  },
  icons: {
    icon: "https://cdn.prod.website-files.com/68e8e0120513ba12c5cd12e0/6943eb04c4c52f01cfbb6c4a_icons.png",
    apple:
      "https://cdn.prod.website-files.com/68e8e0120513ba12c5cd12e0/6943eb0c5363694f8af7eac7_webclipsui.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="/webflow/sui-v2.shared.f0ac634c6.min.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link href="https://fonts.gstatic.com" rel="preconnect" crossOrigin="anonymous" />
        <link
          rel="preload"
          href="https://cdn.prod.website-files.com/68e8e0120513ba12c5cd12e0/68e8f0a2ace66a14bd436ad6_TWKEverett-Regular.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="https://cdn.prod.website-files.com/68e8e0120513ba12c5cd12e0/68e8f746fc7953b5624e358d_TWKEverettMono-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="https://cdn.prod.website-files.com/68e8e0120513ba12c5cd12e0/68e8f7385d19f5fafd1cd6b5_TWKEverettMono-Medium.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://cdn.prod.website-files.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://cdn.weglot.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://d3e54v103j8qbb.cloudfront.net" />

        <style>{`
html.lenis,
html.lenis body {
  height: auto;
}

.lenis:not(.lenis-autoToggle).lenis-stopped {
  overflow: clip;
}

.lenis [data-lenis-prevent],
.lenis [data-lenis-prevent-wheel],
.lenis [data-lenis-prevent-touch],
.lenis [data-lenis-prevent-vertical],
.lenis [data-lenis-prevent-horizontal] {
  overscroll-behavior: contain;
}

.lenis.lenis-smooth iframe {
  pointer-events: none;
}

.lenis.lenis-autoToggle {
  transition-property: overflow;
  transition-duration: 1ms;
  transition-behavior: allow-discrete;
}

[global="revealTextLines"] { opacity: 0; }

[eco-nav-hidder] {
  visibility: hidden;
}

#ez-cookie-manager-button {
  bottom: 50px;
}

/** Weglot overrides */
.wg-drop.country-selector {
    border: 0 !important;
    background-color: transparent !important;
}
.wg-drop.country-selector .wgcurrent {
  border: 0 !important;
  }
.wg-default.weglot-container--left, .wg-default.weglot-container--left .country-selector {
  left: 0 !important;
}

.weglot-container {
  z-index: 2147483640 !important;
}

.wg-drop.country-selector .wgcurrent {
 background-color: #011829;
 color: #fff;
 border: 0;
 border-top-right-radius: 20px;
}

.wg-drop.country-selector .wgcurrent a {
 color: #fff;
}
.wg-drop.country-selector .wgcurrent:after {
  background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI4NC45IDI4NC45Ij48cGF0aCBkPSJtMjgyIDc2LjUtMTQuMi0xNC4zYTkgOSAwIDAgMC0xMy4xIDBMMTQyLjUgMTc0LjQgMzAuMyA2Mi4yYTkgOSAwIDAgMC0xMy4yIDBMMyA3Ni41YTkgOSAwIDAgMCAwIDEzLjFsMTMzIDEzM2E5IDkgMCAwIDAgMTMuMSAwbDEzMy0xMzNhOSA5IDAgMCAwIDAtMTN6IiBmaWxsPSIjZmZmIi8+PC9zdmc+) !important;
}
`}</style>

        <style>{`
.text-layers {
	opacity: 1;
}

.current_percent {
	opacity: 0;
}

.timeline_heading {
		opacity: 0;
}

.line_current {
	width: 0em;
}

.cta-wrapper {
	opacity: 0;
}

.first_section_content_2 { opacity: 0; }

.navbar { transform: translateY(-150%); }

.words { display: inline !important; }

[inner-fixed-load] { z-index: 3; position: absolute; }
[inner-fixed-load-background] { display: block; }
[home-trigger] { z-index: 9; }
.stage { container-type: inline-size; }

.cutout {
  position: absolute;
  inset: 0;
  background: white;
  -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 1433' preserveAspectRatio='none'><defs><filter id='b' x='-20%25' y='-20%25' width='140%25' height='140%25'><feGaussianBlur stdDeviation='40'/></filter></defs><path d='M-200 1144.65L559.764 1235.61C665.892 1252.86 774.108 1252.86 880.236 1235.61L1640 1144.65V1646.65H-200V1144.65Z' fill='black' filter='url(%23b)'/></svg>") no-repeat;
          mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 1433' preserveAspectRatio='none'><defs><filter id='b' x='-20%25' y='-20%25' width='140%25' height='140%25'><feGaussianBlur stdDeviation='40'/></filter></defs><path d='M-200 1144.65L559.764 1235.61C665.892 1252.86 774.108 1252.86 880.236 1235.61L1640 1144.65V1646.65H-200V1144.65Z' fill='black' filter='url(%23b)'/></svg>") no-repeat;
  -webkit-mask-size: 100% 100%;
          mask-size: 100% 100%;
}

.gradient-blur canvas {
    position: absolute;
    inset: 0;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none;
    z-index: 2;
}

.hero_first_section {
  --mouse-x: 50%;
  --mouse-y: 50%;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}
.hero_heading {
  margin: 0;
  will-change: mask-position;
  transform: translateZ(0);
  contain: layout style;
}
.absolute {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}
.sharp {
  background-color: #298dff;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  --text-x: 50%;
  --text-y: 50%;
  background-image: radial-gradient(
    circle at var(--text-x) var(--text-y),
    #ffffff 0%,
    #ffffff 44%,
    #298dff 85%,
    rgba(41,141,255,0.1) 95%
  );
  background-size: 100% 100%;
  background-repeat: no-repeat;
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: background-image;
}
.gradient-blur {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  contain: layout style paint;
  transform: translateZ(0);
}

.gradient-blur > div {
  position: absolute;
  inset: 0;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
}
.gradient-blur > div:nth-of-type(1) {
  backdrop-filter: blur(2.8px);
  -webkit-backdrop-filter: blur(2.8px);
  mask: radial-gradient(circle at var(--mouse-x) var(--mouse-y), transparent 0%, transparent 14%, black 20%);
  -webkit-mask: radial-gradient(circle at var(--mouse-x) var(--mouse-y), transparent 0%, transparent 14%, black 20%);
}
.gradient-blur > div:nth-of-type(2) {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  mask: radial-gradient(circle at var(--mouse-x) var(--mouse-y), transparent 0%, transparent 16%, black 38%);
  -webkit-mask: radial-gradient(circle at var(--mouse-x) var(--mouse-y), transparent 0%, transparent 16%, black 38%);
}
.gradient-blur > div:nth-of-type(3) {
  backdrop-filter: blur(7px);
  -webkit-backdrop-filter: blur(7px);
  mask: radial-gradient(circle at var(--mouse-x) var(--mouse-y), transparent 0%, transparent 18%, black 50%);
  -webkit-mask: radial-gradient(circle at var(--mouse-x) var(--mouse-y), transparent 0%, transparent 18%, black 50%);
}

.first_section_content_2 {
  isolation: isolate;
  position: relative;
  z-index: 11;
  pointer-events: none;
}
.first_section_content_2 * {
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  .sharp {
    transition: none;
  }
  .gradient-blur > div {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
@media (hover: none) and (min-width: 769px) {
  .gradient-blur > div {
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    mask: none;
    -webkit-mask: none;
  }
}

@media (max-width: 768px) {
  .gradient-blur > div:nth-of-type(1) {
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    mask:
      linear-gradient(to right,
        black 0%,
        black 35%,
        transparent 50%,
        transparent 65%,
        black 80%,
        black 100%),
      radial-gradient(circle at var(--mouse-x) var(--mouse-y),
        transparent 0%,
        transparent 14%,
        black 20%);
    -webkit-mask:
      linear-gradient(to right,
        black 0%,
        black 35%,
        transparent 50%,
        transparent 65%,
        black 80%,
        black 100%),
      radial-gradient(circle at var(--mouse-x) var(--mouse-y),
        transparent 0%,
        transparent 14%,
        black 20%);
    mask-composite: intersect;
    -webkit-mask-composite: source-in;
  }

  .gradient-blur > div:nth-of-type(2) {
    backdrop-filter: blur(2.6px);
    -webkit-backdrop-filter: blur(2.6px);
    mask:
      linear-gradient(to right,
        black 0%,
        black 30%,
        transparent 47%,
        transparent 68%,
        black 85%,
        black 100%),
      radial-gradient(circle at var(--mouse-x) var(--mouse-y),
        transparent 0%,
        transparent 16%,
        black 38%);
    -webkit-mask:
      linear-gradient(to right,
        black 0%,
        black 30%,
        transparent 47%,
        transparent 68%,
        black 85%,
        black 100%),
      radial-gradient(circle at var(--mouse-x) var(--mouse-y),
        transparent 0%,
        transparent 16%,
        black 38%);
    mask-composite: intersect;
    -webkit-mask-composite: source-in;
  }

  .gradient-blur > div:nth-of-type(3) {
    backdrop-filter: blur(7px);
    -webkit-backdrop-filter: blur(7px);
    mask:
      linear-gradient(to right,
        black 0%,
        black 25%,
        transparent 45%,
        transparent 70%,
        black 90%,
        black 100%),
      radial-gradient(circle at var(--mouse-x) var(--mouse-y),
        transparent 0%,
        transparent 18%,
        black 50%);
    -webkit-mask:
      linear-gradient(to right,
        black 0%,
        black 25%,
        transparent 45%,
        transparent 70%,
        black 90%,
        black 100%),
      radial-gradient(circle at var(--mouse-x) var(--mouse-y),
        transparent 0%,
        transparent 18%,
        black 50%);
    mask-composite: intersect;
    -webkit-mask-composite: source-in;
  }

  .sharp {
    background-image: radial-gradient(
      circle at var(--text-x) var(--text-y),
      #ffffff 0%,
      #ffffff 41%,
      #298dff 93%,
      rgba(41,141,255,0.1) 100%
    );
  }
}

.safari-16-17 .blue_overlay {
  mix-blend-mode: soft-light;
  opacity: 0.8;
}
`}</style>

        <Script id="safari-detect" strategy="beforeInteractive">{`
function isSafari16or17() {
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  if (!isSafari) return false;
  const versionMatch = ua.match(/version\\/(\\d+)/i);
  if (versionMatch) {
    const version = parseInt(versionMatch[1], 10);
    return version === 16 || version === 17;
  }
  return false;
}
if (isSafari16or17()) {
  document.documentElement.classList.add('safari-16-17');
}
`}</Script>
        <Script id="wf-mod-detect" strategy="beforeInteractive">{`
!function(o,c){var n=c.documentElement,t=" w-mod-";n.className+=t+"js",("ontouchstart"in o||o.DocumentTouch&&c instanceof DocumentTouch)&&(n.className+=t+"touch")}(window,document);
`}</Script>
        <Script id="webfont" strategy="beforeInteractive" src="https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js" />
        <Script id="webfont-load" strategy="afterInteractive">{`
WebFont.load({  google: {    families: ["Inter:400,500,600,700"]  }});
`}</Script>
        <Script id="gtm" strategy="afterInteractive">{`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5C9KVWT');
`}</Script>
      </head>
      <body>
        {children}
        <PageTransition />
      </body>
    </html>
  );
}
