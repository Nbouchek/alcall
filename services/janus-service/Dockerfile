FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    libmicrohttpd-dev \
    libjansson-dev \
    libssl-dev \
    libsrtp2-dev \
    libsofia-sip-ua-dev \
    libglib2.0-dev \
    libopus-dev \
    libogg-dev \
    libcurl4-openssl-dev \
    liblua5.3-dev \
    libconfig-dev \
    pkg-config \
    gengetopt \
    libtool \
    automake \
    build-essential \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Build and install Janus
WORKDIR /tmp
RUN git clone https://github.com/meetecho/janus-gateway.git
WORKDIR /tmp/janus-gateway
RUN sh autogen.sh
RUN ./configure --prefix=/opt/janus
RUN make && make install

# Copy configuration files
COPY ../../config/janus.jcfg /opt/janus/etc/janus/
COPY ../../config/turnserver.conf /opt/janus/etc/janus/
COPY ../../config/janus.transport.websockets.jcfg /opt/janus/etc/janus/
COPY ../../config/janus.transport.http.jcfg /opt/janus/etc/janus/

EXPOSE 8088 8188 8089 8090

CMD ["/opt/janus/bin/janus"]

