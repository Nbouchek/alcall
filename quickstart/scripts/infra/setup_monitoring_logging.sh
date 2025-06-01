#!/bin/bash
set -e

# Add Helm repos
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add elastic https://helm.elastic.co
helm repo update

# Deploy Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring-dev --create-namespace --wait

# Deploy Grafana (already included in kube-prometheus-stack, but can be customized)
# helm install grafana grafana/grafana --namespace monitoring-dev --wait

# Deploy ELK stack
helm install elasticsearch elastic/elasticsearch --namespace logging-dev --create-namespace --wait
helm install kibana elastic/kibana --namespace logging-dev --wait
helm install logstash elastic/logstash --namespace logging-dev --wait

echo "Prometheus, Grafana, and ELK stack deployed."
