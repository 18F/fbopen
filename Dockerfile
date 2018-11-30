FROM ubuntu:trusty

#Adapted from https://github.com/18F/docker-elasticsearch

# To run: 
# $: docker build -t esfbopen .

# docker run -p 9200:9200 -p 9300:9300 esfbopen \
  # && --rm \
  # && --name es-test \
  # && -v /home/fbopen:/data

# To ssh into docker cont. -> 
#   $: docker exec -i -t <containerid> bash

MAINTAINER Colin Craig <colin.craig@gsa.gov>

RUN \
    apt-get update \
        -qq \
    && apt-get install \
        -qq \
        --yes \
        --no-install-recommends \
        --no-install-suggests \
    curl \
    python-software-properties \
    software-properties-common \

# Clean up packages.
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*


# Add Java.
RUN \
  echo oracle-java7-installer shared/accepted-oracle-license-v1-1 select true | debconf-set-selections \
  && add-apt-repository -y ppa:webupd8team/java \
  && apt-get update \
       -qq \
  && apt-get install \
       -qq \
       -y oracle-java7-installer=7u80+7u60arm-0~webupd8~1 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /var/cache/oracle-jdk7-installer

# Define commonly used JAVA_HOME variable
ENV JAVA_HOME /usr/lib/jvm/java-7-oracle

# Install Elasticsearch.
ENV ES_PKG_NAME elasticsearch-1.7.1
RUN \
  cd / \
  && wget https://download.elasticsearch.org/elasticsearch/elasticsearch/${ES_PKG_NAME}.tar.gz \
       --no-verbose \
  && tar xvzf $ES_PKG_NAME.tar.gz \
  && rm -f $ES_PKG_NAME.tar.gz \
  && mv /$ES_PKG_NAME /elasticsearch

# Set up default config.
ADD elasticsearch/elasticsearch__dev.yml /elasticsearch/elasticsearch.yml

# mapper-attachments plugin.
ENV MA_VERSION=2.7.0
RUN /elasticsearch/bin/plugin \
  install elasticsearch/elasticsearch-mapper-attachments/${MA_VERSION} \
  --silent

# elasticsearch-cloud-aws plugin.
ENV CA_VERSION=2.7.0
RUN /elasticsearch/bin/plugin install \
  elasticsearch/elasticsearch-cloud-aws/${CA_VERSION} \
  --silent


# Create the Elasticsearch user.
RUN groupadd -r elasticsearch \
  && useradd -r -g elasticsearch elasticsearch

# Use a reasonable heap size.
# https://www.elastic.co/guide/en/elasticsearch/guide/current/heap-sizing.html
ENV ES_HEAP_SIZE=1g

# Mount for persistent data.
VOLUME ["/data"]
WORKDIR /data

# Expose Elasticsearch ports.
EXPOSE 9200 9300

# Entry commands.
#ENTRYPOINT ["/"]
CMD ["/elasticsearch/bin/elasticsearch"]
