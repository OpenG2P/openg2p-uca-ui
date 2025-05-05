FROM openresty/openresty:1.27.1.2-0-alpine

ARG container_user=openg2p
ARG container_user_group=openg2p
ARG container_user_uid=1001
ARG container_user_gid=1001

RUN addgroup -S -g ${container_user_gid} ${container_user_group} && \
    adduser -S -s /bin/bash -G ${container_user_group} -u ${container_user_uid} ${container_user}

RUN apk add gettext bash

RUN mkdir -p /var/run/openresty/openg2p && \
    chown -R ${container_user}:${container_user_group} /var/run/openresty/openg2p

ADD nginx.conf /etc/nginx
ADD static /etc/nginx/static
ADD html /etc/nginx/html
ADD js /etc/nginx/js
ADD docker-entrypoint.sh /

USER ${container_user}

ENV NGINX_CONF_PATH=/var/run/openresty/openg2p/nginx.conf
ENV NGINX_PORT=8000

ENTRYPOINT [ "/docker-entrypoint.sh" ]
CMD ["bash", "-c", "openresty -c ${NGINX_CONF_PATH} -g 'daemon off;'"]
