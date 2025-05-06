#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

export CONFIG_BASE_PATH=${CONFIG_BASE_PATH:-/etc/nginx}
export TEMPLATE_OUT_DIR=${TEMPLATE_OUT_DIR:-/var/run/openresty/openg2p}
export dollar='$'

export PATH_PREFIX=${PATH_PREFIX:-/};  # PATH_PREFIX defaults to /
export PATH_PREFIX="${PATH_PREFIX%/}/";  # Add trailing slash if doesn't exist
export API_PATH_PREFIX=${API_PATH_PREFIX:-/v1/uca};  # API_PATH_PREFIX defaults to /v1/uca
export API_PATH_PREFIX="${API_PATH_PREFIX%/}/";  # Add trailing slash if doesn't exist
export API_BACKEND_URL=${API_BACKEND_URL:-http://172.17.0.1:8000/}

# Render Html files
mkdir -p ${TEMPLATE_OUT_DIR}/html
for file in ${CONFIG_BASE_PATH}/html/*; do
    file_base_name=$(basename $file)
    envsubst < $file > ${TEMPLATE_OUT_DIR}/html/${file_base_name}
done

# Render Js files
mkdir -p ${TEMPLATE_OUT_DIR}/js
for file in ${CONFIG_BASE_PATH}/js/*; do
    file_base_name=$(basename $file)
    envsubst < $file > ${TEMPLATE_OUT_DIR}/js/${file_base_name}
done
mv ${TEMPLATE_OUT_DIR}/js ${TEMPLATE_OUT_DIR}/html

# Copy static files as is.
cp -r ${CONFIG_BASE_PATH}/static ${TEMPLATE_OUT_DIR}/html

# Render Nginx conf file
envsubst < ${CONFIG_BASE_PATH}/nginx.conf > ${TEMPLATE_OUT_DIR}/nginx.conf

exec "$@"
