#!/bin/sh
# Replaces the *_PLACEHOLDER values baked into the build output with this
# container's environment variables, so one image can serve every environment.
set -e

NEXT_DIR=/app/.next
SERVER_JS=/app/server.js
SERVER_TMP=/tmp/server.js

# sed -i writes a temp file next to its target and /app is not writable for the
# runtime user, so server.js is rewritten via /tmp and copied back afterwards.
cp "$SERVER_JS" "$SERVER_TMP"

replace_placeholder() {
  name=$1

  # ${var-default}, not ${var:-default}: an explicitly empty value is a valid
  # configuration and still has to replace its placeholder.
  eval "value=\${$name-__UNSET__}"

  if [ "$value" = '__UNSET__' ]; then
    echo "Warning: ${name} is not set; leaving ${name}_PLACEHOLDER in place"
    return
  fi

  # Escape the characters sed treats as special in a replacement string.
  escaped=$(printf '%s' "$value" | sed -e 's/[\\&|]/\\&/g')

  echo "Replacing ${name}_PLACEHOLDER"
  find "$NEXT_DIR" -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.json' \) \
    -exec sed -i "s|${name}_PLACEHOLDER|${escaped}|g" {} +
  sed -i "s|${name}_PLACEHOLDER|${escaped}|g" "$SERVER_TMP"
}

# Server-only values the build embedded.
for name in DOMAIN_NAME; do
  replace_placeholder "$name"
done

# Every NEXT_PUBLIC_* value Next inlined into the client bundle.
for name in $(env | sed -n 's/^\(NEXT_PUBLIC_[A-Za-z0-9_]*\)=.*/\1/p'); do
  replace_placeholder "$name"
done

cp "$SERVER_TMP" "$SERVER_JS"

echo 'Starting Next.js'
exec node "$SERVER_JS"
