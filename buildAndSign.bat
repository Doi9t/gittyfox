@echo off
web-ext sign --api-key=%JWT_USER_FIREFOX_ADDON% --api-secret=%JWT_SECRET_FIREFOX_ADDON%
cd web-ext-artifacts
del gittyfox.xpi
ren *.xpi gittyfox.xpi
PAUSE