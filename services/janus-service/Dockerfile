FROM canyan/janus-gateway:master

COPY config/*.jcfg /usr/local/etc/janus/
COPY config/turnserver.conf /usr/local/etc/janus/

EXPOSE 8088 8188 8089 8090

CMD ["/bin/sh", "-c", "ls -l /usr/local/etc/janus && cat /usr/local/etc/janus/janus.transport.http.jcfg && cat /usr/local/etc/janus/janus.transport.websockets.jcfg && /usr/local/bin/janus"]
