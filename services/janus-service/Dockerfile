FROM canyan/janus-gateway:master

COPY config/*.jcfg /opt/janus/etc/janus/
COPY config/turnserver.conf /opt/janus/etc/janus/

EXPOSE 8088 8188 8089 8090

CMD ["/opt/janus/bin/janus"]

