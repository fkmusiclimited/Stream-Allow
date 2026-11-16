import subprocess
import os

# 1. Square Icon SVG (512x512)
icon_svg = """<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="streamAllowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF1B6B"/>
      <stop offset="100%" stop-color="#E11D48"/>
    </linearGradient>
  </defs>
  <!-- Squircle rounded background -->
  <rect x="24" y="24" width="464" height="464" rx="116" ry="116" fill="url(#streamAllowGrad)"/>
  <!-- Broadcast radio waves and signal dot -->
  <g fill="none" stroke="#FFFFFF" stroke-width="32" stroke-linecap="round" stroke-linejoin="round">
    <!-- Outer wave left -->
    <path d="M 144 368 C 82 306 82 206 144 144" />
    <!-- Inner wave left -->
    <path d="M 190 322 C 153 285 153 227 190 190" />
    <!-- Central live transmitter dot -->
    <circle cx="256" cy="256" r="28" fill="#FFFFFF" stroke="none" />
    <!-- Inner wave right -->
    <path d="M 322 190 C 359 227 359 285 322 322" />
    <!-- Outer wave right -->
    <path d="M 368 144 C 430 206 430 306 368 368" />
  </g>
</svg>"""

with open('public/logo-icon.svg', 'w') as f:
    f.write(icon_svg)

# 2. Full Horizontal Brand Logo SVG (with dark background badge so it opens beautifully in any browser tab!)
full_logo_svg = """<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160" viewBox="0 0 640 160">
  <defs>
    <linearGradient id="streamAllowGradH" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF1B6B"/>
      <stop offset="100%" stop-color="#E11D48"/>
    </linearGradient>
    <linearGradient id="textPinkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF1B6B"/>
      <stop offset="100%" stop-color="#FF5E8E"/>
    </linearGradient>
  </defs>
  <!-- Dark backdrop container -->
  <rect width="640" height="160" rx="24" ry="24" fill="#0B0F17"/>
  <!-- Icon squircle -->
  <rect x="25" y="25" width="110" height="110" rx="28" ry="28" fill="url(#streamAllowGradH)"/>
  <!-- Radio signal inside icon -->
  <g fill="none" stroke="#FFFFFF" stroke-width="7.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 53 107 C 39 93 39 67 53 53" />
    <path d="M 64 96 C 55 87 55 73 64 64" />
    <circle cx="80" cy="80" r="7" fill="#FFFFFF" stroke="none" />
    <path d="M 96 64 C 105 73 105 87 96 96" />
    <path d="M 107 53 C 121 67 121 93 107 107" />
  </g>
  <!-- Typography matching exact Google Fonts Plus Jakarta Sans font style -->
  <text x="160" y="90" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="52" font-weight="800" fill="#FFFFFF" letter-spacing="-1">Stream <tspan fill="url(#textPinkGrad)">Allow</tspan></text>
  <text x="162" y="118" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#94A3B8" letter-spacing="3">YOUTUBE AUTOMATION SAAS</text>
</svg>"""

with open('public/logo.svg', 'w') as f:
    f.write(full_logo_svg)

# Also create transparent version
full_logo_transparent_svg = full_logo_svg.replace('<rect width="640" height="160" rx="24" ry="24" fill="#0B0F17"/>', '')
with open('public/logo-transparent.svg', 'w') as f:
    f.write(full_logo_transparent_svg)

# 3. Social / OpenGraph 1200x630 Banner SVG
og_svg = """<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F17"/>
      <stop offset="100%" stop-color="#04060A"/>
    </linearGradient>
    <linearGradient id="ogGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF1B6B"/>
      <stop offset="100%" stop-color="#E11D48"/>
    </linearGradient>
    <linearGradient id="ogTextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF1B6B"/>
      <stop offset="100%" stop-color="#FF5E8E"/>
    </linearGradient>
  </defs>
  <!-- Dark background -->
  <rect width="1200" height="630" fill="url(#ogBg)"/>

  <!-- Centered Logo Icon -->
  <g transform="translate(510, 110)">
    <rect width="180" height="180" rx="45" ry="45" fill="url(#ogGlow)"/>
    <g fill="none" stroke="#FFFFFF" stroke-width="12.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 46 134 C 22 110 22 70 46 46" />
      <path d="M 64 116 C 49 101 49 79 64 64" />
      <circle cx="90" cy="90" r="11" fill="#FFFFFF" stroke="none" />
      <path d="M 116 64 C 131 79 131 101 116 116" />
      <path d="M 134 46 C 158 70 158 110 134 134" />
    </g>
  </g>

  <!-- Title -->
  <text x="600" y="365" text-anchor="middle" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="64" font-weight="800" fill="#FFFFFF" letter-spacing="-1.5">
    Stream <tspan fill="url(#ogTextGrad)">Allow</tspan>
  </text>

  <!-- Subtitle -->
  <text x="600" y="425" text-anchor="middle" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="26" font-weight="600" fill="#CBD5E1" letter-spacing="0.5">
    YouTube Live Streaming Automation SaaS
  </text>
  <text x="600" y="475" text-anchor="middle" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="18" font-weight="500" fill="#94A3B8">
    24/7 Automated Cloud Playlists · Multi-Channel Sync · Zero CPU Overhead
  </text>
</svg>"""

with open('public/logo-og.svg', 'w') as f:
    f.write(og_svg)

print("SVG templates regenerated")
