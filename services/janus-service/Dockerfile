FROM canyan/janus-gateway:master

COPY config/*.jcfg /usr/local/etc/janus/
COPY config/turnserver.conf /usr/local/etc/janus/

EXPOSE 8088 8188 8089 8090

# Try to explicitly tell Janus to use specific ports and bind to 0.0.0.0
# This overrides config files but helps confirm if the issue is config loading.
CMD ["/usr/local/bin/janus", "--http-port=8088", "--ws-port=8188", "--bind=0.0.0.0"]
