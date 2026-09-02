#!/bin/bash
# Astro tire les canoniques et le plan du site de « site » dans
# astro.config.mjs, qui suit désormais $URL. robots.txt, lui, est un fichier
# statique recopié tel quel : son adresse de plan du site doit être ajustée
# après la construction, sinon elle continue de désigner l'ancien domaine.
set -e
cd "$(dirname "$0")"
python3 - "${URL:-}" "${DEPLOY_PRIME_URL:-}" <<'PY'
import os, re, sys
reel = (sys.argv[1] or sys.argv[2] or "").rstrip("/")
p = "dist/robots.txt"
if not reel or not os.path.exists(p):
    print("  robots.txt : inchangé")
    raise SystemExit
s = open(p, encoding="utf-8").read()
neuf = re.sub(r"Sitemap:\s*https?://[^/\s]+", "Sitemap: " + reel, s)
if neuf != s:
    open(p, "w", encoding="utf-8").write(neuf)
    print("  robots.txt : plan du site -> %s" % reel)
else:
    print("  robots.txt : déjà juste")
PY
