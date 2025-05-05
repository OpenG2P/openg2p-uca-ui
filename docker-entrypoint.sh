#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

export CONFIG_BASE_PATH=${CONFIG_BASE_PATH:-/etc/nginx}
export TEMPLATE_OUT_DIR=${TEMPLATE_OUT_DIR:-/var/run/openresty/openg2p}
export dollar='$'

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
